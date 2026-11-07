'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { TeamGroup, User } from '@/types';
import { X, Users, Star, Trash2, Check, AlertCircle, FolderPlus, CheckSquare, ShieldCheck } from 'lucide-react';
import { getPersonalName } from '@/utils/nameHelper';

interface EditTeamModalProps {
  team: TeamGroup | null; // null nếu là tạo mới
  isOpen: boolean;
  onClose: () => void;
}

export function EditTeamModal({ team, isOpen, onClose }: EditTeamModalProps) {
  const { users, teams, saveTeam, deleteTeam } = useApp();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leaderId, setLeaderId] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Operational staff (Chỉ lấy các nhân viên kỹ thuật và giám sát, loại bỏ Quản trị viên)
  const availableStaff = users.filter((u) => u.role !== 'ADMIN' && (u.role === 'STAFF' || u.level === 'LEVEL_3_LEAD' || u.level === 'LEVEL_4_STAFF'));

  // Kiểm tra xem tổ có Giám Sát (LEVEL_3_LEAD) hay không
  const supervisorMembers = selectedMemberIds
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is User => !!u && u.level === 'LEVEL_3_LEAD');
  const hasSupervisor = supervisorMembers.length > 0;

  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || '');
      setSelectedMemberIds(team.memberIds);
      const supervisors = team.memberIds
        .map((id) => users.find((u) => u.id === id))
        .filter((u): u is User => !!u && u.level === 'LEVEL_3_LEAD');
      setLeaderId(supervisors.length > 0 ? '' : (team.leaderId || ''));
    } else {
      setName(`Tổ ${teams.length + 1}: `);
      setDescription('');
      setSelectedMemberIds(availableStaff.slice(0, 2).map((u) => u.id));
      setLeaderId('');
    }
  }, [team, teams.length]);

  if (!isOpen) return null;

  const handleToggleMember = (userId: string) => {
    if (selectedMemberIds.includes(userId)) {
      if (selectedMemberIds.length === 1) {
        alert('Tổ cần có ít nhất 1 thành viên.');
        return;
      }
      const updated = selectedMemberIds.filter((id) => id !== userId);
      setSelectedMemberIds(updated);
      if (leaderId === userId) {
        setLeaderId('');
      }
    } else {
      const updated = [...selectedMemberIds, userId];
      setSelectedMemberIds(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên tổ/đội.');
      return;
    }
    if (selectedMemberIds.length === 0) {
      alert('Vui lòng chọn ít nhất 1 thành viên vào tổ.');
      return;
    }

    saveTeam({
      id: team ? team.id : undefined,
      name: name.trim(),
      description: description.trim(),
      leaderId: hasSupervisor ? undefined : (leaderId || undefined),
      memberIds: selectedMemberIds,
    });

    onClose();
  };

  const handleDelete = () => {
    if (!team) return;
    if (confirm(`Bạn có chắc chắn muốn xóa "${team.name}"?`)) {
      deleteTeam(team.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {team ? 'Sắp Xếp & Phân Bổ Nhân Sự Tổ' : 'Thêm Tổ / Đội Mới'}
              </h3>
              <p className="text-xs text-slate-500">Ban điều hành chỉ định nhân sự và phân bổ tổ trưởng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Tên Tổ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tên Tổ / Đội Chuyên Trách <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Tổ 1: Giám Sát Hiện Trường"
              className="w-full text-xs font-semibold bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Mô tả nhiệm vụ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mô Tả Chức Năng & Nhiệm Vụ
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chuyên trách công việc gì, yêu cầu kỹ năng gì..."
              className="w-full text-xs bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
          </div>

          {/* Sắp Xếp & Phân Bổ Thành Viên Vào Tổ */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chọn Nhân Sự Vào Tổ ({selectedMemberIds.length} người) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">Tick để thêm/bớt</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {availableStaff.map((staff) => {
                const isSelected = selectedMemberIds.includes(staff.id);
                // Tìm các tổ khác mà nhân sự này đang tham gia
                const otherTeams = teams
                  .filter((t) => t.id !== team?.id && t.memberIds.includes(staff.id))
                  .map((t) => t.name.split(':')[0]);

                return (
                  <div
                    key={staff.id}
                    onClick={() => handleToggleMember(staff.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">{getPersonalName(staff.name, false)}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      {otherTeams.length > 0 ? (
                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          Thuộc {otherTeams.join(', ')}
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-slate-400">
                          Chưa có tổ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cấp Quyền Tổ Trưởng: Chỉ có khi tổ KHÔNG có Giám sát */}
          {hasSupervisor ? (
            <div className="p-3.5 bg-purple-50/80 rounded-xl border border-purple-200/80 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-purple-950">
                  Tổ đã có Giám Sát (Cấp 3): {supervisorMembers.map((s) => getPersonalName(s.name, false)).join(', ')}
                </p>
                <p className="text-purple-700 text-[11px] mt-0.5 leading-relaxed">
                  Vì tổ đã có Giám Sát trực tiếp phụ trách điều hành hiện trường, nên tổ không cần chỉ định Tổ Trưởng.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Cấp Quyền "Tổ Trưởng" (Tổ Chưa Có Giám Sát)</span>
                </label>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Tổ này không có Giám Sát. Bạn có thể chỉ định 1 Nhân Viên làm Tổ Trưởng để đại diện nộp báo cáo, hoặc có thể để trống.
              </p>
              <select
                value={leaderId}
                onChange={(e) => setLeaderId(e.target.value)}
                className="w-full text-xs font-semibold bg-white rounded-xl px-3 py-2.5 border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-xs"
              >
                <option value="">-- Không có Tổ Trưởng --</option>
                {selectedMemberIds.map((memberId) => {
                  const u = users.find((user) => user.id === memberId);
                  return (
                    <option key={memberId} value={memberId}>
                      ⭐ {getPersonalName(u?.name, false)} (Nhân Viên)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {team ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center space-x-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa tổ này</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                {team ? 'Lưu Sắp Xếp Tổ' : 'Tạo Tổ Mới'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
