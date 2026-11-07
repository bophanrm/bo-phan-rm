'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { User, Role, StaffLevel, UserPermissions } from '@/types';
import { X, ShieldCheck, Check, UserCheck, AlertTriangle, Trash2, UserPlus, Phone, Tag } from 'lucide-react';
import { getPersonalName } from '@/utils/nameHelper';

interface PermissionModalProps {
  user: User | null; // null nếu là thêm mới nhân viên
  isOpen: boolean;
  onClose: () => void;
}

const LEVEL_CONFIG: Record<
  StaffLevel,
  { label: string; role: Role; desc: string; defaultPerms: UserPermissions; color: string }
> = {
  LEVEL_1_MANAGER: {
    label: 'Cấp 1: Quản Lý',
    role: 'MANAGER',
    desc: 'Lãnh đạo điều hành, phân quyền nhân sự, giao dự án & việc hằng ngày, duyệt báo cáo.',
    defaultPerms: {
      canAssignTasks: true,
      canAssignDailyTasks: true,
      canReviewReports: true,
      canManagePermissions: true,
    },
    color: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  LEVEL_2_SECRETARY: {
    label: 'Cấp 2: Nhân Viên Điều Phối',
    role: 'SECRETARY',
    desc: 'Lên lịch làm việc cả team, giao việc hằng ngày cho Giám sát và Nhân viên, đồng nhận báo cáo, xuất file Excel.',
    defaultPerms: {
      canAssignTasks: false,
      canAssignDailyTasks: true,
      canReviewReports: true,
      canManagePermissions: false,
      canManageSchedule: true,
    },
    color: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  LEVEL_3_LEAD: {
    label: 'Cấp 3: Giám Sát',
    role: 'STAFF',
    desc: 'Giao việc và duyệt các công việc hằng ngày cho nhân viên, không duyệt dự án dài hạn.',
    defaultPerms: {
      canAssignTasks: false,
      canAssignDailyTasks: true,
      canReviewReports: true,
      canManagePermissions: false,
    },
    color: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  LEVEL_4_STAFF: {
    label: 'Cấp 4: Nhân Viên',
    role: 'STAFF',
    desc: 'Tiếp nhận công việc từ cấp trên, thi công trực tiếp và báo cáo kết quả kèm ảnh.',
    defaultPerms: {
      canAssignTasks: false,
      canAssignDailyTasks: false,
      canReviewReports: false,
      canManagePermissions: false,
    },
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
};

export function PermissionModal({ user, isOpen, onClose }: PermissionModalProps) {
  const { users, saveUser, deleteUser, teams, saveTeam } = useApp();

  const [employeeId, setEmployeeId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<StaffLevel>('LEVEL_4_STAFF');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  useEffect(() => {
    if (user) {
      // Tách lấy tên riêng
      const personal = getPersonalName(user.name);
      setEmployeeId(user.employeeId || '');
      setName(personal);
      setPhone(user.phone || '');

      const level = user.level || (user.role === 'MANAGER' ? 'LEVEL_1_MANAGER' : user.role === 'SECRETARY' ? 'LEVEL_2_SECRETARY' : 'LEVEL_4_STAFF');
      setSelectedLevel(level);

      // Tìm tổ người này đang thuộc về
      const userTeam = teams.find((t) => t.memberIds.includes(user.id));
      setSelectedTeamId(userTeam?.id || '');
    } else {
      // Form thêm mới nhân sự
      setEmployeeId('');
      setName('');
      setPhone('');
      setSelectedLevel('LEVEL_4_STAFF');
      setSelectedTeamId(teams[0]?.id || '');
    }
  }, [user, teams, isOpen]);

  if (!isOpen) return null;

  const isEditing = !!user;
  const isEditingAdmin = user?.role === 'ADMIN' || user?.id === 'user-admin';
  const isProtectedUser = isEditingAdmin || users.length <= 1;

  const handleLevelChange = (lvl: StaffLevel) => {
    setSelectedLevel(lvl);
  };

  const handleDelete = () => {
    if (!user || isProtectedUser) return;
    if (confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}" khỏi toàn bộ danh sách?`)) {
      deleteUser(user.id);
      onClose();
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên nhân sự.');
      return;
    }

    const trimmedEmployeeId = employeeId.trim().toUpperCase();

    // Đối với nhân viên thông thường, bắt buộc nhập ID nhân viên (dùng làm tài khoản đăng nhập khi go-live)
    if (!isEditingAdmin) {
      if (!trimmedEmployeeId) {
        alert('Vui lòng nhập ID nhân viên (dùng làm tài khoản đăng nhập cho nhân viên khi triển khai chính thức).');
        return;
      }

      // Kiểm tra trùng lặp ID nhân viên trong hệ thống
      const duplicateUser = users.find(
        (u) => u.id !== user?.id && u.employeeId && u.employeeId.trim().toUpperCase() === trimmedEmployeeId
      );
      if (duplicateUser) {
        alert(`ID nhân viên "${trimmedEmployeeId}" đã được gán cho nhân sự "${duplicateUser.name}". Vui lòng nhập mã ID khác.`);
        return;
      }
    }

    if (isEditingAdmin) {
      saveUser({
        id: user?.id,
        employeeId: trimmedEmployeeId || 'ADMIN',
        name: name.trim(),
        phone: phone.trim() || undefined,
        role: 'ADMIN',
        level: undefined,
        permissions: {
          canAssignTasks: false,
          canAssignDailyTasks: false,
          canReviewReports: false,
          canManagePermissions: true,
          canManageSchedule: false,
        },
      });
      onClose();
      return;
    }

    const config = LEVEL_CONFIG[selectedLevel];
    const generatedId = user?.id || `user-${Date.now()}`;

    saveUser({
      id: user?.id,
      employeeId: trimmedEmployeeId,
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: '',
      department: '',
      role: config.role,
      level: selectedLevel,
      permissions: config.defaultPerms,
    });

    // Cập nhật gán vào tổ nếu đã chọn
    if (selectedTeamId) {
      const targetTeam = teams.find((t) => t.id === selectedTeamId);
      if (targetTeam && !targetTeam.memberIds.includes(generatedId)) {
        saveTeam({
          id: targetTeam.id,
          name: targetTeam.name,
          description: targetTeam.description,
          leaderId: targetTeam.leaderId,
          memberIds: [...targetTeam.memberIds, generatedId],
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              {isEditing ? <ShieldCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEditing ? 'Phân Quyền & Chỉnh Sửa Nhân Sự' : 'Thêm Nhân Viên Mới Vào Danh Sách'}
              </h3>
              <p className="text-xs text-slate-500">Đặc quyền phân quyền của Cấp 1 (Ban Quản Lý)</p>
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
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4">
          {isEditingAdmin && (
            <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-100 border border-indigo-800">
                  🛡️ Quản Trị Viên • Vận Hành Hệ Thống
                </span>
              </div>
              <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                &ldquo;Tài khoản này có đầy đủ mọi thẩm quyền cao nhất: thêm/sửa/xoá nhân viên, phân quyền 4 cấp bậc, tạo tổ/đội. Không có quyền duyệt và không xuất hiện trong các vấn đề giao việc.&rdquo;
              </p>
            </div>
          )}

          {/* Section 1: Tự Nhập Thông Tin Cá Nhân */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Thông Tin Nhân Sự</span>
              </span>
              <span className="text-[10px] text-slate-400">Họ và tên đầy đủ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ID nhân viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={!isEditingAdmin}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="VD: RM001, SB102..."
                  className="w-full text-xs font-bold font-mono bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 uppercase tracking-wider"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Họ và tên nhân sự <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A, Trần Văn B..."
                  className="w-full text-xs font-semibold bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center space-x-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>Số điện thoại</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0912 345 678"
                  className="w-full text-xs bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {!isEditingAdmin && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Phân bổ vào Tổ / Đội
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full text-xs font-semibold bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">-- Chưa phân tổ --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      📁 {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section 2: Cấp Bậc / Vai Trò Selector (Chỉ dành cho nhân sự tác nghiệp, không áp dụng cho Quản trị viên) */}
          {!isEditingAdmin && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Chọn Cấp Bậc Chức Vụ (4 Cấp Bậc)
              </label>
              <div className="space-y-2">
                {(Object.keys(LEVEL_CONFIG) as StaffLevel[]).map((lvl) => {
                  const item = LEVEL_CONFIG[lvl];
                  const isSelected = selectedLevel === lvl;
                  return (
                    <div
                      key={lvl}
                      onClick={() => handleLevelChange(lvl)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900">{item.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            {isEditing && !isProtectedUser ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center space-x-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa nhân viên</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
              >
                {isEditing ? 'Lưu Thông Tin & Phân Quyền' : 'Thêm Nhân Viên Mới'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
