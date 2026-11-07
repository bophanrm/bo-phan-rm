'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, User } from '@/types';
import { exportDailyTasksToExcel } from '@/utils/excelExport';
import { getPersonalName } from '@/utils/nameHelper';
import {
  canExportDailyExcel,
  canViewTask,
  canReviewTask,
  canExtendTaskDeadline,
  canDirectlyExtendTask,
  canRequestExtension,
  canApproveExtensionRequest,
} from '@/utils/permissions';
import { ExtendDeadlineModal } from '@/components/tasks/ExtendDeadlineModal';
import {
  Sun,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Users,
  Camera,
  Check,
  Send,
  FileCheck,
  Calendar,
  FileSpreadsheet,
  Download,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  CheckSquare,
  Filter,
  X,
  AlertTriangle,
  BellRing,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface DailyTrackerProps {
  onOpenCreateDaily?: (assigneeId?: string) => void;
  onOpenReportModal: (task: Task) => void;
  onOpenReviewModal: (task: Task) => void;
}

export type TimeFilterPeriod =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'LAST_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'ALL'
  | 'CUSTOM';

function isTaskInTimeFilter(task: Task, period: TimeFilterPeriod, customDate?: string): boolean {
  if (period === 'ALL') return true;

  const now = new Date();

  // Xác định các mốc thời gian của task
  const createdDate = task.createdAt ? new Date(task.createdAt) : new Date();
  const startDate = task.startDate ? new Date(task.startDate) : createdDate;
  const dueDate = task.dueDate
    ? new Date(task.dueDate)
    : task.reportDeadline
    ? new Date(task.reportDeadline)
    : startDate;

  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const deadlineDay = task.reportDeadline
    ? new Date(
        new Date(task.reportDeadline).getFullYear(),
        new Date(task.reportDeadline).getMonth(),
        new Date(task.reportDeadline).getDate()
      ).getTime()
    : dueDay;

  // 1. Đối với Việc Trong Ngày (Daily Task: isDaily = true)
  if (task.isDaily) {
    const taskDay = dueDay || deadlineDay || startDay;

    if (period === 'CUSTOM') {
      if (!customDate) return true;
      const targetDay = new Date(customDate).setHours(0, 0, 0, 0);
      return taskDay === targetDay;
    }

    if (period === 'TODAY') {
      const today = new Date().setHours(0, 0, 0, 0);
      return taskDay === today;
    }

    if (period === 'YESTERDAY') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return taskDay === yesterday.setHours(0, 0, 0, 0);
    }

    if (period === 'THIS_WEEK') {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return taskDay >= monday.getTime() && taskDay <= sunday.getTime();
    }

    if (period === 'LAST_WEEK') {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() + diffToMonday - 7);
      lastMonday.setHours(0, 0, 0, 0);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);
      return taskDay >= lastMonday.getTime() && taskDay <= lastSunday.getTime();
    }

    if (period === 'THIS_MONTH') {
      const tD = new Date(taskDay);
      return tD.getMonth() === now.getMonth() && tD.getFullYear() === now.getFullYear();
    }

    if (period === 'LAST_MONTH') {
      const tD = new Date(taskDay);
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return tD.getMonth() === lastMonth && tD.getFullYear() === lastMonthYear;
    }

    return true;
  }

  // 2. Đối với Dự Án / Kế Hoạch Dài Hạn (!task.isDaily)
  // Dự án là công việc diễn ra trong cả chu kỳ từ ngày bắt đầu (startDay) đến ngày hoàn thành (dueDay/deadlineDay)
  const minActiveDay = Math.min(startDay, dueDay);
  const maxActiveDay = Math.max(startDay, dueDay, deadlineDay);

  if (period === 'CUSTOM') {
    if (!customDate) return true;
    const targetDay = new Date(customDate).setHours(0, 0, 0, 0);
    // Dự án xuất hiện nếu ngày được chọn nằm trong khoảng thời gian diễn ra dự án
    return targetDay >= minActiveDay && targetDay <= maxActiveDay;
  }

  if (period === 'TODAY') {
    const today = new Date().setHours(0, 0, 0, 0);
    // Dự án xuất hiện ở "Hôm nay" nếu hôm nay nằm trong thời gian dự án hoặc dự án đang làm chưa hoàn thành
    return (today >= minActiveDay && today <= maxActiveDay) || (task.status !== 'APPROVED' && today >= minActiveDay);
  }

  if (period === 'YESTERDAY') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yDay = yesterday.setHours(0, 0, 0, 0);
    return yDay >= minActiveDay && yDay <= maxActiveDay;
  }

  if (period === 'THIS_WEEK') {
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return maxActiveDay >= monday.getTime() && minActiveDay <= sunday.getTime();
  }

  if (period === 'LAST_WEEK') {
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() + diffToMonday - 7);
    lastMonday.setHours(0, 0, 0, 0);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);
    lastSunday.setHours(23, 59, 59, 999);
    return maxActiveDay >= lastMonday.getTime() && minActiveDay <= lastSunday.getTime();
  }

  if (period === 'THIS_MONTH') {
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    return maxActiveDay >= thisMonthStart && minActiveDay <= thisMonthEnd;
  }

  if (period === 'LAST_MONTH') {
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
    return maxActiveDay >= lastMonthStart && minActiveDay <= lastMonthEnd;
  }

  return true;
}

