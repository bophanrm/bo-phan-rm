'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { User, TeamGroup, StaffLevel } from '@/types';
import {
  Users,
  FolderKanban,
  Search,
  Phone,
  Shield,
  Star,
  CheckCircle2,
  Clock,
  UserPlus,
  Plus,
  Crown,
  FileCheck,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { PermissionModal } from './PermissionModal';
import { EditTeamModal } from './EditTeamModal';
import { ManageShiftsModal } from '../schedule/ManageShiftsModal';
import { getPersonalName } from '@/utils/nameHelper';
import { canManageStaffPermissions } from '@/utils/permissions';

const LEVEL_BADGES: Record<StaffLevel, { label: string; color: string }> = {
  LEVEL_1_MANAGER: { label: 'Cấp 1 • Quản Lý', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  LEVEL_2_SECRETARY: { label: 'Cấp 2 • Nhân Viên Điều Phối', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  LEVEL_3_LEAD: { label: 'Cấp 3 • Giám Sát', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  LEVEL_4_STAFF: { label: 'Cấp 4 • Nhân Viên', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
};

export function TeamDirectory() {
  const { users, teams, tasks, currentUser, shiftsConfig } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'BY_TEAM' | 'ALL_STAFF'>('BY_TEAM');
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<User | null | 'NEW'>(null);
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState<TeamGroup | null | 'NEW'>(null);
  const [isManageShiftsOpen, setIsManageShiftsOpen] = useState(false);

  // Chỉ có cấp độ của Anh Xa và Anh Vũ mới có thể phân quyền & quản lý nhân sự
  const canManagePerms = canManageStaffPermissions(currentUser);

  // Chỉ Cấp 1 (Ban Lãnh Đạo) và Cấp 2 (Nhân Viên Điều Phối) mới được xem số lượng công việc đang làm của các tổ và nhân sự
  // Cấp 3 và Cấp 4 hoàn toàn không thấy
  const canViewWorkloadStats =
    currentUser.level === 'LEVEL_1_MANAGER' ||
    currentUser.level === 'LEVEL_2_SECRETARY' ||
    currentUser.role === 'ADMIN' ||
    currentUser.role === 'MANAGER' ||
    currentUser.role === 'SECRETARY' ||
    currentUser.id === 'user-tong-truong-xa' ||
    currentUser.id === 'user-nguyen-tran-hoang-vu' ||
    currentUser.id === 'user-nguyen-thi-thao-nguyen';

  const isLeadership =
    currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER' || currentUser.role === 'SECRETARY';

  // System Administrator
  const adminUser = users.find((u) => u.role === 'ADMIN');

  // Management staff (Cấp 1 Quản Lý & Cấp 2 Điều Phối, loại bỏ Quản Trị Viên)
  const leadership = users.filter(
    (u) =>
      u.role !== 'ADMIN' &&
      (u.role === 'MANAGER' ||
        u.role === 'SECRETARY' ||
        u.level === 'LEVEL_1_MANAGER' ||
        u.level === 'LEVEL_2_SECRETARY')
  );

  // Operational staff (Cấp 3 Giám Sát & Cấp 4 Nhân Viên)
  const operationalStaff = users.filter(
    (u) => u.role !== 'ADMIN' && (u.role === 'STAFF' || u.level === 'LEVEL_3_LEAD' || u.level === 'LEVEL_4_STAFF')
  );

  // Filtered operational staff by search
  const filteredStaff = operationalStaff.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.phone && u.phone.includes(searchTerm))
  );

  // Helper to count active tasks for a specific user
  const getUserActiveTasksCount = (userId: string) => {
    return tasks.filter(
      (t) => t.assignedTo.includes(userId) && (t.status === 'IN_PROGRESS' || t.status === 'TODO')
    ).length;
  };

  // Helper to count active tasks for a team
  const getTeamActiveTasksCount = (memberIds: string[]) => {
    return tasks.filter(
      (t) =>
        t.assignedTo.some((id) => memberIds.includes(id)) &&
        (t.status === 'IN_PROGRESS' || t.status === 'TODO' || t.status === 'SUBMITTED')
    ).length;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Danh sách nhân viên</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Xem hồ sơ, chức vụ, số điện thoại liên lạc và khối lượng công việc hiện tại của từng tổ
          </p>
        </div>

        {/* View Mode Toggle & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên, sđt..."
              className="pl-9 pr-3 py-2 text-xs bg-slate-100 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
            />
          </div>

          {/* Toggle View */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold w-full sm:w-auto justify-center">
            <button
              onClick={() => setViewMode('BY_TEAM')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'BY_TEAM' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gộp theo Tổ ({teams.length})
            </button>
            <button
              onClick={() => setViewMode('ALL_STAFF')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'ALL_STAFF' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({operationalStaff.length})
            </button>
          </div>

          {/* Nút Thêm Nhân Viên Mới (Chỉ Lãnh Đạo: Anh Xa & Anh Vũ) */}
          {canManagePerms && (
            <button
              onClick={() => setSelectedUserForPerms('NEW')}
              className="flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all shrink-0 active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Thêm Nhân Viên</span>
            </button>
          )}
        </div>
      </div>

      {/* Tài Khoản Quản Trị Hệ Thống */}
      {adminUser && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-lg space-y-3 border border-indigo-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Tài Khoản Quản Trị Hệ Thống (Vận Hành & Phân Quyền)
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3.5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h4 className="font-bold text-sm text-white">{adminUser.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    Quản Trị Viên
                  </span>
                  {adminUser.employeeId && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 border border-white/20">
                      ID: {adminUser.employeeId}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-indigo-200/90 leading-relaxed font-medium">
                  &ldquo;Tài khoản này có đầy đủ mọi thẩm quyền cao nhất: thêm/sửa/xoá nhân viên, phân quyền 4 cấp bậc, tạo tổ/đội. Không có quyền duyệt và không xuất hiện trong các vấn đề giao việc.&rdquo;
                </p>
                {adminUser.phone && (
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-0.5">
                    <a href={`tel:${adminUser.phone}`} className="flex items-center space-x-1 hover:text-white transition-colors">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>{adminUser.phone}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {canManagePerms && (
              <div className="self-end sm:self-center flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
                {currentUser.role === 'ADMIN' && (
                  <button
                    onClick={() => setIsManageShiftsOpen(true)}
                    title="Cấu hình & tạo ca làm việc cho bộ phận RM"
                    className="flex items-center space-x-1.5 text-xs font-bold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Tạo Ca Làm Việc ({shiftsConfig.length})</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedUserForPerms(adminUser)}
                  title="Chỉnh sửa thông tin Quản Trị Viên"
                  className="flex items-center space-x-1.5 text-xs font-bold text-indigo-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Cấu hình</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quản Lý và Điều Phối Row */}
      {leadership.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Ban Quản Lý & Điều Hành (Cấp 1 & Cấp 2)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {leadership.map((leader) => (
              <div
                key={leader.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between"
              >
                <div className="space-y-0.5 truncate flex-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h4 className="font-bold text-sm text-white truncate">{getPersonalName(leader.name)}</h4>
                    {leader.employeeId && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 border border-white/20">
                        ID: {leader.employeeId}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        leader.role === 'MANAGER' || leader.level === 'LEVEL_1_MANAGER'
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : 'bg-blue-400/20 text-blue-300 border border-blue-400/30'
                      }`}
                    >
                      {leader.level && LEVEL_BADGES[leader.level]
                        ? LEVEL_BADGES[leader.level].label
                        : leader.role === 'MANAGER'
                        ? 'Cấp 1 • Quản Lý'
                        : 'Cấp 2 • Nhân Viên Điều Phối'}
                    </span>
                  </div>
                  {leader.phone && (
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                      <a
                        href={`tel:${leader.phone}`}
                        className="flex items-center space-x-1 hover:text-white transition-colors"
                      >
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>{leader.phone}</span>
                      </a>
                    </div>
                  )}
                </div>

                {canManagePerms && (
                  <button
                    onClick={() => setSelectedUserForPerms(leader)}
                    title="Chỉnh sửa thông tin & phân quyền"
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content: By Team or All Staff */}
      {viewMode === 'BY_TEAM' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Danh sách Tổ và Nhân viên ({teams.length} tổ)
            </h3>

            {isLeadership && (
              <button
                onClick={() => setSelectedTeamForEdit('NEW')}
                className="flex items-center space-x-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Thêm Tổ / Đội Mới</span>
              </button>
            )}
          </div>

          {teams.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center text-slate-400 text-sm shadow-xs space-y-2">
              <p className="font-semibold text-slate-700">Chưa có Tổ / Đội nào được tạo.</p>
              <p className="text-xs text-slate-500">Bấm nút "+ Thêm Tổ / Đội Mới" ở góc trên bên phải để bắt đầu tạo tổ và phân bổ nhân sự.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
              {teams.map((team) => {
              const activeCount = getTeamActiveTasksCount(team.memberIds);
              const teamMembers = team.memberIds
                .map((id) => users.find((u) => u.id === id))
                .filter(Boolean) as User[];
              const teamSupervisor = teamMembers.find((m) => m.level === 'LEVEL_3_LEAD');
              const hasSupervisor = !!teamSupervisor;

              return (
                <div
                  key={team.id}
                  className="bg-white rounded-bento border border-slate-200/90 p-5 shadow-bento flex flex-col justify-between space-y-4 relative"
                >
                  <div>
                    {/* Team Header (Phân tầng thông thoáng, không bị bóp nghẹt chữ) */}
                    <div className="space-y-2 mb-3">
                      {/* Hàng 1: Icon + Tên tổ + Tải công việc + Nút cài đặt */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/80 shadow-2xs">
                            <FolderKanban className="w-4 h-4" />
                          </div>
                          <h4 className="font-extrabold text-slate-900 text-base leading-snug truncate">
                            {team.name}
                          </h4>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          {canViewWorkloadStats && (
                            <div
                              className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 shadow-2xs whitespace-nowrap ${
                                activeCount > 0
                                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                                  : 'bg-slate-50 text-slate-500 border-slate-200/80'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  activeCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'
                                }`}
                              />
                              <span>{activeCount > 0 ? `${activeCount} việc đang chạy` : '0 việc'}</span>
                            </div>
                          )}

                          {isLeadership && (
                            <button
                              onClick={() => setSelectedTeamForEdit(team)}
                              title="Ban điều hành sắp xếp nhân sự cho tổ này"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Hàng 2: Huy hiệu số thành viên & Giám sát ca phụ trách (Rộng rãi, không bị rớt dòng chữ) */}
                      <div className="flex items-center flex-wrap gap-1.5 text-xs">
                        <span className="inline-flex items-center space-x-1 text-slate-700 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg text-[11px]">
                          <Users className="w-3 h-3 text-slate-500" />
                          <span>{teamMembers.length} thành viên</span>
                        </span>

                        {hasSupervisor ? (
                          <span className="inline-flex items-center space-x-1 text-purple-900 font-bold bg-purple-50 border border-purple-200/80 px-2.5 py-1 rounded-lg text-[11px]">
                            <ShieldCheck className="w-3 h-3 text-purple-600" />
                            <span>Giám sát: {getPersonalName(teamSupervisor.name, true)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-slate-400 font-normal bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-lg text-[10px]">
                            Chưa có giám sát
                          </span>
                        )}
                      </div>
                    </div>

                    {team.description && (
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4">
                        {team.description}
                      </p>
                    )}

                    {/* Member Cards in Team */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Thành viên trong tổ:
                      </p>
                      {teamMembers.map((member) => {
                        // Tổ chỉ có Tổ Trưởng khi tổ ĐÓ KHÔNG CÓ GIÁM SÁT
                        const isTeamLeader = !hasSupervisor && team.leaderId === member.id;
                        const userTasks = getUserActiveTasksCount(member.id);
                        const levelBadge = member.level ? LEVEL_BADGES[member.level] : null;

                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/70 hover:border-blue-300 bg-white transition-all shadow-xs gap-3"
                          >
                            <div className="truncate text-left min-w-0">
                              <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                                <p className="text-xs font-bold text-slate-900 truncate">{getPersonalName(member.name)}</p>
                                {member.employeeId && (
                                  <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                                    ID: {member.employeeId}
                                  </span>
                                )}
                                {levelBadge && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${levelBadge.color} shrink-0`}>
                                      {levelBadge.label.split(' • ')[1]}
                                    </span>
                                  )}
                                  {isTeamLeader && (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded flex items-center space-x-0.5 shrink-0">
                                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 inline mr-0.5" />
                                      <span>Tổ Trưởng</span>
                                    </span>
                                  )}
                                </div>

                                {member.phone && (
                                  <a
                                    href={`tel:${member.phone}`}
                                    className="text-[11px] font-medium text-slate-500 hover:text-blue-600 flex items-center space-x-1 mt-0.5"
                                  >
                                    <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                    <span>{member.phone}</span>
                                  </a>
                                )}
                              </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              {canViewWorkloadStats && (
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border whitespace-nowrap ${
                                    userTasks > 0
                                      ? 'bg-amber-50 text-amber-800 border-amber-200/80 font-bold'
                                      : 'bg-slate-50 text-slate-400 border-slate-200/60'
                                  }`}
                                >
                                  {userTasks > 0 ? `${userTasks} việc` : '0 việc'}
                                </span>
                              )}

                              {canManagePerms && (
                                <button
                                  onClick={() => setSelectedUserForPerms(member)}
                                  title="Chỉnh sửa & phân quyền nhân viên này"
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      ) : (
        /* All Staff Flat Grid View */
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Toàn Bộ Nhân Sự ({filteredStaff.length} người)
          </h3>

          {filteredStaff.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              Chưa có nhân sự nào trong danh sách. Bấm "+ Thêm Nhân Viên Mới" ở góc trên để thêm nhân viên.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredStaff.map((staff) => {
              const activeCount = getUserActiveTasksCount(staff.id);
              // Find teams this staff belongs to
              const staffTeams = teams.filter((t) => t.memberIds.includes(staff.id));

              return (
                <div
                  key={staff.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="truncate flex-1">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{getPersonalName(staff.name, false)}</h4>
                        {staff.employeeId && (
                          <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                            ID: {staff.employeeId}
                          </span>
                        )}
                        {staff.level && LEVEL_BADGES[staff.level] && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${LEVEL_BADGES[staff.level].color}`}>
                              {LEVEL_BADGES[staff.level].label.split(' • ')[1]}
                            </span>
                          )}
                        </div>
                        {staff.phone && (
                          <a
                            href={`tel:${staff.phone}`}
                            className="text-xs text-blue-600 hover:underline font-medium flex items-center space-x-1 mt-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-500" />
                            <span>{staff.phone}</span>
                          </a>
                        )}
                      </div>

                    {canManagePerms && (
                      <button
                        onClick={() => setSelectedUserForPerms(staff)}
                        title="Phân quyền nhân viên này"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 shrink-0 ml-1"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Teams badges */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Thuộc các tổ:</p>
                    <div className="flex flex-wrap gap-1">
                      {staffTeams.map((t) => (
                        <span
                          key={t.id}
                          className="text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded-md"
                        >
                          {t.name.split(':')[0]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {canViewWorkloadStats && (
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Đang phụ trách:</span>
                      <span
                        className={`font-bold ${
                          activeCount > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {activeCount > 0 ? `${activeCount} công việc` : 'Chưa có việc'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* Permission & Staff Edit Modal for Manager (Anh Xa & Anh Vũ) */}
      <PermissionModal
        user={selectedUserForPerms === 'NEW' ? null : selectedUserForPerms}
        isOpen={!!selectedUserForPerms}
        onClose={() => setSelectedUserForPerms(null)}
      />

      {/* Edit / Organize Team Modal for Leadership */}
      <EditTeamModal
        team={selectedTeamForEdit === 'NEW' ? null : selectedTeamForEdit}
        isOpen={!!selectedTeamForEdit}
        onClose={() => setSelectedTeamForEdit(null)}
      />

      {/* Manage Shifts Modal for Admin */}
      <ManageShiftsModal
        isOpen={isManageShiftsOpen}
        onClose={() => setIsManageShiftsOpen(false)}
      />
    </div>
  );
}
