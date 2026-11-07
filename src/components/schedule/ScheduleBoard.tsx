'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { ShiftId, SHIFTS_CONFIG, User } from '@/types';
import { canArrangeSchedule, canApproveSchedule, canViewSchedule } from '@/utils/permissions';
import { getPersonalName } from '@/utils/nameHelper';
import { exportShiftScheduleToExcel } from '@/utils/excelExport';
import { ManageShiftsModal } from './ManageShiftsModal';
import { WeeklySchedulePlannerModal } from './WeeklySchedulePlannerModal';
import {
  Calendar,
  Clock,
  Sunrise,
  Sunset,
  Moon,
  Coffee,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Users,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Filter,
  CheckCircle2,
  CalendarDays,
  ShieldCheck,
  Building,
  Bell,
  Send,
  FileCheck,
} from 'lucide-react';

export function ScheduleBoard() {
  const {
    users,
    teams,
    shifts,
    shiftsConfig,
    shiftsConfigMap,
    currentUser,
    assignShift,
    bulkAssignShifts,
    getScheduleApproval,
    submitScheduleForApproval,
    approveSchedule,
    rejectSchedule,
  } = useApp();

  const [isManageShiftsOpen, setIsManageShiftsOpen] = useState(false);

  // Selected week's Monday (default to current week's Monday)
  const [currentMonday, setCurrentMonday] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sun, 1 is Mon...
    const diff = (day + 6) % 7;
    const mon = new Date(today);
    mon.setDate(today.getDate() - diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  });

  // Filters
  const [isExporting, setIsExporting] = useState(false);

  // Quick edit popover state
  const [editingCell, setEditingCell] = useState<{
    userId: string;
    dateStr: string;
    userName: string;
    currentShiftId: ShiftId;
    isHalfDay?: boolean;
  } | null>(null);

  // Weekly schedule planner modal for next week
  const [isPlannerModalOpen, setIsPlannerModalOpen] = useState(false);

  // Mobile active day index (0 = Monday, ..., 6 = Sunday)
  const todayDay = new Date().getDay();
  const todayMondayIndex = (todayDay + 6) % 7;
  const [mobileActiveDayIdx, setMobileActiveDayIdx] = useState<number>(todayMondayIndex);

  // Phân quyền chuẩn: CHỈ CÓ Cấp Nhân Viên Điều Phối mới được thực hiện sắp xếp ca làm việc
  const canArrange = canArrangeSchedule(currentUser);
  const canApprove = canApproveSchedule(currentUser);
  const canEdit = canArrange; // Cấp khác chỉ có quyền xem

  // Generate 7 days of the selected week
  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = new Date().toISOString().split('T')[0] === dateStr;
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    const fullDayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    return {
      index: i,
      name: dayNames[i],
      fullName: fullDayNames[i],
      date: d,
      dateStr,
      isToday,
      dayNumber: d.getDate(),
      monthNumber: d.getMonth() + 1,
    };
  });

  // Mốc thứ 2 của tuần hiện tại
  const thisWeekMonday = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = (day + 6) % 7;
    const mon = new Date(today);
    mon.setDate(today.getDate() - diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }, []);

  // Mốc thứ 2 của tuần sau (giới hạn tương lai tối đa: không hiển thị các tuần xa hơn tuần sau)
  const nextWeekMonday = useMemo(() => {
    const nextMon = new Date(thisWeekMonday);
    nextMon.setDate(thisWeekMonday.getDate() + 7);
    return nextMon;
  }, [thisWeekMonday]);

  const thisMondayTime = thisWeekMonday.getTime();
  const nextMondayTime = nextWeekMonday.getTime();
  const currentMondayTime = currentMonday.getTime();

  // Xác định tuần đang chọn: Quá khứ, Hiện tại, hay Tuần sau
  const isPastWeek = currentMondayTime < thisMondayTime;
  const isCurrentWeek = currentMondayTime === thisMondayTime;
  const isNextWeek = currentMondayTime === nextMondayTime;

  // Kiểm tra xem tuần sau đã lên lịch chưa (phân ca & phê duyệt)
  const nextWeekMondayStr = nextWeekMonday.toISOString().split('T')[0];
  const nextWeekSundayDate = new Date(nextWeekMonday);
  nextWeekSundayDate.setDate(nextWeekMonday.getDate() + 6);
  const nextWeekSundayStr = nextWeekSundayDate.toISOString().split('T')[0];

  const hasShiftsInNextWeek = shifts.some(
    (s) => s.date >= nextWeekMondayStr && s.date <= nextWeekSundayStr
  );
  const nextWeekApproval = getScheduleApproval(nextWeekMondayStr);
  const isNextWeekApproved = nextWeekApproval?.status === 'APPROVED';

  // Điều kiện được xem tuần sau:
  // - Cấp Nhân Viên Điều Phối: Luôn được vào tuần sau để sắp xếp / lên lịch ca làm việc
  // - Cấp Quản Lý (Anh Xa / Anh Vũ): Được vào tuần sau nếu đã có lịch lên / chờ duyệt / đã duyệt
  // - Cấp 3 (Giám Sát) & Cấp 4 (Nhân Viên): CHỈ XEM ĐƯỢC tuần sau NẾU lịch tuần sau ĐÃ LÊN và ĐÃ ĐƯỢC PHÊ DUYỆT
  const canViewNextWeek = canArrange
    ? true
    : canApprove
    ? hasShiftsInNextWeek || nextWeekApproval?.status === 'PENDING_APPROVAL' || isNextWeekApproved
    : hasShiftsInNextWeek && isNextWeekApproved;

  // Điều kiện được phép bấm nút sang tuần tiếp theo (>):
  // 1. Nếu đang ở các lịch đã qua (< tuần hiện tại): Luôn được bấm tới để di chuyển về phía tuần hiện tại
  // 2. Nếu đang ở tuần hiện tại: Chỉ được bấm tới tuần sau NẾU tuần sau đã lên lịch
  // 3. Nếu đang ở tuần sau (hoặc xa hơn): TUYỆT ĐỐI KHÔNG HIỂN THỊ CÁC TUẦN XA HƠN TUẦN SAU (bị vô hiệu hóa hoàn toàn)
  const canGoNext = isPastWeek ? true : isCurrentWeek ? canViewNextWeek : false;

  // Week navigation
  // Chỉ xem được các lịch đã qua: Nút lùi về tuần trước luôn khả dụng
  const goToPreviousWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(currentMonday.getDate() - 7);
    setCurrentMonday(prev);
  };

  const goToNextWeek = () => {
    if (!canGoNext) return;
    const next = new Date(currentMonday);
    next.setDate(currentMonday.getDate() + 7);
    // Khóa cứng không cho vượt quá tuần sau
    if (next.getTime() > nextMondayTime) {
      setCurrentMonday(nextWeekMonday);
      return;
    }
    setCurrentMonday(next);
  };

  const goToThisWeek = () => {
    setCurrentMonday(new Date(thisWeekMonday));
  };

  // Đảm bảo không bao giờ ở tuần xa hơn tuần sau hoặc tuần sau khi chưa lên lịch
  useEffect(() => {
    if (currentMonday.getTime() > nextMondayTime) {
      setCurrentMonday(nextWeekMonday);
    } else if (currentMonday.getTime() === nextMondayTime && !canViewNextWeek) {
      setCurrentMonday(thisWeekMonday);
    }
  }, [currentMonday, nextMondayTime, canViewNextWeek, thisWeekMonday, nextWeekMonday]);

  // Staff list (Cấp 3 Giám sát và Cấp 4 Kỹ thuật viên - Loại bỏ tài khoản Quản trị viên)
  const operationalStaff = users.filter(
    (u) => u.role !== 'ADMIN' && (u.role === 'STAFF' || u.level === 'LEVEL_3_LEAD' || u.level === 'LEVEL_4_STAFF')
  );
  const filteredStaff = operationalStaff;

  // Handle Export Excel
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      await exportShiftScheduleToExcel({
        weekMonday: currentMonday,
        teams,
        users,
        shifts,
        exportedByName: currentUser.name,
      });
    } catch (e) {
      console.error('Error exporting shifts to excel:', e);
      alert('Có lỗi xảy ra khi xuất file Excel lịch phân ca.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Quick Change Shift
  const handleSelectShift = (shiftId: ShiftId) => {
    if (!editingCell) return;
    const finalHalfDay = shiftId === 'OFF' ? false : !!editingCell.isHalfDay;
    assignShift(editingCell.userId, editingCell.dateStr, shiftId, undefined, finalHalfDay);
    setEditingCell(null);
  };

  const handleToggleEditingHalfDay = () => {
    if (!editingCell) return;
    if (editingCell.currentShiftId === 'OFF') return;
    const newHalfDay = !editingCell.isHalfDay;
    assignShift(editingCell.userId, editingCell.dateStr, editingCell.currentShiftId, undefined, newHalfDay);
    setEditingCell((prev) => (prev ? { ...prev, isHalfDay: newHalfDay } : null));
  };

  // Find current user's shift for today
  const todayStr = new Date().toISOString().split('T')[0];
  const myShiftToday = shifts.find((s) => s.userId === currentUser.id && s.date === todayStr);
  const myShiftConfig = myShiftToday ? shiftsConfigMap[myShiftToday.shiftId] || SHIFTS_CONFIG[myShiftToday.shiftId] : null;

  // Trạng thái phê duyệt lịch làm việc của tuần đang chọn
  const mondayDateStr = daysOfWeek[0].dateStr;
  const approval = getScheduleApproval(mondayDateStr);
  const isApproved = approval.status === 'APPROVED';
  const isPending = approval.status === 'PENDING_APPROVAL';
  const isDraft = !approval || approval.status === 'DRAFT';
  const isFriday = new Date().getDay() === 5;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Header Banner: Lịch Làm Việc */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl shadow-blue-700/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Lịch Làm Việc
          </h2>

          {/* Action buttons (Chỉ Cấp Nhân Viên Điều Phối mới có quyền phân ca và xuất Excel) */}
          {canArrange && (
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <button
                onClick={() => setIsPlannerModalOpen(true)}
                className="flex items-center space-x-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>⚡ Lên Lịch Làm Việc Tuần Tới</span>
              </button>

              {(!isApproved || isDraft) && (
                <button
                  onClick={() => {
                    submitScheduleForApproval(mondayDateStr);
                    alert('Đã gửi yêu cầu phê duyệt lịch làm việc thành công đến Cấp Quản Lý!');
                  }}
                  className="flex items-center space-x-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl backdrop-blur-sm border border-white/20 shadow-sm transition-all active:scale-95"
                >
                  <Send className="w-4 h-4 text-amber-300" />
                  <span>Gửi Quản Lý Phê Duyệt</span>
                </button>
              )}

              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="flex items-center space-x-1.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl backdrop-blur-sm border border-white/20 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                <span>{isExporting ? 'Đang xuất...' : 'Xuất Lịch Ca Excel'}</span>
              </button>
            </div>
          )}

          {/* Nút Tạo & Quản Lý Ca Làm Việc dành riêng cho Quản Trị Viên */}
          {currentUser.role === 'ADMIN' && (
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <button
                onClick={() => setIsManageShiftsOpen(true)}
                className="flex items-center space-x-1.5 bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>⚙️ Tạo & Quản Lý Ca ({shiftsConfig.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Ca làm việc hôm nay của bạn */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full ${myShiftConfig ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
            <span>
              Ca làm việc hôm nay của bạn ({new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}):
            </span>
            {myShiftConfig ? (
              <span className="font-extrabold text-amber-300 uppercase tracking-wide bg-white/10 px-2 py-0.5 rounded">
                {myShiftConfig.name} ({myShiftConfig.timeRange})
              </span>
            ) : (
              <span className="font-medium text-blue-100 bg-white/10 px-2 py-0.5 rounded italic">
                Chưa có ca trực hôm nay
              </span>
            )}
          </div>
          {myShiftToday?.note && (
            <span className="text-[11px] text-blue-200 italic">Ghi chú: {myShiftToday.note}</span>
          )}
        </div>
      </div>

      {/* Lịch nhắc nhở Thứ Sáu hàng tuần (đặt riêng cho cấp Nhân Viên Điều Phối) */}
      {canArrange && (
        isFriday ? (
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-amber-300 shadow-md animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600/30 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-amber-950 animate-bounce" />
              </div>
              <div>
                <p className="font-extrabold text-xs sm:text-sm uppercase tracking-wide">
                  HÔM NAY LÀ THỨ SÁU &mdash; ĐÃ ĐẾN HẠN LÊN LỊCH LÀM VIỆC TUẦN TỚI!
                </p>
                <p className="text-[11px] sm:text-xs text-amber-950/90 mt-0.5">
                  Nhân Viên Điều Phối vui lòng hoàn tất sắp xếp ca làm việc cho cả team và nhấn <strong>&ldquo;Gửi Cấp Quản Lý Phê Duyệt&rdquo;</strong> trước 17:00.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentMonday(nextWeekMonday)}
              disabled={isNextWeek}
              className={`font-bold text-xs px-3.5 py-2 rounded-xl transition-all self-end sm:self-auto shrink-0 shadow-sm ${
                isNextWeek
                  ? 'bg-amber-600/30 text-amber-950/60 cursor-default'
                  : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95 cursor-pointer'
              }`}
            >
              {isNextWeek ? '✓ Đang Xem Tuần Tới' : 'Chuyển Sang Tuần Tới →'}
            </button>
          </div>
        ) : (
          <div className="bg-blue-50/90 border border-blue-200 text-blue-900 p-3 rounded-2xl flex items-center space-x-2.5 text-xs">
            <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Lịch Nhắc Nhở Định Kỳ:</strong> Lịch làm việc tuần mới sẽ được <strong>Nhân Viên Điều Phối</strong> sắp xếp và gửi duyệt vào ngày <strong>Thứ Sáu hằng tuần</strong> để Cấp Quản Lý phê duyệt trước tuần làm việc mới.
            </span>
          </div>
        )
      )}

      {/* Schedule Approval & Workflow Banner */}
      {canApprove && isPending && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs sm:text-sm text-purple-900">Yêu Cầu Phê Duyệt Lịch Làm Việc Tuần Này</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                  Chờ Cấp Quản Lý Duyệt
                </span>
              </div>
              <p className="text-[11px] text-purple-700 mt-0.5">
                Nhân Viên Điều Phối ({approval.submittedByName || 'Nguyên'}) đã hoàn thành sắp xếp ca và gửi lúc{' '}
                {approval.submittedAt ? new Date(approval.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''} ngày{' '}
                {approval.submittedAt ? new Date(approval.submittedAt).toLocaleDateString('vi-VN') : ''}.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => {
                if (confirm('Yêu cầu Nhân Viên Điều Phối điều chỉnh lại phân ca?')) {
                  rejectSchedule(mondayDateStr, 'Cần điều chỉnh lại phân ca làm việc');
                }
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-all shadow-xs"
            >
              ↩ Yêu Cầu Chỉnh Sửa
            </button>
            <button
              onClick={() => {
                approveSchedule(mondayDateStr);
                alert('Lịch làm việc mới đã được cập nhật, vui lòng kiểm tra ca trực của bạn.');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md active:scale-95 flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>✓ Phê Duyệt Lịch Làm Việc</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Week Navigator Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Nút lùi: Luôn cho phép xem lại các lịch đã qua */}
          <button
            onClick={goToPreviousWeek}
            title="Xem tuần trước (lịch đã qua)"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={goToThisWeek}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              isCurrentWeek
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Tuần Hiện Tại
          </button>

          {/* Nút tiến: Chỉ tới tuần sau nếu lịch đã lên; Không bao giờ vượt xa hơn tuần sau */}
          <button
            onClick={goToNextWeek}
            disabled={!canGoNext}
            title={
              isNextWeek
                ? 'Không hiển thị các tuần xa hơn tuần sau'
                : !canViewNextWeek
                ? 'Lịch tuần sau chưa lên'
                : 'Xem tuần sau'
            }
            className={`p-2 rounded-xl transition-colors ${
              canGoNext
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer active:scale-95'
                : 'bg-slate-100/50 text-slate-300 cursor-not-allowed opacity-40'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs sm:text-sm font-bold text-slate-900 ml-1">
            {daysOfWeek[0].dayNumber}/{daysOfWeek[0].monthNumber} &ndash; {daysOfWeek[6].dayNumber}/{daysOfWeek[6].monthNumber}/{daysOfWeek[6].date.getFullYear()}
          </span>

          {/* Huy hiệu định danh trạng thái tuần */}
          {isCurrentWeek ? (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Tuần Hiện Tại
            </span>
          ) : isNextWeek ? (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              Tuần Sau {isNextWeekApproved ? '✓ Đã Phê Duyệt' : '(Đang Sắp Ca)'}
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Lịch Đã Qua
            </span>
          )}
        </div>

        {/* Thông báo nhắc trạng thái điều hướng */}
        <div className="text-[11px] text-slate-500 font-medium self-end sm:self-auto">
          {isNextWeek ? (
            <span className="text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
              Giới hạn tối đa (không hiển thị xa hơn)
            </span>
          ) : isCurrentWeek && !canViewNextWeek ? (
            <span className="text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
              Lịch tuần sau chưa lên
            </span>
          ) : isPastWeek ? (
            <span className="text-slate-500 italic">
              Đang xem lưu trữ lịch đã qua
            </span>
          ) : null}
        </div>
      </div>

      {/* 3. Mobile View: Day Carousel + List by Shift */}
      <div className="lg:hidden space-y-3">
        {/* Day selector tabs */}
        <div className="grid grid-cols-7 gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm text-center">
          {daysOfWeek.map((day) => {
            const isSelected = mobileActiveDayIdx === day.index;
            return (
              <button
                key={day.index}
                onClick={() => setMobileActiveDayIdx(day.index)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="text-[10px] leading-tight">{day.name}</span>
                <span className="text-xs font-bold leading-tight mt-0.5">{day.dayNumber}</span>
                {day.isToday && (
                  <span className={`w-1 h-1 rounded-full mt-1 ${isSelected ? 'bg-amber-300' : 'bg-blue-600'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Day Details for Selected Day */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Lịch trực {daysOfWeek[mobileActiveDayIdx].fullName} ({daysOfWeek[mobileActiveDayIdx].dayNumber}/{daysOfWeek[mobileActiveDayIdx].monthNumber})
              </h3>
              <p className="text-[11px] text-slate-400">
                {canEdit ? 'Nhấp vào nhân sự để đổi ca nhanh' : 'Danh sách nhân sự phân theo ca trực'}
              </p>
            </div>
            {canEdit && (
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                Chạm để đổi ca
              </span>
            )}
          </div>

          {/* Group staff by shift for this mobile day */}
          <div className="space-y-3">
            {filteredStaff.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs">
                Chưa có nhân viên hoặc giám sát nào trong hệ thống. Hãy vào mục <span className="font-semibold text-slate-700">Tổ & Nhân Sự</span> để thêm nhân sự.
              </div>
            ) : (
              shiftsConfig.map((sc) => {
                const sid = sc.id;
                const selectedDateStr = daysOfWeek[mobileActiveDayIdx].dateStr;
                const staffInShift = filteredStaff.filter((u) => {
                  const shift = shifts.find((s) => s.userId === u.id && s.date === selectedDateStr);
                  return shift ? shift.shiftId === sid : sid === 'OFF';
                });

                if (staffInShift.length === 0) return null;

                return (
                  <div key={sid} className={`rounded-xl p-3 border ${sc.bgClass} ${sc.borderClass}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5 font-bold text-xs">
                        <span className={`w-2 h-2 rounded-full ${sc.dotColor}`} />
                        <span className={sc.textClass}>{sc.name}</span>
                        {!sc.hasNoTime && <span className="text-[11px] opacity-75 font-normal">({sc.timeRange})</span>}
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 text-slate-700 shadow-xs">
                        {staffInShift.length} người
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {staffInShift.map((user) => {
                        const userTeam = teams.find((t) => t.memberIds.includes(user.id));
                        const userShift = shifts.find((s) => s.userId === user.id && s.date === selectedDateStr);
                        const isUserHalfDay = !!userShift?.isHalfDay;

                        return (
                          <div
                            key={user.id}
                            onClick={() => {
                              if (canEdit) {
                                setEditingCell({
                                  userId: user.id,
                                  userName: user.name,
                                  dateStr: selectedDateStr,
                                  currentShiftId: sid,
                                  isHalfDay: isUserHalfDay,
                                });
                              }
                            }}
                            className={`bg-white rounded-lg p-2.5 border border-slate-200/80 shadow-xs flex items-center justify-between transition-all ${
                              canEdit ? 'cursor-pointer hover:border-blue-400 hover:shadow-sm active:scale-98' : ''
                            }`}
                          >
                            <div className="truncate">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <p className="font-bold text-xs text-slate-900 truncate">
                                  {getPersonalName(user.name)}
                                </p>
                                {user.employeeId && (
                                  <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                                    ID: {user.employeeId}
                                  </span>
                                )}
                                {isUserHalfDay && (
                                  <span className="text-[8.5px] font-black bg-amber-400 text-amber-950 px-1.5 py-0.2 rounded shadow-2xs">
                                    Nghỉ 1/2 Ca
                                  </span>
                                )}
                              </div>
                              {userTeam && (
                                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                  {userTeam.name}
                                </p>
                              )}
                            </div>

                            {canEdit && (
                              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                                Đổi
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 4. Desktop & Tablet: Full Weekly Matrix Table */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <th className="px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider w-12 text-center">
                  STT
                </th>
                <th className="px-4 py-3.5 font-bold uppercase text-[10px] tracking-wider min-w-[200px]">
                  Nhân Viên & Tổ Đội
                </th>
                {daysOfWeek.map((day) => (
                  <th
                    key={day.index}
                    className={`px-3 py-3 font-bold text-center border-l border-slate-200 min-w-[130px] ${
                      day.isToday ? 'bg-blue-50/80 text-blue-900' : 'text-slate-800'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] uppercase tracking-wider font-extrabold">{day.name}</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {day.dayNumber}/{day.monthNumber}
                      </span>
                      {day.isToday && (
                        <span className="mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-600 text-white">
                          Hôm nay
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-xs">
                    Chưa có nhân viên hoặc giám sát nào. Hãy vào mục <span className="font-semibold text-slate-700">Tổ & Nhân Sự</span> để thêm nhân sự mới.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((user, idx) => {
                const userTeam = teams.find((t) => t.memberIds.includes(user.id));
                const isCurrentUser = user.id === currentUser.id;

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50/60 transition-colors ${
                      isCurrentUser ? 'bg-amber-50/30 font-medium' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="truncate">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-xs truncate">
                            {getPersonalName(user.name)}
                          </span>
                          {user.employeeId && (
                            <span className="text-[9px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              ID: {user.employeeId}
                            </span>
                          )}
                          {isCurrentUser && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              Bạn
                            </span>
                          )}
                        </div>
                        {userTeam && (
                          <p className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                            {userTeam.name}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* 7 Day cells */}
                    {daysOfWeek.map((day) => {
                      const shift = shifts.find((s) => s.userId === user.id && s.date === day.dateStr);
                      const shiftId: ShiftId = shift ? shift.shiftId : 'OFF';
                      const isShiftHalfDay = !!shift?.isHalfDay;
                      const conf = shiftsConfigMap[shiftId] || SHIFTS_CONFIG[shiftId] || SHIFTS_CONFIG.OFF;

                      return (
                        <td
                          key={day.index}
                          className={`px-2 py-2 text-center border-l border-slate-100 relative group ${
                            day.isToday ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <button
                            onClick={() => {
                              if (canEdit) {
                                setEditingCell({
                                  userId: user.id,
                                  userName: user.name,
                                  dateStr: day.dateStr,
                                  currentShiftId: shiftId,
                                  isHalfDay: isShiftHalfDay,
                                });
                              }
                            }}
                            disabled={!canEdit}
                            title={
                              canEdit
                                ? `Bấm để đổi ca cho ${getPersonalName(user.name)} (${day.fullName})`
                                : `${conf.name} (${conf.timeRange})${isShiftHalfDay ? ' - Nghỉ 1/2 Ca' : ''}`
                            }
                            className={`w-full py-1.5 px-2 rounded-xl text-left border transition-all flex flex-col justify-between ${
                              conf.badge
                            } ${
                              canEdit
                                ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer active:scale-95'
                                : 'cursor-default'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-[11px] leading-tight truncate">
                                {conf.shortName}
                              </span>
                              <span className={`w-2 h-2 rounded-full ${conf.dotColor} shrink-0 ring-1 ring-black/10`} />
                            </div>
                            {isShiftHalfDay && (
                              <span className="text-[8px] bg-amber-400 text-amber-950 font-black px-1.5 py-0.2 rounded shadow-2xs leading-none my-0.5 self-start">
                                Nghỉ 1/2 Ca
                              </span>
                            )}
                            {!conf.hasNoTime && conf.timeRange && (
                              <span className="text-[9px] opacity-90 truncate mt-0.5 font-bold">
                                {conf.timeRange}
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>

            {/* Daily Total Personnel on Duty Summary Footer */}
            <tfoot>
              <tr className="bg-slate-100/80 border-t-2 border-slate-200 text-slate-800 text-[10px] font-bold">
                <td colSpan={2} className="px-4 py-3 text-right uppercase tracking-wider font-extrabold text-slate-600">
                  Tổng Quân Số Trực Ca:
                </td>
                {daysOfWeek.map((day) => {
                  const dayShifts = filteredStaff.map((u) => {
                    const s = shifts.find((item) => item.userId === u.id && item.date === day.dateStr);
                    return s ? s.shiftId : 'OFF';
                  });

                  const countHC = dayShifts.filter((sid) => sid === 'HANH_CHINH').length;
                  const countC1 = dayShifts.filter((sid) => sid === 'CA_1').length;
                  const countC2 = dayShifts.filter((sid) => sid === 'CA_2').length;
                  const countC3 = dayShifts.filter((sid) => sid === 'CA_3').length;
                  const countOffHalf = filteredStaff.filter((u) => {
                    const s = shifts.find((item) => item.userId === u.id && item.date === day.dateStr);
                    return s?.isHalfDay;
                  }).length;
                  return (
                    <td key={day.index} className="px-2 py-2.5 border-l border-slate-200 text-center align-top">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-between px-1 text-[9px] text-blue-900 bg-blue-100/80 rounded font-semibold">
                          <span>HC:</span>
                          <span className="font-extrabold">{countHC}</span>
                        </div>
                        <div className="flex items-center justify-between px-1 text-[9px] text-amber-950 bg-amber-100/90 rounded font-semibold">
                          <span>C1:</span>
                          <span className="font-extrabold">{countC1}</span>
                        </div>
                        <div className="flex items-center justify-between px-1 text-[9px] text-indigo-950 bg-indigo-100/90 rounded font-semibold">
                          <span>C2:</span>
                          <span className="font-extrabold">{countC2}</span>
                        </div>
                        <div className="flex items-center justify-between px-1 text-[9px] text-purple-100 bg-purple-900 rounded font-semibold">
                          <span>C3:</span>
                          <span className="font-extrabold text-white">{countC3}</span>
                        </div>
                        {countOffHalf > 0 && (
                          <div className="flex items-center justify-between px-1 text-[9px] text-amber-950 bg-amber-200/90 rounded font-black border border-amber-300">
                            <span>Nghỉ 1/2:</span>
                            <span className="font-extrabold">{countOffHalf}</span>
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

      {/* 5. Quick Shift Change Modal / Popover */}
      {editingCell && (
        <div
          onClick={() => setEditingCell(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4 border border-slate-200"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Đổi Ca Làm Việc</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cho <strong>{getPersonalName(editingCell.userName)}</strong> ngày {editingCell.dateStr}
                </p>
              </div>
              <button
                onClick={() => setEditingCell(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {shiftsConfig.map((conf) => {
                const sid = conf.id;
                const isSelected = editingCell.currentShiftId === sid;

                return (
                  <button
                    key={sid}
                    onClick={() => handleSelectShift(sid)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 font-bold'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`w-3 h-3 rounded-full ${conf.dotColor}`} />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{conf.name}</p>
                        {!conf.hasNoTime && conf.timeRange ? (
                          <p className="text-[11px] text-slate-500">{conf.timeRange}</p>
                        ) : (
                          <p className="text-[10.5px] text-teal-800 font-semibold">Chế độ nghỉ &bull; Không ghi giờ</p>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })}

              {/* Chế độ Nghỉ Nửa Ngày: Bật/Tắt nghỉ 1/2 ca cho ca đã chọn */}
              {editingCell.currentShiftId !== 'OFF' && (
                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleToggleEditingHalfDay}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      editingCell.isHalfDay
                        ? 'border-amber-300 bg-amber-100 text-amber-950 font-bold shadow-2xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-3 h-3 rounded-full bg-amber-500 ring-1 ring-amber-600/30" />
                      <div>
                        <p className="text-xs font-bold text-amber-950">Chế độ Nghỉ Nửa Ngày</p>
                        <p className="text-[11px] text-amber-800 font-medium">
                          {editingCell.isHalfDay ? 'Đang bật: Làm 1/2 ca & nghỉ 1/2 ca' : 'Nhấn để áp dụng nghỉ 1/2 ca'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                      editingCell.isHalfDay ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {editingCell.isHalfDay ? 'BẬT' : 'TẮT'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Weekly Schedule Planner Modal (Sao chép từ tuần hiện tại, sửa cho tuần sau và lưu lại) */}
      <WeeklySchedulePlannerModal
        isOpen={isPlannerModalOpen}
        onClose={() => setIsPlannerModalOpen(false)}
        onScheduleSaved={(nextMon) => {
          setCurrentMonday(nextMon);
        }}
      />

      {/* 7. Manage Shifts Modal for Admin */}
      <ManageShiftsModal
        isOpen={isManageShiftsOpen}
        onClose={() => setIsManageShiftsOpen(false)}
      />
    </div>
  );
}
