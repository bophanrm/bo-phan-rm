'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ShiftInfo } from '@/types';
import {
  X,
  Plus,
  Clock,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface ManageShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColorTheme {
  id: string;
  name: string;
  dotColor: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badge: string;
}

const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'blue',
    name: 'Xanh Dương',
    dotColor: 'bg-blue-600',
    bgClass: 'bg-blue-50/80',
    textClass: 'text-blue-950 font-bold',
    borderClass: 'border-blue-300',
    badge: 'bg-blue-100 text-blue-950 border-blue-400 font-bold',
  },
  {
    id: 'amber',
    name: 'Vàng Nắng',
    dotColor: 'bg-amber-500',
    bgClass: 'bg-amber-50/80',
    textClass: 'text-amber-950 font-bold',
    borderClass: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-950 border-amber-400 font-bold',
  },
  {
    id: 'orange',
    name: 'Cam Rực Rỡ',
    dotColor: 'bg-orange-500',
    bgClass: 'bg-orange-50/80',
    textClass: 'text-orange-950 font-bold',
    borderClass: 'border-orange-300',
    badge: 'bg-orange-100 text-orange-950 border-orange-400 font-bold',
  },
  {
    id: 'indigo',
    name: 'Xanh Tím',
    dotColor: 'bg-indigo-600',
    bgClass: 'bg-indigo-50/80',
    textClass: 'text-indigo-950 font-bold',
    borderClass: 'border-indigo-300',
    badge: 'bg-indigo-100 text-indigo-950 border-indigo-400 font-bold',
  },
  {
    id: 'purple',
    name: 'Tím Đêm',
    dotColor: 'bg-purple-700',
    bgClass: 'bg-purple-900/15',
    textClass: 'text-purple-950 font-bold',
    borderClass: 'border-purple-300',
    badge: 'bg-purple-900 text-purple-50 border-purple-950 font-bold shadow-xs',
  },
  {
    id: 'violet',
    name: 'Tím Violet',
    dotColor: 'bg-violet-600',
    bgClass: 'bg-violet-50/80',
    textClass: 'text-violet-950 font-bold',
    borderClass: 'border-violet-300',
    badge: 'bg-violet-100 text-violet-950 border-violet-400 font-bold',
  },
  {
    id: 'teal',
    name: 'Xanh Ngọc',
    dotColor: 'bg-teal-600',
    bgClass: 'bg-teal-50/80',
    textClass: 'text-teal-950 font-bold',
    borderClass: 'border-teal-300',
    badge: 'bg-teal-100 text-teal-950 border-teal-400 font-bold',
  },
  {
    id: 'cyan',
    name: 'Xanh Biển Sáng',
    dotColor: 'bg-cyan-600',
    bgClass: 'bg-cyan-50/80',
    textClass: 'text-cyan-950 font-bold',
    borderClass: 'border-cyan-300',
    badge: 'bg-cyan-100 text-cyan-950 border-cyan-400 font-bold',
  },
  {
    id: 'emerald',
    name: 'Xanh Lục Bảo',
    dotColor: 'bg-emerald-600',
    bgClass: 'bg-emerald-50/80',
    textClass: 'text-emerald-950 font-bold',
    borderClass: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold',
  },
  {
    id: 'lime',
    name: 'Xanh Cốm',
    dotColor: 'bg-lime-600',
    bgClass: 'bg-lime-50/80',
    textClass: 'text-lime-950 font-bold',
    borderClass: 'border-lime-300',
    badge: 'bg-lime-100 text-lime-950 border-lime-400 font-bold',
  },
  {
    id: 'green',
    name: 'Xanh Rừng',
    dotColor: 'bg-green-700',
    bgClass: 'bg-green-50/80',
    textClass: 'text-green-950 font-bold',
    borderClass: 'border-green-300',
    badge: 'bg-green-100 text-green-950 border-green-500 font-bold',
  },
  {
    id: 'rose',
    name: 'Đỏ Hồng',
    dotColor: 'bg-rose-500',
    bgClass: 'bg-rose-50/80',
    textClass: 'text-rose-950 font-bold',
    borderClass: 'border-rose-300',
    badge: 'bg-rose-100 text-rose-950 border-rose-400 font-bold',
  },
  {
    id: 'red',
    name: 'Đỏ Tươi',
    dotColor: 'bg-red-600',
    bgClass: 'bg-red-50/80',
    textClass: 'text-red-950 font-bold',
    borderClass: 'border-red-300',
    badge: 'bg-red-100 text-red-950 border-red-400 font-bold',
  },
  {
    id: 'fuchsia',
    name: 'Hồng Cánh Sen',
    dotColor: 'bg-fuchsia-600',
    bgClass: 'bg-fuchsia-50/80',
    textClass: 'text-fuchsia-950 font-bold',
    borderClass: 'border-fuchsia-300',
    badge: 'bg-fuchsia-100 text-fuchsia-950 border-fuchsia-400 font-bold',
  },
  {
    id: 'pink',
    name: 'Hồng Phấn',
    dotColor: 'bg-pink-600',
    bgClass: 'bg-pink-50/80',
    textClass: 'text-pink-950 font-bold',
    borderClass: 'border-pink-300',
    badge: 'bg-pink-100 text-pink-950 border-pink-400 font-bold',
  },
  {
    id: 'slate',
    name: 'Xám Bạc',
    dotColor: 'bg-slate-500',
    bgClass: 'bg-slate-100/80',
    textClass: 'text-slate-800 font-bold',
    borderClass: 'border-slate-300',
    badge: 'bg-slate-200 text-slate-800 border-slate-300 font-bold',
  },
  {
    id: 'dark',
    name: 'Đen Dạ Quang',
    dotColor: 'bg-slate-400',
    bgClass: 'bg-slate-900/15',
    textClass: 'text-slate-950 font-bold',
    borderClass: 'border-slate-400',
    badge: 'bg-slate-900 text-white border-slate-700 font-bold',
  },
];