function getTimePeriodLabel(period: TimeFilterPeriod, customDate?: string): string {
  switch (period) {
    case 'TODAY':
      return 'Hôm nay';
    case 'YESTERDAY':
      return 'Hôm qua';
    case 'THIS_WEEK':
      return 'Tuần này';
    case 'LAST_WEEK':
      return 'Tuần trước';
    case 'THIS_MONTH':
      return 'Tháng này';
    case 'LAST_MONTH':
      return 'Tháng trước';
    case 'CUSTOM':
      return customDate ? `Ngày ${new Date(customDate).toLocaleDateString('vi-VN')}` : 'Ngày tùy chọn';
    case 'ALL':
    default:
      return 'Toàn bộ thời gian';
  }
}

export type TaskFilterType = 'ALL' | 'UNFINISHED' | 'OVERDUE' | 'DAILY' | 'PROJECT' | 'APPROVED';

export function DailyTracker({
  onOpenCreateDaily,
  onOpenReportModal,
  onOpenReviewModal,
}: DailyTrackerProps) {
  const { tasks, currentUser, users, teams, rolloverTaskToTomorrow } = useApp();

  // State
  const [filterType, setFilterType] = useState<TaskFilterType>('ALL');
  const [timePeriod, setTimePeriod] = useState<TimeFilterPeriod>('TODAY');
  const [customDate, setCustomDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [extendModalTask, setExtendModalTask] = useState<Task | null>(null);

  const isSecretary = currentUser.role === 'SECRETARY' || currentUser.level === 'LEVEL_2_SECRETARY';
  const isManager = currentUser.role !== 'ADMIN' && (currentUser.role === 'MANAGER' || currentUser.level === 'LEVEL_1_MANAGER');
  const isLead = currentUser.level === 'LEVEL_3_LEAD';
  const canReview = currentUser.role !== 'ADMIN' && (isManager || isSecretary || isLead || (currentUser.permissions?.canReviewReports ?? false));
  const canExportExcel = canExportDailyExcel(currentUser);

  // Lọc các công việc mà người dùng có quyền thấy:
  // - Cấp 4: Chỉ thấy công việc được giao cho chính mình
  // - Cấp 3: Chỉ thấy công việc hằng ngày của Cấp 4 để duyệt (và việc giao cho mình)
  // - Cấp 1 & 2: Thấy tất cả
  const visibleTasks = tasks.filter((t) => canViewTask(currentUser, t, users));

  // Helper kiểm tra quá hạn
  const isTaskOverdue = (t: Task): boolean => {
    if (t.status === 'APPROVED') return false;
    if (!t.dueDate) return false;
    const dueTime = new Date(t.dueDate).getTime();
    if (isNaN(dueTime)) return false;
    return dueTime < Date.now();
  };

  // Lọc theo thời gian và phân loại
  const filteredDailyTasks = visibleTasks.filter((t) => {
    // Lọc thời gian
    if (!isTaskInTimeFilter(t, timePeriod, customDate)) return false;

    // Lọc loại / trạng thái công việc
    if (filterType === 'DAILY' && !t.isDaily) return false;
    if (filterType === 'PROJECT' && t.isDaily) return false;
    if (filterType === 'UNFINISHED' && t.status === 'APPROVED') return false;
    if (filterType === 'OVERDUE' && !isTaskOverdue(t)) return false;
    if (filterType === 'APPROVED' && t.status !== 'APPROVED') return false;

    return true;
  });

  // Số lượng công việc trong kỳ thời gian đang chọn
  const tasksInPeriod = visibleTasks.filter((t) => isTaskInTimeFilter(t, timePeriod, customDate));
  const countAll = tasksInPeriod.length;
  const countUnfinished = tasksInPeriod.filter((t) => t.status !== 'APPROVED').length;
  const countOverdue = tasksInPeriod.filter((t) => isTaskOverdue(t)).length;
  const countDaily = tasksInPeriod.filter((t) => t.isDaily).length;
  const countProject = tasksInPeriod.filter((t) => !t.isDaily).length;
  const countApproved = tasksInPeriod.filter((t) => t.status === 'APPROVED').length;

  // Metrics dựa trên kết quả lọc thời gian
  const totalInPeriod = countAll;
  const completedInPeriod = countApproved;
  const progressPercent = totalInPeriod > 0 ? Math.round((completedInPeriod / totalInPeriod) * 100) : 0;

  // Cơ chế nhắc nhở ca trực (Toàn thời gian làm việc trong ngày: 7h30 - 16h00; nhắc lúc 15:00 nếu chưa gửi báo cáo)
  const now = new Date();
  const todayDailyTasks = visibleTasks.filter((t) => {
    if (!t.isDaily) return false;
    const taskDate = new Date(t.reportDeadline || t.dueDate || t.createdAt);
    return taskDate.toDateString() === now.toDateString();
  });

  const unsubmittedTodayDailyTasks = todayDailyTasks.filter((t) => {
    if (t.status === 'APPROVED' || t.status === 'SUBMITTED') return false;
    if (t.reports && t.reports.some((r) => r.status === 'ACCEPTED' || r.status === 'PENDING_REVIEW')) return false;
    return true;
  });

  // Kích hoạt nhắc nhở nếu thời gian hiện tại >= 1 tiếng trước deadline (ví dụ deadline 16:00 thì từ 15:00 trở đi)
  const isShiftReminderActive = unsubmittedTodayDailyTasks.some((t) => {
    const deadline = new Date(t.reportDeadline || t.dueDate);
    const reminderTime = new Date(deadline.getTime() - 60 * 60 * 1000);
    return now >= reminderTime;
  });

  // Danh sách công việc của nhân viên hiện tại cần nộp báo cáo
  const myUnsubmittedDailyTasks = unsubmittedTodayDailyTasks.filter((t) =>
    t.assignedTo.includes(currentUser.id)
  );

  const todayFormatted = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  // Helper lùi / tiến 1 ngày nhanh chóng
  const handleStepDate = (deltaDays: number) => {
    const base = customDate ? new Date(customDate) : new Date();
    base.setDate(base.getDate() + deltaDays);
    const newDateStr = base.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];
    if (newDateStr === todayStr) {
      setCustomDate('');
      setTimePeriod('TODAY');
    } else {
      setCustomDate(newDateStr);
      setTimePeriod('CUSTOM');
    }
  };

  // Handle Export Excel
  const handleExportExcel = async () => {
    const tasksToExport = filteredDailyTasks.length > 0 ? filteredDailyTasks : visibleTasks;
    if (tasksToExport.length === 0) {
      alert('Chưa có công việc nào theo bộ lọc để xuất Excel.');
      return;
    }

    try {
      setIsExporting(true);
      const managerUsers = users.filter((u) => u.role !== 'ADMIN' && (u.level === 'LEVEL_1_MANAGER' || u.role === 'MANAGER'));
      const managerNameStr = managerUsers.length > 0 ? managerUsers.map((m) => getPersonalName(m.name, false)).join(' / ') : 'Ban Quản Lý';
      await exportDailyTasksToExcel({
        tasks: tasksToExport,
        users,
        date: customDate ? new Date(customDate) : new Date(),
        exportedByName: getPersonalName(currentUser.name, false),
        managerName: managerNameStr,
      });
    } catch (error) {
      console.error('Error generating Excel report:', error);
      alert('Có lỗi khi tạo file Excel. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner Card: Dashboard Điều Phối & Tiến Độ Công Việc */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl shadow-blue-700/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Bảng Điều Phối & Quản Lý Công Việc</span>
              </span>
              <span className="text-xs text-blue-100 font-medium capitalize">
                {getTimePeriodLabel(timePeriod, customDate)}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {completedInPeriod === totalInPeriod && totalInPeriod > 0
                ? 'Xuất sắc! Đã hoàn tất 100% các công việc trong kỳ 🎉'
                : `Đã hoàn thành ${completedInPeriod}/${totalInPeriod} công việc (${progressPercent}%)`}
            </h2>
          </div>

          {/* Action Buttons: Xuất Excel (Giao việc tập trung tại nút Giao Việc chính) */}
          <div className="flex items-center space-x-2 shrink-0 self-start md:self-auto flex-wrap gap-y-2">
            {/* Export Excel Button (Chỉ Nhân Viên Điều Phối mới có quyền xuất file tổng hợp) */}
            {canExportExcel && (
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                title="Xuất bảng tổng hợp Excel kèm ảnh nghiệm thu"
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isExporting ? 'Đang xuất Excel & ảnh...' : 'Xuất File Excel (Kèm Ảnh)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-3 border-t border-white/20">
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span>Tiến độ thực thi ({getTimePeriodLabel(timePeriod, customDate)})</span>
            <span>{progressPercent}% ({completedInPeriod}/{totalInPeriod} việc hoàn thành)</span>
          </div>
          <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Control Bar: Phân Loại & Bộ Lọc Thời Gian Thông Minh (Đồng Bộ Cả Web & Điện Thoại) */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs space-y-2.5 sm:space-y-3">
        {/* Dòng 1: Điều hướng thời gian 3-trong-1 (Tất cả trên 1 dòng duy nhất) */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Cụm Stepper ngày */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
            <button
              onClick={() => handleStepDate(-1)}
              title="Lùi 1 ngày"
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Ô ngày trực quan, bấm mở lịch */}
            <div className="relative flex items-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 sm:px-3 h-8 sm:h-9 transition-colors cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-blue-600 mr-1.5 sm:mr-2 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap">
                {customDate
                  ? new Date(customDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                  : timePeriod === 'TODAY'
                  ? `Hôm nay (${new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})`
                  : getTimePeriodLabel(timePeriod, customDate)}
              </span>
              <input
                type="date"
                value={customDate || (timePeriod === 'TODAY' ? new Date().toISOString().split('T')[0] : '')}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  if (e.target.value) setTimePeriod('CUSTOM');
                  else setTimePeriod('TODAY');
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>

            <button
              onClick={() => handleStepDate(1)}
              title="Tiến 1 ngày"
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dropdown chọn mốc thời gian nhanh */}
          <div className="relative shrink-0">
            <select
              value={customDate ? 'CUSTOM' : timePeriod}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== 'CUSTOM') {
                  setTimePeriod(val as TimeFilterPeriod);
                  setCustomDate('');
                }
              }}
              className="appearance-none bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold pl-2.5 sm:pl-3 pr-6 sm:pr-7 h-8 sm:h-9 rounded-xl border border-slate-200/80 outline-none cursor-pointer"
            >
              <option value="TODAY">Hôm nay</option>
              <option value="YESTERDAY">Hôm qua</option>
              <option value="THIS_WEEK">Tuần này</option>
              <option value="LAST_WEEK">Tuần trước</option>
              <option value="THIS_MONTH">Tháng này</option>
              <option value="LAST_MONTH">Tháng trước</option>
              <option value="ALL">Tất cả</option>
              {customDate && <option value="CUSTOM">Ngày tùy chọn</option>}
            </select>
            <span className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] sm:text-xs text-slate-500">▾</span>
          </div>
        </div>

        {/* Dòng 2: Phân loại & Trạng thái (Hiển thị 100%, không cần vuốt qua lại) */}
        <div className="pt-2 sm:pt-2.5 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2 sm:gap-2.5">
          {/* Nhóm trạng thái chính: 3 cột trên mobile, dàn ngang trên desktop */}
          <div className="grid grid-cols-3 md:flex md:items-center gap-1.5 text-center">
            <button
              onClick={() => setFilterType('ALL')}
              className={`py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap min-w-0 ${
                filterType === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Tất cả</span>
              <span className={`text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-bold shrink-0 ${filterType === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {countAll}
              </span>
            </button>

            <button
              onClick={() => setFilterType('UNFINISHED')}
              className={`py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap min-w-0 ${
                filterType === 'UNFINISHED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : countUnfinished > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200/70 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Chưa làm</span>
              <span className={`text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-bold shrink-0 ${filterType === 'UNFINISHED' ? 'bg-white/20 text-white' : countUnfinished > 0 ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-600'}`}>
                {countUnfinished}
              </span>
            </button>

            <button
              onClick={() => setFilterType('APPROVED')}
              className={`py-2 px-1.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap min-w-0 ${
                filterType === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : countApproved > 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/70 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Đã xong</span>
              <span className={`text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-bold shrink-0 ${filterType === 'APPROVED' ? 'bg-white/20 text-white' : countApproved > 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'}`}>
                {countApproved}
              </span>
            </button>
          </div>

          {/* Nhóm nguồn việc (Việc ngày / Dự án) & Quá hạn nếu có */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType(filterType === 'DAILY' ? 'ALL' : 'DAILY')}
              className={`flex-1 md:flex-none py-1.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                filterType === 'DAILY'
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>☀️ Việc ngày</span>
              <span className={`text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-bold ${filterType === 'DAILY' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {countDaily}
              </span>
            </button>

            <button
              onClick={() => setFilterType(filterType === 'PROJECT' ? 'ALL' : 'PROJECT')}
              className={`flex-1 md:flex-none py-1.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                filterType === 'PROJECT'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>📋 Dự án</span>
              <span className={`text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-bold ${filterType === 'PROJECT' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {countProject}
              </span>
            </button>

            {countOverdue > 0 && (
              <button
                onClick={() => setFilterType(filterType === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
                className={`py-1.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 sm:gap-1.5 animate-pulse shrink-0 ${
                  filterType === 'OVERDUE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                <span>🚨 Quá hạn</span>
                <span className="text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-900 font-extrabold">
                  {countOverdue}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CƠ CHẾ NHẮC NHỞ CA TRỰC (7h30 - 16h00; Nhắc nhở lúc 15:00 nếu chưa gửi báo cáo hoàn thành) */}
      {isShiftReminderActive && myUnsubmittedDailyTasks.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 shadow-sm">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                  ⏰ Nhắc Nhở Ca Trực (15:00)
                </span>
                <span className="text-xs font-semibold text-amber-800">Còn 1 tiếng nữa kết thúc ca 16:00</span>
              </div>
              <p className="text-sm font-bold text-slate-900">
                Bạn có {myUnsubmittedDailyTasks.length} công việc hằng ngày chưa gửi báo cáo hoàn thành!
              </p>
              <p className="text-xs text-slate-600 line-clamp-1">
                Công việc: &ldquo;{myUnsubmittedDailyTasks[0].title}&rdquo; &bull; Vui lòng nộp báo cáo kết quả trước 16:00.
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenReviewModal(myUnsubmittedDailyTasks[0])}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 shrink-0 flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Nộp Báo Cáo Ngay</span>
          </button>
        </div>
      )}

      {/* Cảnh báo dành cho Cấp Quản Lý / Điều Phối / Giám Sát (Cấp 1, 2, 3) theo dõi tiến độ lúc 15:00 */}
      {isShiftReminderActive && myUnsubmittedDailyTasks.length === 0 && unsubmittedTodayDailyTasks.length > 0 && canReview && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-blue-950 shadow-xs">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                  Giám Sát Ca Trực (15:00)
                </span>
                <span className="text-xs text-blue-800">Hết ca lúc 16:00</span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                Đang có {unsubmittedTodayDailyTasks.length} công việc hằng ngày hôm nay chưa nộp báo cáo kết quả.
              </p>
              <p className="text-[11px] text-slate-500">
                Nhân sự phụ trách: {Array.from(new Set(unsubmittedTodayDailyTasks.flatMap((t) => t.assignedToNames || []))).map(n => getPersonalName(n)).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterType('UNFINISHED')}
            className="text-xs font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-xl shrink-0 transition-all cursor-pointer"
          >
            Lọc việc chưa nộp ({unsubmittedTodayDailyTasks.length})
          </button>
        </div>
      )}

      {/* Main Content Area: Bảng Tổng Hợp Chi Tiết */}
      {filteredDailyTasks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 p-6 space-y-2">
          <Sun className="w-12 h-12 text-amber-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Không có công việc nào theo bộ lọc</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Các công việc thuộc khoảng thời gian hoặc phân loại đã chọn sẽ tự động hiển thị tại đây.
          </p>
        </div>
      ) : (
        <>
          {/* GIAO DIỆN THÔNG MINH CHO ĐIỆN THOẠI (Mobile Smart Cards) - KHÔNG CẦN CUỘN NGANG */}
          <div className="block md:hidden space-y-2.5">
            {filteredDailyTasks.map((task) => {
              const latestReport = task.reports && task.reports.length > 0 ? task.reports[task.reports.length - 1] : null;
              const hasImage = latestReport?.attachments && latestReport.attachments.length > 0;
              const deadlineDate = task.reportDeadline ? new Date(task.reportDeadline) : (task.dueDate ? new Date(task.dueDate) : null);
              const isValidDeadline = deadlineDate && !isNaN(deadlineDate.getTime());
              const isDueToday = isValidDeadline && deadlineDate.toDateString() === now.toDateString();
              const isRemindTime =
                task.status !== 'APPROVED' &&
                task.status !== 'SUBMITTED' &&
                task.isDaily &&
                (!task.reports || task.reports.length === 0) &&
                isValidDeadline &&
                now >= new Date(deadlineDate.getTime() - 60 * 60 * 1000);

              return (
                <div
                  key={`mobile-${task.id}`}
                  className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs space-y-2.5 transition-all"
                >
                  {/* Hàng 1: Phân Loại + Nhân Sự + Trạng Thái */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {task.isDaily ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          ☀️ Việc ngày
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                          📋 Dự án
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-slate-700 truncate">
                        👤 {task.teamName || (task.assignedToNames?.map((n) => getPersonalName(n)).join(', ') || 'Chưa phân công')}
                      </span>
                    </div>

                    <span
                      className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        task.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : task.status === 'SUBMITTED'
                          ? 'bg-purple-50 text-purple-800 border border-purple-300'
                          : isRemindTime
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold animate-pulse'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {task.status === 'APPROVED'
                        ? '✓ Đã xong'
                        : task.status === 'SUBMITTED'
                        ? 'Chờ duyệt'
                        : isRemindTime
                        ? '⏰ Cần nộp'
                        : 'Đang làm'}
                    </span>
                  </div>

                  {/* Hàng 2: Tên công việc & Yêu cầu */}
                  <div onClick={() => onOpenReviewModal(task)} className="cursor-pointer">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 hover:text-blue-600 transition-colors">
                      {task.title}
                    </h4>
                    {task.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Báo cáo gần nhất nếu có */}
                  {latestReport && (
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 italic text-[11px] text-slate-700 font-medium">
                          &quot;{latestReport.summary}&quot;
                        </p>
                        <span className="text-[9px] text-slate-400 mt-0.5 block">
                          Nộp lúc: {new Date(latestReport.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {hasImage && (
                        <img
                          src={latestReport.attachments[0].url}
                          alt="Nghiệm thu"
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => onOpenReviewModal(task)}
                        />
                      )}
                    </div>
                  )}

                  {/* Hàng 3: Hạn nộp thông minh & Nút thao tác */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Hạn nộp gọn gàng */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isValidDeadline ? (
                        <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {deadlineDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-slate-400 font-normal">
                            ({isDueToday ? 'Hôm nay' : deadlineDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">Không có hạn</span>
                      )}

                      {task.extensionRequest?.status === 'PENDING' && (
                        <span
                          title={`Đang xin gia hạn: ${new Date(task.extensionRequest.requestedNewDeadline).toLocaleString('vi-VN')} - Lý do: ${task.extensionRequest.reason}`}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                        >
                          ⏳ Xin gia hạn
                        </span>
                      )}
                      {task.extensionHistory && task.extensionHistory.length > 0 && task.extensionRequest?.status !== 'PENDING' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                          🔄 {task.extensionHistory[task.extensionHistory.length - 1].actionType === 'REASSIGN' ? 'Bàn giao' : 'Gia hạn'}
                        </span>
                      )}
                    </div>

                    {/* Các nút thao tác */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {/* 1. Nút Duyệt gia hạn */}
                      {task.extensionRequest?.status === 'PENDING' && canApproveExtensionRequest(currentUser, task, users) && (
                        <button
                          onClick={() => setExtendModalTask(task)}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs cursor-pointer flex items-center gap-1 animate-pulse"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Duyệt hạn</span>
                        </button>
                      )}

                      {/* 2. Nút Gia hạn trực tiếp */}
                      {canDirectlyExtendTask(currentUser, task, users) && task.status !== 'APPROVED' && (!task.extensionRequest || task.extensionRequest.status !== 'PENDING') && (
                        <button
                          onClick={() => setExtendModalTask(task)}
                          title="Gia hạn / Chuyển giao công việc"
                          className="text-slate-500 hover:text-blue-600 p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* 3. Nút Xin gia hạn */}
                      {!canDirectlyExtendTask(currentUser, task, users) &&
                        canRequestExtension(currentUser, task) &&
                        task.status !== 'APPROVED' && (
                          <button
                            onClick={() => setExtendModalTask(task)}
                            title={task.extensionRequest?.status === 'PENDING' ? 'Xem trạng thái yêu cầu gia hạn' : 'Xin gia hạn / Đề xuất bàn giao'}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              task.extensionRequest?.status === 'PENDING'
                                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                : 'text-indigo-600 hover:text-indigo-800 bg-indigo-50'
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                      {/* 4. Nút Duyệt / Nộp / Xem */}
                      {canReviewTask(currentUser, task, users) && task.status === 'SUBMITTED' ? (
                        <button
                          onClick={() => onOpenReviewModal(task)}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer"
                        >
                          Duyệt
                        </button>
                      ) : task.assignedTo.includes(currentUser.id) && task.status !== 'APPROVED' ? (
                        <button
                          onClick={() => onOpenReviewModal(task)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer"
                        >
                          Nộp việc
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenReviewModal(task)}
                          className="text-slate-500 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Chi tiết
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BẢNG TỔNG HỢP CHO MÀN HÌNH LỚN (Desktop / Tablet) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="px-3.5 py-3">STT</th>
                  <th className="px-3.5 py-3 text-center whitespace-nowrap">Phân Loại</th>
                  <th className="px-4 py-3 min-w-[200px]">Công Việc & Yêu Cầu</th>
                  <th className="px-4 py-3 min-w-[160px]">Người Thực Hiện</th>
                  <th className="px-3.5 py-3 text-center">Hạn Nộp</th>
                  <th className="px-3.5 py-3 text-center">Trạng Thái</th>
                  <th className="px-4 py-3 min-w-[180px]">Kết Quả Báo Cáo</th>
                  <th className="px-3.5 py-3 text-center">Ảnh Nghiệm Thu</th>
                  <th className="px-3.5 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDailyTasks.map((task, idx) => {
                  const latestReport = task.reports && task.reports.length > 0 ? task.reports[task.reports.length - 1] : null;
                  const hasImage = latestReport?.attachments && latestReport.attachments.length > 0;

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        {task.isDaily ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center space-x-1">
                            <span>☀️ Việc hằng ngày</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center space-x-1">
                            <span>📋 Dự án dài hạn</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 leading-snug">{task.title}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          {task.teamName || (task.assignedToNames?.map((n) => getPersonalName(n)).join(', ') || 'Chưa phân công')}
                        </p>
                        <p className="text-[10px] text-slate-400">Giao bởi: {getPersonalName(task.createdByName || '')}</p>
                      </td>
                      <td className="px-3.5 py-3 text-center font-semibold text-orange-600 whitespace-nowrap">
                        {task.reportDeadline && !isNaN(new Date(task.reportDeadline).getTime()) ? (
                          task.isDaily ? (
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-slate-800">
                                {new Date(task.reportDeadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {new Date(task.reportDeadline).toDateString() === now.toDateString()
                                  ? 'Hôm nay'
                                  : new Date(task.reportDeadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                              </span>
                              {task.extensionRequest?.status === 'PENDING' && (
                                <span
                                  title={`Đang xin gia hạn: ${new Date(task.extensionRequest.requestedNewDeadline).toLocaleString('vi-VN')} - Lý do: ${task.extensionRequest.reason}`}
                                  className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                                >
                                  ⏳ Xin gia hạn
                                </span>
                              )}
                              {task.extensionHistory && task.extensionHistory.length > 0 && task.extensionRequest?.status !== 'PENDING' && (
                                <span
                                  title={`Lịch sử: ${task.extensionHistory[task.extensionHistory.length - 1].reason || 'Theo tiến độ'}`}
                                  className="mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200"
                                >
                                  🔄 {task.extensionHistory[task.extensionHistory.length - 1].actionType === 'REASSIGN' ? 'Đã bàn giao' : 'Đã gia hạn'}
                                </span>
                              )}
                              {task.status !== 'APPROVED' &&
                                task.status !== 'SUBMITTED' &&
                                (!task.reports || task.reports.length === 0) &&
                                now >= new Date(new Date(task.reportDeadline).getTime() - 60 * 60 * 1000) && (
                                  <span className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                    ⏰ Nhắc nộp báo cáo
                                  </span>
                                )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <span>
                                {new Date(task.reportDeadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {task.extensionRequest?.status === 'PENDING' && (
                                <span
                                  title={`Đang xin gia hạn: ${new Date(task.extensionRequest.requestedNewDeadline).toLocaleString('vi-VN')} - Lý do: ${task.extensionRequest.reason}`}
                                  className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                                >
                                  ⏳ Xin gia hạn
                                </span>
                              )}
                              {task.extensionHistory && task.extensionHistory.length > 0 && task.extensionRequest?.status !== 'PENDING' && (
                                <span className="mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                  🔄 {task.extensionHistory[task.extensionHistory.length - 1].actionType === 'REASSIGN' ? 'Đã bàn giao' : 'Đã gia hạn'}
                                </span>
                              )}
                            </div>
                          )
                        ) : (
                          '---'
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            task.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : task.status === 'SUBMITTED'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : task.isDaily &&
                                (!task.reports || task.reports.length === 0) &&
                                now >= new Date(new Date(task.reportDeadline || task.dueDate).getTime() - 60 * 60 * 1000)
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold animate-pulse'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {task.status === 'APPROVED'
                            ? '✓ Đã xong'
                            : task.status === 'SUBMITTED'
                            ? 'Chờ duyệt'
                            : task.isDaily &&
                              (!task.reports || task.reports.length === 0) &&
                              now >= new Date(new Date(task.reportDeadline || task.dueDate).getTime() - 60 * 60 * 1000)
                            ? '⏰ Cần nộp (15h)'
                            : 'Đang làm'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">
                        {latestReport ? (
                          <div>
                            <p className="line-clamp-2 italic">&quot;{latestReport.summary}&quot;</p>
                            <span className="text-[9px] text-slate-400">
                              Nộp lúc: {new Date(latestReport.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa nộp kết quả</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        {hasImage ? (
                          <div className="flex items-center justify-center">
                            <img
                              src={latestReport!.attachments[0].url}
                              alt="Nghiệm thu"
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-xs cursor-pointer hover:scale-110 transition-transform"
                              onClick={() => onOpenReviewModal(task)}
                            />
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[10px]">Không có</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* 1. Nút Duyệt gia hạn (Nếu có yêu cầu và user có thẩm quyền) */}
                          {task.extensionRequest?.status === 'PENDING' && canApproveExtensionRequest(currentUser, task, users) && (
                            <button
                              onClick={() => setExtendModalTask(task)}
                              title="Phê duyệt yêu cầu xin gia hạn / Chỉ định người bàn giao"
                              className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg shadow-xs cursor-pointer flex items-center space-x-1 animate-pulse"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Duyệt hạn</span>
                            </button>
                          )}

                          {/* 2. Nút Gia hạn / Đổi hạn / Bàn giao trực tiếp (Cấp 1, Cấp 2, Người tạo việc) */}
                          {canDirectlyExtendTask(currentUser, task, users) && task.status !== 'APPROVED' && (!task.extensionRequest || task.extensionRequest.status !== 'PENDING') && (
                            <button
                              onClick={() => setExtendModalTask(task)}
                              title="Gia hạn / Chuyển giao công việc"
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* 3. Nút Xin gia hạn / Đề xuất bàn giao (Cấp 4 hoặc nhân sự được giao) */}
                          {!canDirectlyExtendTask(currentUser, task, users) &&
                            canRequestExtension(currentUser, task) &&
                            task.status !== 'APPROVED' && (
                              <button
                                onClick={() => setExtendModalTask(task)}
                                title={task.extensionRequest?.status === 'PENDING' ? 'Xem trạng thái yêu cầu gia hạn' : 'Xin gia hạn / Đề xuất bàn giao'}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  task.extensionRequest?.status === 'PENDING'
                                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                    : 'text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50'
                                }`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                          {canReviewTask(currentUser, task, users) && task.status === 'SUBMITTED' ? (
                            <button
                              onClick={() => onOpenReviewModal(task)}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                            >
                              Duyệt
                            </button>
                          ) : task.assignedTo.includes(currentUser.id) && task.status !== 'APPROVED' ? (
                            <button
                              onClick={() => onOpenReportModal(task)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                            >
                              Nộp
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenReviewModal(task)}
                              className="text-slate-400 hover:text-blue-600 text-xs font-semibold cursor-pointer"
                            >
                              Xem
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
      {/* Modal Gia Hạn & Điều Chỉnh Thời Gian Hoàn Thành */}
      <ExtendDeadlineModal
        task={extendModalTask}
        isOpen={!!extendModalTask}
        onClose={() => setExtendModalTask(null)}
      />
    </div>
  );
}
