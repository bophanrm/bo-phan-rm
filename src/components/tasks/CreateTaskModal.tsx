'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Calendar,
  Clock,
  Users,
  UserCheck,
  PlusCircle,
  CheckSquare,
  Layers,
  Shield,
  BellRing,
  ShieldCheck,
  Star,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { Priority, StaffLevel, User } from '@/types';
import { canAssignProject as checkCanAssignProject, canAssignToTarget, STAFF_LEVEL_LABELS, getLevelRank } from '@/utils/permissions';
import { getPersonalName } from '@/utils/nameHelper';
import { calculateShiftTimes } from '@/utils/shiftHelper';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIsDaily?: boolean;
  initialAssigneeId?: string;
  initialDueDate?: string;
}

export function CreateTaskModal({ isOpen, onClose, initialIsDaily, initialAssigneeId, initialDueDate }: CreateTaskModalProps) {
  const { currentUser, users, teams, createTask, getShiftForUser } = useApp();

  // Chỉ có Anh Xa và Anh Vũ mới có quyền giao dự án & công việc dài hạn
  const canAssignProject = checkCanAssignProject(currentUser);

  // Danh sách nhân sự mà currentUser có quyền giao việc theo phân tầng cấp bậc
  const assignableUsers = users.filter(
    (u) => u.id !== currentUser.id && canAssignToTarget(currentUser, u)
  );

  // Nhóm danh sách nhân sự theo phân tầng cấp bậc (Cấp 1 có thể giao việc cho nhau)
  const groupsConfig: { level: StaffLevel; title: string; badgeColor: string }[] = [
    {
      level: 'LEVEL_1_MANAGER',
      title: 'Cấp 1 • Ban Lãnh Đạo & Quản Lý',
      badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    },
    {
      level: 'LEVEL_2_SECRETARY',
      title: 'Cấp 2 • Điều Phối',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      level: 'LEVEL_3_LEAD',
      title: 'Cấp 3 • Giám Sát',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    {
      level: 'LEVEL_4_STAFF',
      title: 'Cấp 4 • Nhân Viên',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
  ];

  const groupedAssignableUsers = groupsConfig
    .map((cfg) => ({
      ...cfg,
      members: assignableUsers.filter((u) => {
        if (cfg.level === 'LEVEL_1_MANAGER') {
          return (
            u.role !== 'ADMIN' &&
            (u.level === 'LEVEL_1_MANAGER' ||
              u.role === 'MANAGER' ||
              u.id === 'user-tong-truong-xa' ||
              u.id === 'user-nguyen-tran-hoang-vu')
          );
        }
        if (cfg.level === 'LEVEL_2_SECRETARY') {
          return u.level === 'LEVEL_2_SECRETARY' || (u.role === 'SECRETARY' && !u.level);
        }
        if (cfg.level === 'LEVEL_3_LEAD') {
          return u.level === 'LEVEL_3_LEAD';
        }
        if (cfg.level === 'LEVEL_4_STAFF') {
          return (
            u.level === 'LEVEL_4_STAFF' ||
            (u.role === 'STAFF' && !u.level && u.level !== 'LEVEL_3_LEAD')
          );
        }
        return false;
      }),
    }))
    .filter((g) => g.members.length > 0);

  const [isDaily, setIsDaily] = useState<boolean>(!canAssignProject || (initialIsDaily ?? true));
  const [isManagementOnly, setIsManagementOnly] = useState<boolean>(false);
  const [dailyDate, setDailyDate] = useState<string>(
    initialDueDate ? initialDueDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Mode: Assign to Predefined Team vs Custom Multi-select Members
  const [assignMode, setAssignMode] = useState<'TEAM' | 'CUSTOM'>(
    initialAssigneeId || teams.length === 0 ? 'CUSTOM' : 'TEAM'
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => {
    if (initialAssigneeId) return [initialAssigneeId];
    // Không tự động tick chọn nhân viên, để người giao việc tự chọn
    return [];
  });
  const [leadId, setLeadId] = useState<string>(() => {
    if (initialAssigneeId) return initialAssigneeId;
    if (teams.length > 0 && teams[0]) {
      const t = teams[0];
      const members = t.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[];
      const supervisors = members.filter((m) => m.level === 'LEVEL_3_LEAD');
      if (supervisors.length > 1) return ''; // Nếu có từ 2 giám sát -> Bắt buộc hỏi chọn
      if (supervisors.length === 1) return supervisors[0].id;
      if (t.leaderId) {
        const leader = members.find((m) => m.id === t.leaderId);
        if (leader) return leader.id;
      }
      return '';
    }
    return '';
  });

  // Reviewers: Mặc định báo cáo gửi đồng thời cho Quản lý (Cấp 1) và Điều phối (Cấp 2)
  const defaultReviewerIds = users
    .filter(
      (u) =>
        u.role !== 'ADMIN' &&
        (u.level === 'LEVEL_1_MANAGER' ||
          u.level === 'LEVEL_2_SECRETARY' ||
          u.role === 'MANAGER' ||
          u.role === 'SECRETARY')
    )
    .map((u) => u.id);

  const [priority, setPriority] = useState<Priority>('HIGH');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 3600000 * 24).toISOString().slice(0, 16)
  );
  const [reportDeadline, setReportDeadline] = useState(
    new Date(Date.now() + 3600000 * 26).toISOString().slice(0, 16)
  );

  React.useEffect(() => {
    if (!canAssignProject) {
      setIsDaily(true);
    } else if (initialIsDaily !== undefined) {
      setIsDaily(initialIsDaily);
    }
    if (initialAssigneeId) {
      setAssignMode('CUSTOM');
      setSelectedMemberIds([initialAssigneeId]);
      setLeadId(initialAssigneeId);
    }
    if (initialDueDate) {
      setStartDate(`${initialDueDate}T08:00`);
      setDueDate(`${initialDueDate}T17:00`);
      setReportDeadline(`${initialDueDate}T18:00`);
    }
  }, [initialIsDaily, initialAssigneeId, initialDueDate, canAssignProject]);

  if (!isOpen) return null;

  // Change team selection
  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    // Không tự động tick chọn nhân viên để người giao việc tự chọn
    setSelectedMemberIds([]);

    const team = teams.find((t) => t.id === teamId);
    if (team) {
      // Quy tắc phân công người giám sát hiện trường:
      // 1. Nếu tổ có từ 2 Giám Sát trở lên -> Để trống ('') để hiển thị thông báo hỏi chọn ai làm Giám Sát Hiện Trường
      // 2. Nếu tổ có đúng 1 Giám Sát (Cấp 3 • LEVEL_3_LEAD) -> Mặc định là Giám Sát đó
      // 3. Nếu tổ không có Giám Sát -> Mặc định là Tổ Trưởng (team.leaderId)
      // 4. Nếu tổ không có cả Giám Sát lẫn Tổ Trưởng -> Để trống ('') để hiển thị thông báo yêu cầu chọn
      const members = team.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[];
      const supervisors = members.filter((m) => m.level === 'LEVEL_3_LEAD');
      if (supervisors.length > 1) {
        setLeadId('');
      } else if (supervisors.length === 1) {
        setLeadId(supervisors[0].id);
      } else if (team.leaderId) {
        const leader = members.find((m) => m.id === team.leaderId);
        if (leader) {
          setLeadId(leader.id);
        } else {
          setLeadId('');
        }
      } else {
        setLeadId('');
      }
    }
  };

  // Toggle member checkbox in custom / team mode
  const handleToggleMember = (userId: string) => {
    if (selectedMemberIds.includes(userId)) {
      const updated = selectedMemberIds.filter((id) => id !== userId);
      setSelectedMemberIds(updated);
      if (leadId === userId) {
        setLeadId(updated[0] || '');
      }
    } else {
      const updated = [...selectedMemberIds, userId];
      setSelectedMemberIds(updated);
      if (!leadId) setLeadId(userId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung công việc.');
      return;
    }

    if (selectedMemberIds.length === 0) {
      alert('⚠️ Bạn chưa chọn nhân viên thực hiện! Vui lòng tick chọn ít nhất 1 nhân viên trước khi giao việc.');
      return;
    }

    // Nếu giao theo tổ nhưng chưa chọn giám sát hiện trường:
    if (assignMode === 'TEAM' && !leadId) {
      const currentTeam = teams.find((t) => t.id === selectedTeamId);
      const members = currentTeam
        ? (currentTeam.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[])
        : [];
      const supervisors = members.filter((m) => m.level === 'LEVEL_3_LEAD');

      if (supervisors.length > 1) {
        alert(
          `⚠️ Tổ "${currentTeam?.name || 'được chọn'}" hiện có ${supervisors.length} Giám Sát Ca.\n\nVui lòng chọn 1 Giám Sát làm Giám Sát Hiện Trường trước khi tiếp tục giao việc!`
        );
      } else {
        alert(
          `⚠️ Tổ "${currentTeam?.name || 'được chọn'}" hiện chưa có Giám Sát và chưa bổ nhiệm Tổ Trưởng.\n\nVui lòng chỉ định một người làm Giám Sát Hiện Trường trước khi giao việc!`
        );
      }
      return;
    }

    const assignedNames = selectedMemberIds.map((id) => {
      const u = users.find((user) => user.id === id);
      return u ? getPersonalName(u.name, false) : id;
    });

    // Mặc định luôn báo cáo đồng thời cho Cấp 1 & Cấp 2 (nếu là việc nội bộ Ban Quản Lý thì chỉ Cấp 1) - Quản trị viên không duyệt
    const level1UserIds = users
      .filter((u) => u.role !== 'ADMIN' && (u.level === 'LEVEL_1_MANAGER' || u.role === 'MANAGER'))
      .map((u) => u.id);
    const level2UserIds = users
      .filter((u) => u.level === 'LEVEL_2_SECRETARY' || u.role === 'SECRETARY')
      .map((u) => u.id);

    let finalReviewerIds = isManagementOnly
      ? [...level1UserIds]
      : Array.from(new Set([...level1UserIds, ...level2UserIds]));

    if (finalReviewerIds.length === 0) {
      finalReviewerIds = [currentUser.id];
    }

    // Điểm 1 (Cách A): Nếu Cấp 2 (Điều Phối) giao việc cho Cấp 4, tự động bổ sung Tổ Trưởng (Cấp 3) của tổ đó vào danh sách đồng nhận & duyệt sơ bộ
    if (currentUser.level === 'LEVEL_2_SECRETARY' || currentUser.role === 'SECRETARY') {
      selectedMemberIds.forEach((mId) => {
        const memberTeam = teams.find((tm) => tm.memberIds.includes(mId));
        if (memberTeam) {
          const lead = users.find((u) => u.id === memberTeam.leaderId || (u.level === 'LEVEL_3_LEAD' && memberTeam.memberIds.includes(u.id)));
          if (lead && !finalReviewerIds.includes(lead.id)) {
            finalReviewerIds.push(lead.id);
          }
        }
      });
    }

    // Nếu người giao việc là Cấp 3 (Tổ trưởng / Giám sát), tự động đưa chính mình lên đầu danh sách nhận báo cáo (nếu mình không phải người làm)
    if (currentUser.level === 'LEVEL_3_LEAD') {
      if (!finalReviewerIds.includes(currentUser.id) && !selectedMemberIds.includes(currentUser.id)) {
        finalReviewerIds.unshift(currentUser.id);
      }
    }

    const effectiveLeadId = leadId || selectedMemberIds[0];
    const leadUser = users.find((u) => u.id === effectiveLeadId);

    // Nếu chỉ định Cấp 3 khác làm Giám sát hiện trường (effectiveLeadId), bổ sung người đó vào danh sách nhận báo cáo & duyệt sơ bộ
    if (effectiveLeadId && !finalReviewerIds.includes(effectiveLeadId) && !selectedMemberIds.includes(effectiveLeadId)) {
      finalReviewerIds.push(effectiveLeadId);
    }

    const reviewerNames = finalReviewerIds.map((id) => {
      const u = users.find((user) => user.id === id);
      return u ? getPersonalName(u.name, false) : id;
    });

    const chosenTeam = assignMode === 'TEAM' ? teams.find((t) => t.id === selectedTeamId) : undefined;

    let computedStart = new Date(startDate).toISOString();
    let computedDue = new Date(dueDate).toISOString();
    let computedReport = new Date(reportDeadline).toISOString();

    if (isDaily) {
      // Đối chiếu trực tiếp với ca làm việc của người được giao (selectedMemberIds[0]) vào ngày được chọn
      const baseDate = dailyDate ? new Date(dailyDate) : new Date();
      const primaryAssigneeId = selectedMemberIds[0];
      const targetDateStr = baseDate.toISOString().split('T')[0];
      const userShift = primaryAssigneeId ? getShiftForUser(primaryAssigneeId, targetDateStr) : undefined;
      const shiftCalc = calculateShiftTimes(userShift?.shiftId || 'HANH_CHINH', baseDate);

      computedStart = shiftCalc.startDateIso;
      computedDue = shiftCalc.dueDateIso;
      computedReport = shiftCalc.reportDeadlineIso; // Hạn nộp báo cáo hoàn thành theo đúng giờ hết ca trực
    }

    createTask({
      title: title.trim(),
      description: description.trim(),
      assignedTo: selectedMemberIds,
      assignedToNames: assignedNames,
      teamName: chosenTeam?.name || (selectedMemberIds.length > 1 ? `Nhóm phối hợp (${selectedMemberIds.length} người)` : undefined),
      leadId: leadId || selectedMemberIds[0],
      leadName: getPersonalName(leadUser?.name || assignedNames[0], false),
      reviewers: finalReviewerIds,
      reviewerNames,
      createdBy: currentUser.id,
      createdByName: getPersonalName(currentUser.name, false),
      priority,
      isDaily,
      isManagementOnly: canAssignProject ? isManagementOnly : false,
      timeSlot: isDaily ? 'FULL_DAY' : undefined,
      startDate: computedStart,
      dueDate: computedDue,
      reportDeadline: computedReport,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-lg">
                {isDaily ? '☀️ Giao Việc Hằng Ngày' : '📋 Giao Việc Kế Hoạch / Dự Án'}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                currentUser.level ? STAFF_LEVEL_LABELS[currentUser.level]?.badgeColor : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {currentUser.level ? STAFF_LEVEL_LABELS[currentUser.level]?.title : currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isDaily
                ? 'Công việc cần hoàn thành trong ngày hôm nay • Đồng nhận báo cáo Trưởng phòng & Nhân Viên Điều Phối'
                : 'Giao cho 1 tổ hoặc nhiều người cùng làm • Báo cáo gửi đồng thời'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Task Type Switcher (Chỉ hiển thị cho người có quyền giao dự án: Anh Vũ & Anh Xa) */}
          {canAssignProject && (
            <>
              <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                <button
                  type="button"
                  onClick={() => setIsDaily(true)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                    isDaily ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>☀️ Việc Trong Ngày (Daily)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDaily(false)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                    !isDaily ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>📋 Dự Án / Kế Hoạch Dài Hạn</span>
                </button>
              </div>

              {/* Điểm 4: Tùy chọn việc nội bộ Ban Quản Lý (Bảo mật - chỉ Cấp 1 xem) */}
              <div className="space-y-1.5">
                <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs font-semibold text-indigo-950 cursor-pointer transition-all hover:bg-indigo-100/70">
                  <input
                    type="checkbox"
                    checked={isManagementOnly}
                    onChange={(e) => setIsManagementOnly(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex items-center space-x-1.5">
                    <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Công việc nội bộ Ban Quản Lý (Bảo mật - chỉ Cấp 1 xem & duyệt)</span>
                  </div>
                </label>
                {isManagementOnly && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 leading-relaxed font-medium">
                    ⚠️ <strong>Lưu ý:</strong> Khi bật tùy chọn này, công việc chỉ xuất hiện trên tài khoản Cấp 1 (Ban Quản Lý). Nhân sự Cấp 2, 3, 4 được giao việc sẽ <u>hoàn toàn không nhìn thấy</u> để đảm bảo tính tuyệt mật.
                  </p>
                )}
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tiêu đề công việc <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Thi công lắp đặt camera an ninh và đường truyền mạng cơ sở 2"
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nội dung & Yêu cầu cụ thể <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết phân công, dụng cụ mang theo, hình ảnh/biên bản cần chụp để nộp báo cáo..."
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
            />
          </div>

          {/* Section 1: Assign to Team or Multiple People */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Phân công người thực hiện</span>
              </label>

              {/* Mode switch: By Team vs Custom selection */}
              {teams.length > 0 && (
                <div className="flex items-center space-x-1 bg-slate-200/80 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignMode('TEAM');
                      handleTeamChange(selectedTeamId || teams[0]?.id || '');
                    }}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      assignMode === 'TEAM' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Theo Tổ / Đội
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode('CUSTOM')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      assignMode === 'CUSTOM' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Chọn từng người
                  </button>
                </div>
              )}
            </div>

            {assignMode === 'TEAM' ? (() => {
              const currentTeam = teams.find((t) => t.id === selectedTeamId);
              const teamMembers = currentTeam
                ? (currentTeam.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[])
                : [];
              return (
                <div className="space-y-3">
                  <select
                    value={selectedTeamId}
                    onChange={(e) => handleTeamChange(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        📁 {t.name} ({t.memberIds.length} thành viên)
                      </option>
                    ))}
                  </select>

                  {/* Danh sách thành viên trong tổ để người giao tự tick chọn */}
                  <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <span className="text-[11px] font-bold text-slate-700">
                        Chọn nhân viên thực hiện ({selectedMemberIds.length}/{teamMembers.length} đã chọn):
                      </span>
                      <div className="flex items-center space-x-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => {
                            const allValid = teamMembers.map((m) => m.id);
                            setSelectedMemberIds(allValid);
                          }}
                          className="text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedMemberIds([])}
                          className="text-slate-500 hover:underline font-medium cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    {teamMembers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">Tổ chưa có thành viên nào.</p>
                    ) : (
                      <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                        {teamMembers.map((staff) => {
                          const isChecked = selectedMemberIds.includes(staff.id);
                          const levelInfo = staff.level ? STAFF_LEVEL_LABELS[staff.level] : null;
                          return (
                            <label
                              key={staff.id}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleMember(staff.id)}
                                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span>{getPersonalName(staff.name, false)}</span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                {levelInfo && (
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${levelInfo.badgeColor}`}
                                  >
                                    {levelInfo.short}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedMemberIds.length === 0 && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center space-x-2">
                      <span className="text-base">⚠️</span>
                      <span>Chưa có nhân viên nào được chọn. Vui lòng tick chọn người thực hiện trước khi giao việc.</span>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                {groupedAssignableUsers.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 text-center bg-white rounded-xl border border-dashed border-slate-200">
                    Bạn hiện không có cấp dưới để phân công công việc.
                  </p>
                ) : (
                  groupedAssignableUsers.map((group) => (
                    <div key={group.level} className="space-y-1.5">
                      <div className="flex items-center space-x-1.5 px-1 pt-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${group.badgeColor}`}
                        >
                          {group.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({group.members.length} nhân sự)
                        </span>
                      </div>
                      <div className="space-y-1">
                        {group.members.map((staff) => {
                          const isChecked = selectedMemberIds.includes(staff.id);
                          const levelInfo = staff.level ? STAFF_LEVEL_LABELS[staff.level] : null;
                          return (
                            <label
                              key={staff.id}
                              className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-blue-50/70 border-blue-300 text-blue-900 font-semibold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleMember(staff.id)}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span>{getPersonalName(staff.name, false)}</span>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                {levelInfo && (
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${levelInfo.badgeColor}`}
                                  >
                                    {levelInfo.short}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                {selectedMemberIds.length === 0 && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center space-x-2">
                    <span className="text-base">⚠️</span>
                    <span>Chưa có nhân viên nào được chọn. Vui lòng tick chọn ít nhất 1 người thực hiện.</span>
                  </div>
                )}
              </div>
            )}

            {/* Chọn Giám Sát Hiện Trường / Đầu Mối Chính */}
            {selectedMemberIds.length > 0 && (() => {
              const currentTeam = assignMode === 'TEAM' ? teams.find((t) => t.id === selectedTeamId) : null;
              const currentTeamMembers = currentTeam
                ? (currentTeam.memberIds.map((id) => users.find((u) => u.id === id)).filter(Boolean) as User[])
                : [];
              const teamSupervisors = currentTeamMembers.filter((m) => m.level === 'LEVEL_3_LEAD');
              const hasMultipleSupervisors = assignMode === 'TEAM' && teamSupervisors.length > 1;
              const currentTeamSupervisor = teamSupervisors.length === 1 ? teamSupervisors[0] : null;
              const currentTeamLeader = currentTeam?.leaderId
                ? currentTeamMembers.find((m) => m.id === currentTeam.leaderId)
                : null;
              const isMissingSupervisorAndLeader = assignMode === 'TEAM' && teamSupervisors.length === 0 && !currentTeamLeader;

              return (
                <div className="pt-2.5 border-t border-slate-200 space-y-2 text-xs">
                  {assignMode === 'TEAM' ? (
                    hasMultipleSupervisors ? (
                      /* TRƯỜNG HỢP: TỔ CÓ TỪ 2 GIÁM SÁT TRỞ LÊN -> BẬT THÔNG BÁO HỎI CHỌN AI LÀM GIÁM SÁT HIỆN TRƯỜNG */
                      <div className="bg-purple-50/90 border-2 border-purple-300 rounded-2xl p-3.5 space-y-2.5 shadow-xs animate-fade-in">
                        <div className="flex items-start space-x-2 text-purple-950">
                          <ShieldCheck className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                              <p className="font-extrabold text-xs text-purple-950">
                                Tổ {currentTeam?.name} hiện có {teamSupervisors.length} Giám Sát Ca
                              </p>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-200 text-purple-900">
                                {teamSupervisors.length} Giám Sát
                              </span>
                            </div>
                            <p className="text-[11px] text-purple-800 leading-relaxed mt-0.5">
                              Vui lòng chọn 1 trong {teamSupervisors.length} Giám Sát để làm <strong>Giám sát hiện trường</strong> trực tiếp đôn đốc công việc này:
                            </p>
                          </div>
                        </div>

                        <div>
                          <select
                            required
                            value={leadId}
                            onChange={(e) => setLeadId(e.target.value)}
                            className={`w-full bg-white border-2 rounded-xl px-3 py-2 text-xs font-bold transition-all outline-none ${
                              !leadId
                                ? 'border-purple-400 text-purple-900 ring-2 ring-purple-200'
                                : 'border-purple-600 text-purple-950 ring-1 ring-purple-600'
                            }`}
                          >
                            <option value="">
                              -- ⚠️ HÃY CHỌN 1 GIÁM SÁT HIỆN TRƯỜNG TRONG {teamSupervisors.length} GIÁM SÁT --
                            </option>
                            <optgroup label={`Các Giám Sát Ca (Cấp 3) Trong ${currentTeam?.name || 'Tổ'}`}>
                              {teamSupervisors.map((s) => (
                                <option key={s.id} value={s.id}>
                                  ⭐ {getPersonalName(s.name, true)} {s.employeeId ? `[${s.employeeId}]` : ''}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Hoặc Chỉ Định Thành Viên Khác Trong Tổ">
                              {currentTeamMembers
                                .filter((m) => m.level !== 'LEVEL_3_LEAD')
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    👤 {getPersonalName(m.name, true)} {m.employeeId ? `[${m.employeeId}]` : ''}
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                          {!leadId && (
                            <p className="text-[11px] font-bold text-purple-700 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-purple-600" />
                              <span>Vui lòng chọn 1 Giám Sát trước khi tiếp tục giao việc!</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ) : isMissingSupervisorAndLeader ? (
                      /* TRƯỜNG HỢP 3: TỔ KHÔNG CÓ CẢ GIÁM SÁT LẪN TỔ TRƯỞNG -> HIỂN THỊ THÔNG BÁO HỎI CHỌN */
                      <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-3.5 space-y-2.5 shadow-xs animate-fade-in">
                        <div className="flex items-start space-x-2 text-amber-950">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-extrabold text-xs text-amber-950">
                              Tổ {currentTeam?.name} chưa có Giám Sát & chưa bổ nhiệm Tổ Trưởng!
                            </p>
                            <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                              Hệ thống yêu cầu chỉ định 1 nhân sự làm <strong>Giám sát hiện trường</strong> để chỉ đạo & đôn đốc công việc này:
                            </p>
                          </div>
                        </div>

                        <div>
                          <select
                            required
                            value={leadId}
                            onChange={(e) => setLeadId(e.target.value)}
                            className={`w-full bg-white border-2 rounded-xl px-3 py-2 text-xs font-bold transition-all outline-none ${
                              !leadId
                                ? 'border-amber-400 text-amber-900 ring-2 ring-amber-200'
                                : 'border-blue-500 text-blue-900 ring-1 ring-blue-500'
                            }`}
                          >
                            <option value="">
                              -- ⚠️ BẮT BUỘC: HÃY CHỌN NGƯỜI LÀM GIÁM SÁT HIỆN TRƯỜNG --
                            </option>
                            <optgroup label={`Nhân Sự Trong ${currentTeam?.name || 'Tổ'}`}>
                              {currentTeamMembers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  👤 {getPersonalName(m.name, true)} {m.employeeId ? `[${m.employeeId}]` : ''}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Hoặc Cử Giám Sát Ca (Cấp 3) Khác">
                              {users
                                .filter((u) => u.level === 'LEVEL_3_LEAD')
                                .map((u) => (
                                  <option key={u.id} value={u.id}>
                                    ⭐ {getPersonalName(u.name, true)} [Giám Sát Ca]
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                          {!leadId && (
                            <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Vui lòng chọn người phụ trách hiện trường trước khi tiếp tục giao việc!</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ) : currentTeamSupervisor ? (
                      /* TRƯỜNG HỢP 1: TỔ CÓ 1 GIÁM SÁT -> MẶC ĐỊNH LÀ GIÁM SÁT (TINH GỌN, SANG TRỌNG) */
                      <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200/80">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className="text-xs font-extrabold text-slate-900 whitespace-nowrap">
                                Giám sát hiện trường:
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap">
                                Cấp 3 • Giám Sát
                              </span>
                            </div>
                            <p className="text-[11px] text-purple-900/80 mt-0.5 truncate font-medium">
                              Mặc định: <strong className="text-purple-950 font-bold">{getPersonalName(currentTeamSupervisor.name, true)}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 w-full sm:w-auto">
                          <select
                            value={leadId}
                            onChange={(e) => setLeadId(e.target.value)}
                            className="w-full sm:w-auto bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-purple-950 focus:ring-2 focus:ring-purple-500 outline-none shadow-2xs cursor-pointer"
                          >
                            <option value={currentTeamSupervisor.id}>
                              ⭐ {getPersonalName(currentTeamSupervisor.name, true)} (Giám Sát)
                            </option>
                            <optgroup label="Đổi sang thành viên khác trong tổ">
                              {currentTeamMembers
                                .filter((m) => m.id !== currentTeamSupervisor.id)
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    👤 {getPersonalName(m.name, true)}
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>
                    ) : (
                      /* TRƯỜNG HỢP 2: TỔ KHÔNG CÓ GIÁM SÁT, NHƯNG CÓ TỔ TRƯỞNG (TINH GỌN, SANG TRỌNG) */
                      <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/80">
                            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className="text-xs font-extrabold text-slate-900 whitespace-nowrap">
                                Giám sát hiện trường:
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                                Tổ Trưởng
                              </span>
                            </div>
                            <p className="text-[11px] text-amber-900/80 mt-0.5 truncate font-medium">
                              Mặc định: <strong className="text-amber-950 font-bold">{getPersonalName(currentTeamLeader?.name, true)}</strong>
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 w-full sm:w-auto">
                          <select
                            value={leadId}
                            onChange={(e) => setLeadId(e.target.value)}
                            className="w-full sm:w-auto bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs cursor-pointer"
                          >
                            {currentTeamLeader && (
                              <option value={currentTeamLeader.id}>
                                ⭐ {getPersonalName(currentTeamLeader.name, true)} (Tổ Trưởng)
                              </option>
                            )}
                            <optgroup label="Đổi sang thành viên khác trong tổ">
                              {currentTeamMembers
                                .filter((m) => m.id !== currentTeamLeader?.id)
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    👤 {getPersonalName(m.name, true)}
                                  </option>
                                ))}
                            </optgroup>
                            <optgroup label="Cử Giám Sát Ca (Cấp 3) Khác">
                              {users
                                .filter((u) => u.level === 'LEVEL_3_LEAD')
                                .map((u) => (
                                  <option key={u.id} value={u.id}>
                                    🛡️ {getPersonalName(u.name, true)}
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>
                    )
                  ) : (
                    /* GIAO THEO CUSTOM SELECTION (TÙY CHỌN NHIỀU NHÂN SỰ) */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-700 font-bold">Giám sát hiện trường / Đầu mối chính:</span>
                        <span className="text-[10px] text-slate-400">(Tùy chọn)</span>
                      </div>
                      <select
                        value={leadId}
                        onChange={(e) => setLeadId(e.target.value)}
                        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">
                          {selectedMemberIds.length === 1
                            ? `-- Mặc định (${getPersonalName(users.find((u) => u.id === selectedMemberIds[0])?.name, false)}) --`
                            : '-- Tự động (Người đầu tiên) --'}
                        </option>
                        <optgroup label="Cấp 3 • Giám Sát Hiện Trường">
                          {users
                            .filter((u) => u.level === 'LEVEL_3_LEAD')
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                ⭐ {getPersonalName(u.name, false)}
                              </option>
                            ))}
                        </optgroup>
                        {selectedMemberIds.length > 1 && (
                          <optgroup label="Nhân Sự Trong Nhóm Được Giao">
                            {selectedMemberIds
                              .filter((id) => {
                                const u = users.find((user) => user.id === id);
                                return u?.level !== 'LEVEL_3_LEAD';
                              })
                              .map((id) => {
                                const u = users.find((user) => user.id === id);
                                return (
                                  <option key={id} value={id}>
                                    👤 {getPersonalName(u?.name, false)}
                                  </option>
                                );
                              })}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Priority & Deadlines (Đối chiếu trực tiếp với ca trực của người được giao) */}
          {(() => {
            const primaryAssigneeId = selectedMemberIds[0];
            const primaryAssigneeUser = users.find((u) => u.id === primaryAssigneeId);
            const targetDateStr = dailyDate || new Date().toISOString().split('T')[0];
            const detectedShift = primaryAssigneeId ? getShiftForUser(primaryAssigneeId, targetDateStr) : undefined;
            const currentShiftCalc = calculateShiftTimes(detectedShift?.shiftId || 'HANH_CHINH', new Date(targetDateStr));

            if (isDaily) {
              return (
                <div className="bg-gradient-to-br from-blue-50/90 via-sky-50/70 to-indigo-50/70 border border-blue-200/90 rounded-2xl p-4 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Thời Gian Hoàn Thành (Đối Chiếu Ca Trực)</span>
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs shrink-0">
                      {currentShiftCalc.shiftInfo.shortName}
                    </span>
                  </div>

                  {/* Ô chọn ngày áp dụng */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/95 rounded-xl p-3 border border-blue-100">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">
                        Ca trực của {primaryAssigneeUser ? getPersonalName(primaryAssigneeUser.name) : 'nhân sự'}:{' '}
                        <span className="text-blue-700">{currentShiftCalc.formattedShiftText}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Hệ thống tự động đồng bộ theo lịch phân ca làm việc thực tế của nhân sự.
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <label className="text-[11px] font-medium text-slate-500">Ngày:</label>
                      <input
                        type="date"
                        value={dailyDate}
                        onChange={(e) => setDailyDate(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {currentShiftCalc.isOff && (
                    <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center space-x-2">
                      <BellRing className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>
                        Lưu ý: <strong>{primaryAssigneeUser ? getPersonalName(primaryAssigneeUser.name) : 'Nhân sự'}</strong> có lịch <strong>Nghỉ Ca</strong> vào ngày này. Hệ thống tạm tính theo khung giờ chuẩn 7h30 &ndash; 16h.
                      </span>
                    </div>
                  )}

                  {/* Thông tin Hạn nộp & Cơ chế nhắc nhở theo ca */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="bg-white/90 rounded-xl p-3 border border-blue-100 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hạn nộp kết quả báo cáo</span>
                      <p className="text-sm font-extrabold text-blue-700">{currentShiftCalc.formattedDeadlineText} (Hết ca trực)</p>
                      <p className="text-[10px] text-slate-500">Toàn thời gian ca làm việc trong ngày</p>
                    </div>

                    <div className="bg-amber-50/90 rounded-xl p-3 border border-amber-200/90 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center space-x-1">
                        <BellRing className="w-3.5 h-3.5 text-amber-600 animate-bounce" />
                        <span>Cơ chế nhắc nhở tự động</span>
                      </span>
                      <p className="text-sm font-extrabold text-amber-900">{currentShiftCalc.formattedReminderText} (Trước hết ca 1h)</p>
                      <p className="text-[10px] text-amber-700">
                        Tự động nhắc nếu chưa gửi báo cáo hoàn thành.
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ưu tiên
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-2.5 py-2.5 bg-white font-medium"
                >
                  <option value="LOW">Thấp</option>
                  <option value="MEDIUM">Bình thường</option>
                  <option value="HIGH">Ưu tiên cao</option>
                  <option value="URGENT">Khẩn cấp</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hạn hoàn thành</span>
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-2 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hạn nộp báo cáo</span>
                </label>
                <input
                  type="datetime-local"
                  value={reportDeadline}
                  onChange={(e) => setReportDeadline(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-2 py-2"
                />
              </div>
            </div>
          );
        })()}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center space-x-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isDaily ? 'Giao Việc Hằng Ngày' : 'Giao Việc'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