export function ManageShiftsModal({ isOpen, onClose }: ManageShiftsModalProps) {
  const { shiftsConfig, saveShiftConfig, deleteShiftConfig, resetShiftsConfig } = useApp();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [customTimeRange, setCustomTimeRange] = useState('');
  const [hasNoTime, setHasNoTime] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState('blue');
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (!isOpen) return null;

  const currentTheme = COLOR_THEMES.find((t) => t.id === selectedThemeId) || COLOR_THEMES[0];

  // Helper format time display: "08:00" -> "8h", "08:30" -> "8h30"
  const formatHourMinute = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hNum = parseInt(h, 10);
    const mNum = parseInt(m, 10);
    if (isNaN(hNum)) return timeStr;
    return mNum > 0 ? `${hNum}h${mNum < 10 ? '0' + mNum : mNum}` : `${hNum}h`;
  };

  const computedTimeRange = hasNoTime
    ? (customTimeRange.trim() || 'Nghỉ')
    : customTimeRange.trim()
    ? customTimeRange.trim()
    : `${formatHourMinute(startTime)} - ${formatHourMinute(endTime)}`;

  const handleStartEdit = (shift: ShiftInfo) => {
    setEditingId(shift.id);
    setName(shift.name);
    setShortName(shift.shortName || shift.name);
    setStartTime(shift.startTime || '07:30');
    setEndTime(shift.endTime || '16:00');
    setCustomTimeRange(shift.timeRange);
    setHasNoTime(Boolean(shift.hasNoTime) || shift.id === 'OFF' || shift.id === 'OFF_HALF' || (!shift.startTime && !shift.endTime));

    // Guess theme
    const matchedTheme =
      COLOR_THEMES.find((t) => shift.badge.includes(t.id)) ||
      COLOR_THEMES.find((t) => shift.dotColor.includes(t.id)) ||
      COLOR_THEMES[0];
    setSelectedThemeId(matchedTheme.id);
    setIsFormOpen(true);
  };

  const handleResetForm = () => {
    setEditingId(null);
    setName('');
    setShortName('');
    setStartTime('08:00');
    setEndTime('17:00');
    setCustomTimeRange('');
    setHasNoTime(false);
    setSelectedThemeId('blue');
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const id = editingId || `CA_${Date.now()}`;
    const newShift: ShiftInfo = {
      id,
      name: name.trim(),
      shortName: (shortName.trim() || name.trim()).slice(0, 15),
      timeRange: computedTimeRange,
      startTime: hasNoTime ? undefined : startTime,
      endTime: hasNoTime ? undefined : endTime,
      hasNoTime,
      dotColor: currentTheme.dotColor,
      bgClass: currentTheme.bgClass,
      textClass: currentTheme.textClass,
      borderClass: currentTheme.borderClass,
      badge: currentTheme.badge,
      isSystem: editingId ? shiftsConfig.find((s) => s.id === editingId)?.isSystem : false,
    };

    saveShiftConfig(newShift);
    handleResetForm();
  };

  const handleDelete = (shift: ShiftInfo) => {
    if (shift.id === 'OFF') {
      alert('Không thể xoá chế độ nghỉ mặc định của hệ thống.');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xoá ca "${shift.name}" không?`)) {
      deleteShiftConfig(shift.id);
      if (editingId === shift.id) {
        handleResetForm();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Tạo & Quản Lý Ca Làm Việc
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Quản Trị Viên
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Cấu hình danh mục ca trực, thời gian bắt đầu & kết thúc ca của Bộ Phận RM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Action Bar / Form Toggle */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Danh Sách Ca Làm Việc ({shiftsConfig.length})
              </h4>
              <p className="text-xs text-slate-500">
                Các ca này sẽ hiển thị trên lịch trực tuần và popover phân ca
              </p>
            </div>
            {!isFormOpen ? (
              <button
                onClick={() => {
                  handleResetForm();
                  setIsFormOpen(true);
                }}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm Ca Mới</span>
              </button>
            ) : (
              <button
                onClick={handleResetForm}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0"
              >
                Đóng form tạo ca
              </button>
            )}
          </div>

          {/* Form Create / Edit Shift */}
          {isFormOpen && (
            <form
              onSubmit={handleSubmit}
              className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>{editingId ? 'Chỉnh Sửa Ca Làm Việc' : 'Tạo Ca Làm Việc Mới'}</span>
                </span>
                {editingId && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900">
                    Mã: {editingId}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Tên ca */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên ca làm việc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Ca Sáng Sớm, Ca Tăng Ca, Ca Đêm 2..."
                    className="w-full text-xs font-semibold bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tên viết tắt */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên viết tắt (hiển thị trên thẻ)
                  </label>
                  <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="VD: Sớm, TC, Đêm 2..."
                    className="w-full text-xs font-semibold bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Chế độ nghỉ / Không ghi thời gian (Trao quyền cho Quản trị viên) */}
              <div className="p-3 bg-white rounded-xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    id="hasNoTimeCheckbox"
                    checked={hasNoTime}
                    onChange={(e) => setHasNoTime(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="hasNoTimeCheckbox" className="text-xs font-extrabold text-slate-800 cursor-pointer select-none">
                    Chế độ nghỉ &bull; Không ghi mốc thời gian cụ thể
                  </label>
                </div>
                <span className="text-[10.5px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 self-start sm:self-auto">
                  {hasNoTime ? '✓ Không ghi giờ bắt đầu & kết thúc' : 'Có áp dụng khung giờ làm việc'}
                </span>
              </div>

              {/* Khung giờ hoặc Ghi chú chế độ nghỉ */}
              {!hasNoTime ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giờ bắt đầu
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full text-xs font-semibold bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Giờ kết thúc
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full text-xs font-semibold bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Chuỗi hiển thị khung giờ (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={customTimeRange}
                      onChange={(e) => setCustomTimeRange(e.target.value)}
                      placeholder={`Tự động: ${computedTimeRange}`}
                      className="w-full text-xs font-semibold bg-white rounded-xl px-3 py-2 border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
                  <div className="text-amber-950">
                    <span className="font-extrabold flex items-center space-x-1.5">
                      <span>🏷️ Ghi chú phụ cho chế độ nghỉ (tùy chọn):</span>
                    </span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Ca này sẽ <strong>không hiển thị mốc giờ</strong> trên bảng lịch. Bạn có thể để trống hoặc ghi nhãn phụ.
                    </p>
                  </div>
                  <div className="w-full sm:w-64 shrink-0">
                    <input
                      type="text"
                      value={customTimeRange}
                      onChange={(e) => setCustomTimeRange(e.target.value)}
                      placeholder="VD: Nghỉ 1/2, Nghỉ phép, Nghỉ ca..."
                      className="w-full text-xs font-semibold bg-white rounded-xl px-3 py-2 border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Màu sắc nhận diện */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">
                    Chọn màu sắc nhận diện ca ({COLOR_THEMES.length} màu tương phản cao):
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Bấm chọn màu để áp dụng</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-52 overflow-y-auto p-2 bg-white/70 border border-slate-200 rounded-xl">
                  {COLOR_THEMES.map((theme) => {
                    const isSelected = selectedThemeId === theme.id;
                    return (
                      <button
                        type="button"
                        key={theme.id}
                        onClick={() => setSelectedThemeId(theme.id)}
                        className={`p-2 rounded-xl border flex items-center space-x-2 transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'border-indigo-600 bg-white ring-2 ring-indigo-500 shadow-sm font-bold'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${theme.dotColor} shrink-0 ring-1 ring-black/10`} />
                        <span className="text-xs font-semibold text-slate-800 truncate">{theme.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="bg-white p-3.5 rounded-xl border border-indigo-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Xem trước hiển thị:
                  </span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${currentTheme.dotColor}`} />
                    <span className="font-bold text-xs text-slate-900">
                      {name.trim() || 'Tên Ca Mới'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ({computedTimeRange})
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${currentTheme.badge}`}>
                  {shortName.trim() || name.trim() || 'Mẫu Ca'}
                </span>
              </div>

              {/* Form buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Cập Nhật Ca Làm Việc' : 'Lưu & Kích Hoạt Ca'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Existing Shifts List */}
          <div className="space-y-2.5">
            {shiftsConfig.map((shift, idx) => (
              <div
                key={shift.id}
                className={`p-3 sm:p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  shift.bgClass
                } ${shift.borderClass}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                    <span className={`w-3 h-3 rounded-full ${shift.dotColor} shrink-0`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900">
                        {shift.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${shift.badge}`}>
                        {shift.shortName || shift.name}
                      </span>
                      {shift.isSystem && (
                        <span className="text-[9px] font-semibold text-slate-500 bg-white/70 px-1.5 py-0.2 rounded border border-slate-200">
                          Hệ thống
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                      Khung giờ:{' '}
                      {shift.hasNoTime ? (
                        <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          Chế độ nghỉ &bull; Không ghi thời gian
                        </span>
                      ) : (
                        <>
                          <strong>{shift.timeRange}</strong>
                          {shift.startTime && shift.endTime && ` (${shift.startTime} đến ${shift.endTime})`}
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Operations */}
                <div className="flex items-center space-x-1.5 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => handleStartEdit(shift)}
                    title="Chỉnh sửa ca làm việc này"
                    className="p-1.5 rounded-lg bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {!shift.isSystem && (
                    <button
                      onClick={() => handleDelete(shift)}
                      title="Xoá ca này"
                      className="p-1.5 rounded-lg bg-white text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reset to defaults helper */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <span>Chỉ Quản Trị Viên mới có quyền cấu hình ca làm việc.</span>
            </span>

            <button
              onClick={() => {
                if (confirm('Khôi phục lại danh sách 5 ca chuẩn ban đầu của hệ thống?')) {
                  resetShiftsConfig();
                  handleResetForm();
                }
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Khôi phục mặc định</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
