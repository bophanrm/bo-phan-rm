'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { User, ShiftId, SHIFTS_CONFIG } from '@/types';
import { getPersonalName } from '@/utils/nameHelper';
import {
  X,
  Check,
  Calendar,
  Sparkles,
  Copy,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  Info,
  CalendarDays,
  Users,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { ManageShiftsModal } from './ManageShiftsModal';

interface WeeklySchedulePlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleSaved?: (nextWeekMonday: Date) => void;
}

export function WeeklySchedulePlannerModal({
  isOpen,
  onClose,
  onScheduleSaved,
}: WeeklySchedulePlannerModalProps) {
  const {
    users,
    teams,
    shifts,
    shiftsConfig,
    shiftsConfigMap,
    currentUser,
    saveFullWeekSchedule,
  } = useApp();

  // 1. Calculate Monday of Current Week and Monday of Next Week
  const { currentWeekDays, nextWeekDays, currentWeekMonday, nextWeekMonday } = useMemo(() => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sun, 1 is Mon...
    const diff = (day + 6) % 7;
    const curMon = new Date(today);
    curMon.setDate(today.getDate() - diff);
    curMon.setHours(0, 0, 0, 0);

    const nextMon = new Date(curMon);
    nextMon.setDate(curMon.getDate() + 7);
    nextMon.setHours(0, 0, 0, 0);

    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

    const getDays = (startMon: Date) => {
      const arr = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(startMon);
        d.setDate(startMon.getDate() + i);
        arr.push({
          date: d,
          dateStr: d.toISOString().split('T')[0],
          name: dayNames[i],
          dayNumber: d.getDate(),
          monthNumber: d.getMonth() + 1,
        });
      }
      return arr;
    };

    return {
      currentWeekMonday: curMon,
      nextWeekMonday: nextMon,
      currentWeekDays: getDays(curMon),
      nextWeekDays: getDays(nextMon),
    };
  }, []);

  const getLevelPriority = (u: User) => {
    if (u.level === 'LEVEL_1_MANAGER' || u.role === 'MANAGER') return 1;
    if (u.level === 'LEVEL_2_SECRETARY' || u.role === 'SECRETARY') return 2;
    if (u.level === 'LEVEL_3_LEAD') return 3;
    if (u.level === 'LEVEL_4_STAFF' || u.role === 'STAFF') return 4;
    return 5;
  };

  // Operational staff list (Cấp 1, Cấp 2, Cấp 3, Cấp 4)
  const staffList = useMemo(() => {
    return users
      .filter((u) => u.role !== 'ADMIN')
      .sort((a, b) => getLevelPriority(a) - getLevelPriority(b));
  }, [users]);

  // Helper: Get user's shift in the current week for a given day index (0..6)
  const getCurrentWeekShift = (userId: string, dayIndex: number): { shiftId: ShiftId; isHalfDay?: boolean } => {
    const curDateStr = currentWeekDays[dayIndex].dateStr;
    const s = shifts.find((item) => item.userId === userId && item.date === curDateStr);
    return s ? { shiftId: s.shiftId, isHalfDay: !!s.isHalfDay } : { shiftId: 'HANH_CHINH', isHalfDay: false };
  };

  const getCurrentWeekShiftId = (userId: string, dayIndex: number): ShiftId => {
    return getCurrentWeekShift(userId, dayIndex).shiftId;
  };

  // Draft state for Next Week: Record<`${userId}_${dateStr}`, { shiftId: ShiftId; isHalfDay?: boolean }>
  const [draftShifts, setDraftShifts] = useState<Record<string, { shiftId: ShiftId; isHalfDay?: boolean }>>({});
  const [activeCellPicker, setActiveCellPicker] = useState<{
    userId: string;
    dateStr: string;
  } | null>(null);

  // Filters & search
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewTab, setActiveViewTab] = useState<'NEXT_WEEK' | 'CURRENT_WEEK'>('NEXT_WEEK');
  const [hasCopiedCurrentWeek, setHasCopiedCurrentWeek] = useState(false);

  // Pre-populate draft for Next Week from current week when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const initialDraft: Record<string, { shiftId: ShiftId; isHalfDay?: boolean }> = {};

    staffList.forEach((user) => {
      nextWeekDays.forEach((nextDay, dayIdx) => {
        const nextKey = `${user.id}_${nextDay.dateStr}`;
        // Check if there is already an existing shift assigned for next week
        const existingNextShift = shifts.find(
          (s) => s.userId === user.id && s.date === nextDay.dateStr
        );

        if (existingNextShift) {
          initialDraft[nextKey] = {
            shiftId: existingNextShift.shiftId,
            isHalfDay: !!existingNextShift.isHalfDay,
          };
        } else {
          // Pre-populate directly from the CURRENT WEEK's shift as the baseline template!
          initialDraft[nextKey] = getCurrentWeekShift(user.id, dayIdx);
        }
      });
    });

    setDraftShifts(initialDraft);
    setHasCopiedCurrentWeek(true);
    setActiveCellPicker(null);
  }, [isOpen, staffList, nextWeekDays, currentWeekDays, shifts]);

  // Function to explicitly re-clone current week into next week
  const handleCopyFromCurrentWeek = () => {
    const clonedDraft: Record<string, { shiftId: ShiftId; isHalfDay?: boolean }> = {};
    staffList.forEach((user) => {
      nextWeekDays.forEach((nextDay, dayIdx) => {
        const nextKey = `${user.id}_${nextDay.dateStr}`;
        clonedDraft[nextKey] = getCurrentWeekShift(user.id, dayIdx);
      });
    });
    setDraftShifts(clonedDraft);
    setHasCopiedCurrentWeek(true);
    setActiveCellPicker(null);
  };

  // Change single shift cell
  const handleSetCellShift = (userId: string, dateStr: string, shiftId: ShiftId, isHalfDay?: boolean) => {
    setDraftShifts((prev) => {
      const key = `${userId}_${dateStr}`;
      const current = prev[key] || { shiftId: 'HANH_CHINH', isHalfDay: false };
      return {
        ...prev,
        [key]: {
          shiftId,
          isHalfDay: shiftId === 'OFF' ? false : (isHalfDay !== undefined ? isHalfDay : !!current.isHalfDay),
        },
      };
    });
    setActiveCellPicker(null);
  };

  // Bật/tắt chế độ nghỉ nửa ngày cho ca đang làm
  const handleToggleCellHalfDay = (userId: string, dateStr: string) => {
    setDraftShifts((prev) => {
      const key = `${userId}_${dateStr}`;
      const current = prev[key] || { shiftId: 'HANH_CHINH', isHalfDay: false };
      if (current.shiftId === 'OFF') return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          isHalfDay: !current.isHalfDay,
        },
      };
    });
  };

  // Bulk set all 7 days for a single staff
  const handleSetStaffFullWeek = (userId: string, shiftId: ShiftId) => {
    setDraftShifts((prev) => {
      const updated = { ...prev };
      nextWeekDays.forEach((day) => {
        updated[`${userId}_${day.dateStr}`] = { shiftId, isHalfDay: false };
      });
      return updated;
    });
  };

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((user) => {
      if (selectedTeamFilter !== 'ALL') {
        const userTeam = teams.find((t) => t.id === selectedTeamFilter);
        if (!userTeam || !userTeam.memberIds.includes(user.id)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = user.name.toLowerCase().includes(q);
        const matchesId = user.employeeId?.toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  }, [staffList, selectedTeamFilter, searchQuery, teams]);

  // Count shifts by day for next week
  const shiftCountsByDay = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    nextWeekDays.forEach((day) => {
      result[day.dateStr] = {
        HALF_DAY_TOTAL: 0,
      };
      shiftsConfig.forEach((s) => {
        result[day.dateStr][s.id] = 0;
      });
      staffList.forEach((u) => {
        const item = draftShifts[`${u.id}_${day.dateStr}`] || { shiftId: 'HANH_CHINH', isHalfDay: false };
        const sid = item.shiftId;
        result[day.dateStr][sid] = (result[day.dateStr][sid] || 0) + 1;
        if (item.isHalfDay) {
          result[day.dateStr]['HALF_DAY_TOTAL'] = (result[day.dateStr]['HALF_DAY_TOTAL'] || 0) + 1;
        }
      });
    });
    return result;
  }, [nextWeekDays, shiftsConfig, staffList, draftShifts]);

  // Modal quản lý cấu hình ca dành cho Quản trị viên
  const [isManageShiftsOpen, setIsManageShiftsOpen] = useState(false);

  // Kiểm tra phân bổ bắt buộc: mỗi ngày đều phải có ít nhất 1 Ca 1, 1 Ca 2, 1 Ca 3
  const validationByDay = useMemo(() => {
    return nextWeekDays.map((day) => {
      const counts = shiftCountsByDay[day.dateStr] || {};
      const c1 = counts['CA_1'] || 0;
      const c2 = counts['CA_2'] || 0;
      const c3 = counts['CA_3'] || 0;
      const missingShifts: string[] = [];
      if (c1 < 1) missingShifts.push('Ca 1');
      if (c2 < 1) missingShifts.push('Ca 2');
      if (c3 < 1) missingShifts.push('Ca 3');

      return {
        dateStr: day.dateStr,
        dayName: day.name,
        dayNumber: day.dayNumber,
        monthNumber: day.monthNumber,
        c1,
        c2,
        c3,
        missingShifts,
        isValid: missingShifts.length === 0,
      };
    });
  }, [nextWeekDays, shiftCountsByDay]);

  const daysWithMissing = useMemo(() => {
    return validationByDay.filter((d) => !d.isValid);
  }, [validationByDay]);

  // Thực hiện lưu dữ liệu vào hệ thống
  const executeSaveNextWeekSchedule = () => {
    const assignments: { userId: string; date: string; shiftId: ShiftId; isHalfDay?: boolean }[] = [];

    staffList.forEach((user) => {
      nextWeekDays.forEach((day) => {
        const key = `${user.id}_${day.dateStr}`;
        const item = draftShifts[key] || { shiftId: 'HANH_CHINH', isHalfDay: false };
        assignments.push({
          userId: user.id,
          date: day.dateStr,
          shiftId: item.shiftId,
          isHalfDay: item.isHalfDay,
        });
      });
    });

    saveFullWeekSchedule(assignments);
    alert(`Đã lưu lịch làm việc tuần tiếp theo (${nextWeekDays[0].dayNumber}/${nextWeekDays[0].monthNumber} - ${nextWeekDays[6].dayNumber}/${nextWeekDays[6].monthNumber}) thành công!`);
    onClose();

    if (onScheduleSaved) {
      onScheduleSaved(nextWeekMonday);
    }
  };

  // Nút Lưu: chỉ thông báo khi lưu lịch làm việc nhưng chưa đủ Ca 1 - Ca 2 - Ca 3
  const handleSaveNextWeekSchedule = () => {
    if (daysWithMissing.length > 0) {
      // Câu thông báo đúng chuẩn yêu cầu: "Ngày (thứ) thiếu (ca). Hãy kiểm tra lại"
      const missingParts = daysWithMissing.map(
        (d) => `Ngày ${d.dayName} thiếu ${d.missingShifts.join(', ')}`
      );
      alert(`${missingParts.join('. ')}. Hãy kiểm tra lại.`);
      return;
    }
    executeSaveNextWeekSchedule();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-7xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[94vh] max-h-[94vh]">
        {/* 1. Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md text-amber-300 flex items-center justify-center border border-white/20 shrink-0 shadow-xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Lên Lịch Làm Việc Tuần Tiếp Theo
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 shadow-xs">
                  Tuần tới: {nextWeekDays[0].dayNumber}/{nextWeekDays[0].monthNumber} &ndash; {nextWeekDays[6].dayNumber}/{nextWeekDays[6].monthNumber}
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                Hiển thị sẵn lịch tuần hiện tại làm mẫu khởi đầu &bull; Chỉnh sửa trực tiếp từng ca &bull; Lưu lại cho tuần sau
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0 flex-wrap gap-y-1">
            {currentUser.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => setIsManageShiftsOpen(true)}
                title="Quản lý và cấu hình các ca làm việc (dành cho Quản trị viên)"
                className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Clock className="w-3.5 h-3.5 text-amber-900" />
                <span>⚙️ Cấu Hình Ca ({shiftsConfig.length})</span>
              </button>
            )}
            <button
              onClick={handleCopyFromCurrentWeek}
              title="Khôi phục lại toàn bộ ca trực của tuần hiện tại sang tuần tới"
              className="flex items-center space-x-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold px-3 py-2 rounded-xl backdrop-blur-md border border-white/20 transition-all cursor-pointer active:scale-95"
            >
              <Copy className="w-3.5 h-3.5 text-amber-300" />
              <span>📋 Sao Chép Lại Tuần Hiện Tại</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Sub-Toolbar & Controls */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* View Tab Switcher: Tuần Tới vs Tuần Này */}
          <div className="flex items-center space-x-1 bg-slate-200/80 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveViewTab('NEXT_WEEK')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewTab === 'NEXT_WEEK'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lên Lịch Tuần Tiếp Theo ({nextWeekDays[0].dayNumber}/{nextWeekDays[0].monthNumber} - {nextWeekDays[6].dayNumber}/{nextWeekDays[6].monthNumber})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewTab('CURRENT_WEEK')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewTab === 'CURRENT_WEEK'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Đối Chiếu Tuần Hiện Tại ({currentWeekDays[0].dayNumber}/{currentWeekDays[0].monthNumber} - {currentWeekDays[6].dayNumber}/{currentWeekDays[6].monthNumber})</span>
            </button>
          </div>

          {/* Search & Team Filter */}
          <div className="flex items-center space-x-2 flex-1 max-w-md ml-auto">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhân viên, ID nhân viên..."
                className="w-full pl-8 pr-3 py-1.5 bg-white rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
            >
              <option value="ALL">Tất cả tổ đội ({staffList.length} người)</option>
              {teams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name} ({tm.memberIds.length})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Main Body Table */}
        <div className="flex-1 overflow-auto bg-slate-100/50 p-2 sm:p-4">
          {activeViewTab === 'CURRENT_WEEK' ? (
            /* TAB 2: Xem Đối Chiếu Lịch Tuần Hiện Tại */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-3 bg-amber-50/80 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                <span className="font-semibold flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Đây là <strong>Lịch Làm Việc Của Tuần Hiện Tại</strong> đang áp dụng thực tế. Dùng để đối chiếu khi sắp ca tuần tới.
                  </span>
                </span>
                <button
                  onClick={() => setActiveViewTab('NEXT_WEEK')}
                  className="font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  Quay lại soạn thảo tuần tới →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="px-3.5 py-3 font-bold uppercase text-[10px] w-12 text-center">STT</th>
                      <th className="px-4 py-3 font-bold uppercase text-[10px] min-w-[200px]">Nhân Viên & ID</th>
                      {currentWeekDays.map((day) => (
                        <th key={day.dateStr} className="px-2.5 py-2.5 font-bold text-center border-l border-slate-200 min-w-[120px]">
                          <span className="text-[11px] uppercase tracking-wider font-extrabold block text-slate-800">{day.name}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{day.dayNumber}/{day.monthNumber}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.map((user, idx) => {
                      const userTeam = teams.find((t) => t.memberIds.includes(user.id));
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3.5 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="truncate">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs truncate">{getPersonalName(user.name)}</span>
                                {user.employeeId && (
                                  <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                                    ID: {user.employeeId}
                                  </span>
                                )}
                              </div>
                              {userTeam && <p className="text-[10px] text-slate-400 truncate mt-0.5">{userTeam.name}</p>}
                            </div>
                          </td>
                          {currentWeekDays.map((day, dayIdx) => {
                            const curShift = getCurrentWeekShift(user.id, dayIdx);
                            const conf = shiftsConfigMap[curShift.shiftId] || SHIFTS_CONFIG[curShift.shiftId] || SHIFTS_CONFIG.OFF;
                            return (
                              <td key={day.dateStr} className="px-2 py-2 text-center border-l border-slate-100">
                                <span className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${conf.badge}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${conf.dotColor}`} />
                                  <span>{conf.shortName || conf.name}</span>
                                  {curShift.isHalfDay && (
                                    <span className="text-[8px] bg-amber-400 text-amber-950 font-black px-1 py-0.2 rounded leading-none ml-1">
                                      Nghỉ 1/2
                                    </span>
                                  )}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* TAB 1: Bảng Ma Trận Lên Lịch & Sửa Ca Tuần Tiếp Theo (Core Editor) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 bg-blue-50/70 border-b border-blue-100 text-blue-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                  <span>
                    <strong>Hướng dẫn:</strong> Bấm vào bất kỳ ô ca trực nào bên dưới để chọn ca mới cho nhân viên. Sau khi sắp xong, nhấn <strong>&ldquo;Lưu Lịch Tuần Tiếp Theo&rdquo;</strong> ở góc dưới bên phải.
                  </span>
                </div>
                <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1">
                  <span className="text-[11px] font-semibold text-slate-500">Các ca:</span>
                  <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                    {shiftsConfig.map((s) => (
                      <span key={s.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${s.badge}`}>
                        {s.shortName || s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <th className="px-3.5 py-3 font-bold uppercase text-[10px] w-12 text-center">STT</th>
                      <th className="px-4 py-3 font-bold uppercase text-[10px] min-w-[210px]">Nhân Viên & ID</th>
                      <th className="px-3 py-3 font-bold uppercase text-[9px] text-slate-400 w-24 text-center">Mẫu tuần này</th>
                      {nextWeekDays.map((day) => (
                        <th
                          key={day.dateStr}
                          className="px-2.5 py-3 font-bold text-center border-l border-slate-200 min-w-[125px] bg-slate-50/90"
                        >
                          <span className="text-[11px] uppercase tracking-wider font-extrabold block text-blue-900">
                            {day.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            {day.dayNumber}/{day.monthNumber}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-slate-400 text-xs">
                          Không tìm thấy nhân viên nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((user, idx) => {
                        const userTeam = teams.find((t) => t.memberIds.includes(user.id));
                        return (
                          <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3.5 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className="truncate">
                                <div className="flex items-center space-x-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 text-xs truncate">{getPersonalName(user.name)}</span>
                                  {user.employeeId && (
                                    <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                                      ID: {user.employeeId}
                                    </span>
                                  )}
                                </div>
                                {userTeam && <p className="text-[10px] text-slate-400 truncate mt-0.5">{userTeam.name}</p>}
                              </div>
                            </td>

                            {/* Cột ca tuần này để tham chiếu */}
                            <td className="px-2 py-3 text-center text-slate-400 border-r border-slate-100">
                              <span className="text-[9px] font-medium text-slate-400 block truncate" title="Ca phổ biến tuần này">
                                {shiftsConfigMap[getCurrentWeekShiftId(user.id, 0)]?.shortName || 'HC'}
                              </span>
                            </td>

                            {/* 7 Ngày Tuần Tiếp Theo */}
                            {nextWeekDays.map((day, dayIdx) => {
                              const cellKey = `${user.id}_${day.dateStr}`;
                              const cellData = draftShifts[cellKey] || { shiftId: 'HANH_CHINH', isHalfDay: false };
                              const currentShiftId = cellData.shiftId;
                              const isCellHalfDay = !!cellData.isHalfDay;
                              const conf = shiftsConfigMap[currentShiftId] || SHIFTS_CONFIG[currentShiftId] || SHIFTS_CONFIG.OFF;
                              const curWeekShift = getCurrentWeekShift(user.id, dayIdx);
                              const isChangedFromThisWeek = currentShiftId !== curWeekShift.shiftId || isCellHalfDay !== !!curWeekShift.isHalfDay;
                              const isPickerOpen = activeCellPicker?.userId === user.id && activeCellPicker?.dateStr === day.dateStr;

                              return (
                                <td
                                  key={day.dateStr}
                                  className="px-1.5 py-1.5 text-center border-l border-slate-100 relative"
                                >
                                  {/* Shift Pill Button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isPickerOpen) {
                                        setActiveCellPicker(null);
                                      } else {
                                        setActiveCellPicker({ userId: user.id, dateStr: day.dateStr });
                                      }
                                    }}
                                    className={`w-full py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5 shadow-2xs hover:scale-105 active:scale-95 ${
                                      conf.badge
                                    } ${isChangedFromThisWeek ? 'ring-1 ring-blue-500' : ''}`}
                                  >
                                    <div className="flex items-center space-x-1">
                                      <span className={`w-2 h-2 rounded-full ${conf.dotColor} shrink-0 ring-1 ring-black/10`} />
                                      <span className="truncate max-w-[85px] font-extrabold">{conf.shortName || conf.name}</span>
                                    </div>
                                    {isCellHalfDay && (
                                      <span className="text-[8px] bg-amber-400 text-amber-950 font-black px-1.5 py-0.2 rounded shadow-2xs leading-none">
                                        Nghỉ 1/2 Ca
                                      </span>
                                    )}
                                    {!conf.hasNoTime && conf.timeRange && (
                                      <span className="text-[8.5px] opacity-90 font-bold leading-none">{conf.timeRange}</span>
                                    )}
                                  </button>

                                  {/* Popover Shift Picker */}
                                  {isPickerOpen && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setActiveCellPicker(null)}
                                      />
                                      <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-2.5 w-52 text-left space-y-1.5 animate-fade-in">
                                        <div className="text-[10px] font-bold text-slate-400 px-2 py-0.5 uppercase border-b border-slate-100">
                                          Chọn ca cho {day.name}:
                                        </div>
                                        <div className="max-h-52 overflow-y-auto space-y-1">
                                          {shiftsConfig.map((sc) => {
                                            const isSelected = currentShiftId === sc.id;
                                            return (
                                              <button
                                                type="button"
                                                key={sc.id}
                                                onClick={() => handleSetCellShift(user.id, day.dateStr, sc.id)}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                  isSelected
                                                    ? 'bg-blue-600 text-white font-bold'
                                                    : 'hover:bg-slate-100 text-slate-700'
                                                }`}
                                              >
                                                <div className="flex items-center space-x-2 truncate">
                                                  <span className={`w-2 h-2 rounded-full ${sc.dotColor} shrink-0`} />
                                                  <span className="truncate">{sc.name}</span>
                                                </div>
                                                {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                                              </button>
                                            );
                                          })}

                                          {/* Chế độ Nghỉ Nửa Ngày: Bật/Tắt nghỉ 1/2 ca cho ca đang chọn */}
                                          {currentShiftId !== 'OFF' && (
                                            <div className="pt-2 mt-1.5 border-t border-slate-100">
                                              <button
                                                type="button"
                                                onClick={() => handleToggleCellHalfDay(user.id, day.dateStr)}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                                                  isCellHalfDay
                                                    ? 'bg-amber-100 border-amber-300 text-amber-950 shadow-2xs'
                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-200'
                                                }`}
                                              >
                                                <div className="flex items-center space-x-2 truncate">
                                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 ring-1 ring-amber-600/30" />
                                                  <span className="truncate">Nghỉ Nửa Ngày</span>
                                                </div>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                                                  isCellHalfDay ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                  {isCellHalfDay ? 'BẬT' : 'TẮT'}
                                                </span>
                                              </button>
                                              <p className="text-[9px] text-slate-400 mt-1 px-1">
                                                {isCellHalfDay ? 'Đang làm 1/2 ca & nghỉ 1/2 ca' : 'Bật để cho phép nghỉ nửa ngày'}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Summary Coverage Row */}
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200 text-[10px] text-slate-600 font-semibold">
                      <td colSpan={3} className="px-4 py-2.5 font-bold uppercase text-slate-700">
                        Tổng phân bổ ca / ngày:
                      </td>
                      {nextWeekDays.map((day) => {
                        const counts = shiftCountsByDay[day.dateStr] || {};

                        return (
                          <td
                            key={`summary-${day.dateStr}`}
                            className="px-2 py-2 text-center border-l border-slate-200 align-top"
                          >
                            <div className="space-y-0.5">
                              {shiftsConfig.map((sc) => {
                                const c = counts[sc.id] || 0;
                                if (c === 0) return null;
                                return (
                                  <div key={sc.id} className="flex items-center justify-between text-[9px]">
                                    <span className="truncate text-slate-600 font-medium">{sc.shortName || sc.name}:</span>
                                    <span className="font-extrabold text-slate-900 ml-1">{c}</span>
                                  </div>
                                );
                              })}
                              {(counts['HALF_DAY_TOTAL'] || 0) > 0 && (
                                <div className="flex items-center justify-between text-[9px] text-amber-950 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                                  <span className="truncate">Nghỉ 1/2 ca:</span>
                                  <span className="font-extrabold ml-1">{counts['HALF_DAY_TOTAL']}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 4. Modal Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Đã nạp <strong>{staffList.length} nhân sự</strong> từ tuần hiện tại. Sửa ca trực trực tiếp trên bảng và nhấn lưu.
            </span>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>

            <button
              type="button"
              onClick={handleSaveNextWeekSchedule}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center space-x-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>💾 Lưu Lịch Tuần Tiếp Theo</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Modal Cấu Hình Ca Làm Việc (Admin) */}
      <ManageShiftsModal
        isOpen={isManageShiftsOpen}
        onClose={() => setIsManageShiftsOpen(false)}
      />
    </div>
  );
}
