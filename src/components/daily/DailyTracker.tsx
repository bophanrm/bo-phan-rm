'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, User } from '@/types';
import { calculateShiftTimes } from '@/utils/shiftHelper';
import { exportDailyTasksToExcel, exportWeeklyTasksToExcel } from '@/utils/excelExport';
import { QuickProgressModal } from '@/components/tasks/QuickProgressModal';
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
  Eye,
  Building2,
  TrendingUp,
  BarChart3,
  Bell,
  BellOff,
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

  const minActiveDay = Math.min(startDay, dueDay, deadlineDay);
  const maxActiveDay = Math.max(startDay, dueDay, deadlineDay);

  // Kiểm tra xem công việc là dạng nhiều ngày (Dự án hoặc Việc nhiều ngày durationDays > 1 hoặc kéo dài qua nhiều ngày)
  const isMultiDayOrProject =
    !task.isDaily ||
    (task.durationDays !== undefined && task.durationDays > 1) ||
    minActiveDay < maxActiveDay;

  // 1. Đối với Công việc nhiều ngày hoặc Dự án dài hạn
  // Công việc sẽ hiển thị trong suốt tất cả các ngày từ ngày bắt đầu đến ngày kết thúc
  if (isMultiDayOrProject) {
    if (period === 'CUSTOM') {
      if (!customDate) return true;
      const targetDay = new Date(customDate).setHours(0, 0, 0, 0);
      const todayZero = new Date().setHours(0, 0, 0, 0);
      // Hiển thị nếu ngày được chọn nằm trong chu kỳ làm việc, HOẶC việc quá hạn chưa hoàn thành tính đến hôm nay
      return (
        (targetDay >= minActiveDay && targetDay <= maxActiveDay) ||
        (task.status !== 'APPROVED' && targetDay > maxActiveDay && targetDay <= todayZero)
      );
    }

    if (period === 'TODAY') {
      const today = new Date().setHours(0, 0, 0, 0);
      // Xuất hiện ở "Hôm nay" nếu hôm nay nằm trong thời gian làm việc hoặc công việc đang làm chưa hoàn thành
      return (
        (today >= minActiveDay && today <= maxActiveDay) ||
        (task.status !== 'APPROVED' && today >= minActiveDay)
      );
    }

    if (period === 'YESTERDAY') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yDay = yesterday.setHours(0, 0, 0, 0);
      return (
        (yDay >= minActiveDay && yDay <= maxActiveDay) ||
        (task.status !== 'APPROVED' && yDay > maxActiveDay)
      );
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

  // 2. Đối với Việc Trong Ngày (chỉ làm trong đúng 1 ngày)
  const taskDay = dueDay || deadlineDay || startDay;

  if (period === 'CUSTOM') {
    if (!customDate) return true;
    const targetDay = new Date(customDate).setHours(0, 0, 0, 0);
    return taskDay === targetDay;
  }

  if (period === 'TODAY') {
    const today = new Date().setHours(0, 0, 0, 0);
    return taskDay === today || (task.status !== 'APPROVED' && today > taskDay);
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
  const { tasks, currentUser, users, teams, shifts, shiftsConfigMap, rolloverTaskToTomorrow, toggleDismissOverdue } = useApp();

  // State
  const [filterType, setFilterType] = useState<TaskFilterType>('ALL');
  const [timePeriod, setTimePeriod] = useState<TimeFilterPeriod>('TODAY');
  const [customDate, setCustomDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState<boolean>(false);
  const [selectedWeekMonday, setSelectedWeekMonday] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  });
  const [quickProgressTask, setQuickProgressTask] = useState<Task | null>(null);
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
  const countActiveOverdue = tasksInPeriod.filter((t) => isTaskOverdue(t) && !t.isDismissedOverdue).length;
  const countDaily = tasksInPeriod.filter((t) => t.isDaily).length;
  const countProject = tasksInPeriod.filter((t) => !t.isDaily).length;
  const countApproved = tasksInPeriod.filter((t) => t.status === 'APPROVED').length;

  // Metrics dựa trên kết quả lọc thời gian
  const totalInPeriod = countAll;
  const completedInPeriod = countApproved;
  const progressPercent = totalInPeriod > 0 ? Math.round((completedInPeriod / totalInPeriod) * 100) : 0;

  // Cơ chế nhắc nhở ca trực: Căn cứ vào ca trực thực tế của từng nhân viên (nhắc trước khi hết ca 60 phút)
  const now = new Date();
  const todayStr = (() => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
    } catch {
      return now.toISOString().split('T')[0];
    }
  })();

  const todayDailyTasks = visibleTasks.filter((t) => {
    if (!t.isDaily) return false;

    // Nếu là việc nhiều ngày (durationDays > 1)
    if (t.durationDays && t.durationDays > 1) {
      const startD = new Date(t.startDate || t.createdAt);
      const startStr = (() => {
        try {
          return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(startD);
        } catch {
          return startD.toISOString().split('T')[0];
        }
      })();
      const endD = new Date(t.reportDeadline || t.dueDate);
      const endStr = (() => {
        try {
          return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(endD);
        } catch {
          return endD.toISOString().split('T')[0];
        }
      })();

      // Active nếu hôm nay nằm trong khoảng từ ngày bắt đầu đến ngày kết thúc, hoặc quá hạn nhưng chưa hoàn thành
      return (todayStr >= startStr && todayStr <= endStr) || (todayStr > endStr && t.status !== 'APPROVED');
    }

    const taskDate = new Date(t.reportDeadline || t.dueDate || t.createdAt);
    const taskDateStr = (() => {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(taskDate);
      } catch {
        return taskDate.toISOString().split('T')[0];
      }
    })();
    return taskDateStr === todayStr;
  });

  const unsubmittedTodayDailyTasks = todayDailyTasks.filter((t) => {
    if (t.status === 'APPROVED' || t.status === 'SUBMITTED') return false;
    // Nếu hôm nay đã gửi báo cáo kết quả hoàn thành
    if (t.reports && t.reports.some((r) => (r.submittedAt?.startsWith(todayStr) || false) && (r.status === 'ACCEPTED' || r.status === 'PENDING_REVIEW'))) return false;
    // Đối với việc nhiều ngày: nếu hôm nay đã có cập nhật tiến độ (progressUpdates) thì coi như hôm nay đã nộp
    if (t.progressUpdates && t.progressUpdates.some((pu) => pu.updatedAt?.startsWith(todayStr))) return false;
    return true;
  });

  // Danh sách công việc của người dùng hiện tại cần nộp báo cáo
  const myUnsubmittedDailyTasks = unsubmittedTodayDailyTasks.filter((t) =>
    t.assignedTo.includes(currentUser.id)
  );

  // Tra cứu ca làm việc hôm nay của người dùng hiện tại
  const myShiftToday = shifts.find((s) => s.userId === currentUser.id && s.date === todayStr);
  const myShiftCalc = calculateShiftTimes(myShiftToday?.shiftId || 'HANH_CHINH', now, shiftsConfigMap);
  const isMyShiftOff = myShiftToday?.shiftId === 'OFF' || myShiftToday?.shiftId === 'OFF_HALF';

  // Nhắc nhở của tôi được kích hoạt nếu: có việc chưa nộp, không nghỉ ca, và thời gian hiện tại >= giờ nhắc (trước hết ca 60 phút)
  const isMyShiftReminderActive =
    !isMyShiftOff &&
    myUnsubmittedDailyTasks.length > 0 &&
    now >= new Date(myShiftCalc.reminderDateIso);

  // Đối với Cấp Quản lý / Giám sát: Kiểm tra xem có công việc nào của nhân sự trong ca đã tới giờ nhắc nhở (trước hết ca 60 phút)
  const overdueTasksForManager = unsubmittedTodayDailyTasks.filter((t) => {
    return t.assignedTo.some((assigneeId) => {
      const userShift = shifts.find((s) => s.userId === assigneeId && s.date === todayStr);
      const shiftId = userShift?.shiftId || 'HANH_CHINH';
      if (shiftId === 'OFF' || shiftId === 'OFF_HALF') return false;
      const shiftCalc = calculateShiftTimes(shiftId, now, shiftsConfigMap);
      return now >= new Date(shiftCalc.reminderDateIso);
    });
  });

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

  // Handle Export Daily Excel
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
      setShowExportOptions(false);
    } catch (error) {
      console.error('Error generating Excel report:', error);
      alert('Có lỗi khi tạo file Excel. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Export Weekly Excel (Chỉ dành cho Cấp 2 thao tác)
  const handleExportWeeklyExcel = async () => {
    try {
      setIsExporting(true);
      const mon = new Date(selectedWeekMonday);
      mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);

      // Lọc toàn bộ công việc (cả ngày và dự án) có mốc thời gian diễn ra trong tuần
      const weeklyTasks = tasks.filter((t) => {
        const d = new Date(t.startDate || t.dueDate || t.createdAt);
        return d >= mon && d <= sun;
      });

      const managerUsers = users.filter((u) => u.role !== 'ADMIN' && (u.level === 'LEVEL_1_MANAGER' || u.role === 'MANAGER'));
      const managerNameStr = managerUsers.length > 0 ? managerUsers.map((m) => getPersonalName(m.name, false)).join(' / ') : 'Ban Quản Lý';

      const monStr = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(mon);
      const sunStr = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(sun);

      await exportWeeklyTasksToExcel({
        tasks: weeklyTasks,
        users,
        startDate: mon,
        endDate: sun,
        weekLabel: `Tuần từ ${monStr} đến ${sunStr}`,
        exportedByName: getPersonalName(currentUser.name, false),
        managerName: managerNameStr,
      });
      setShowExportOptions(false);
    } catch (error) {
      console.error('Error generating Weekly Excel report:', error);
      alert('Có lỗi khi tạo file Excel tuần. Vui lòng thử lại.');
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  disabled={isExporting}
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isExporting ? 'Đang tạo Excel...' : 'Xuất File Excel'}</span>
                  <span className="text-[10px] bg-emerald-800/60 px-1.5 py-0.5 rounded-md">▼</span>
                </button>

                {/* Dropdown Menu Tùy Chọn Xuất Báo Cáo */}
                {showExportOptions && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 text-slate-800 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Tùy Chọn Xuất Báo Cáo</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowExportOptions(false)}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Lựa chọn 1: Xuất Báo Cáo Ngày */}
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      disabled={isExporting}
                      className="w-full p-2.5 text-left rounded-xl hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all flex items-start space-x-2.5 cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">
                          1. Xuất Báo Cáo Ngày (Kèm Ảnh)
                        </p>
                        <p className="text-[11px] text-slate-500 leading-snug">
                          Xuất kết quả công việc hằng ngày theo ngày đang xem ({customDate || 'Hôm nay'}) kèm đầy đủ ảnh hiện trường.
                        </p>
                      </div>
                    </button>

                    {/* Lựa chọn 2: Xuất Báo Cáo Tuần */}
                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-950 flex items-center gap-1">
                          <BarChart3 className="w-3.5 h-3.5 text-blue-700" />
                          <span>2. Xuất Báo Cáo Tuần (Tổng Hợp)</span>
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-200 text-blue-900">
                          Cấp 2
                        </span>
                      </div>
                      <p className="text-[10px] text-blue-900 leading-relaxed font-medium">
                        Tổng hợp toàn bộ việc đã làm & chưa làm, phân loại việc nội bộ và việc nhà thầu ngoài.
                      </p>

                      {/* Bộ chọn tuần */}
                      <div className="flex items-center justify-between bg-white rounded-lg p-1 border border-blue-200 text-xs font-bold text-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(selectedWeekMonday);
                            d.setDate(d.getDate() - 7);
                            setSelectedWeekMonday(d);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                          title="Tuần trước"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[11px] font-mono text-blue-900">
                          {new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(selectedWeekMonday)}
                          {' ➔ '}
                          {(() => {
                            const sun = new Date(selectedWeekMonday);
                            sun.setDate(sun.getDate() + 6);
                            return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(sun);
                          })()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(selectedWeekMonday);
                            d.setDate(d.getDate() + 7);
                            setSelectedWeekMonday(d);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                          title="Tuần sau"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleExportWeeklyExcel}
                        disabled={isExporting}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải Báo Cáo Tuần (.xlsx)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                className={`py-1.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                  countActiveOverdue > 0 ? 'animate-pulse' : ''
                } ${
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

      {/* CƠ CHẾ NHẮC NHỞ CA TRỰC (Theo ca trực thực tế từng người; nhắc trước khi hết ca 60 phút) */}
      {isMyShiftReminderActive && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 shadow-sm">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                  ⏰ Nhắc Nhở Ca Trực ({myShiftCalc.formattedReminderText})
                </span>
                <span className="text-xs font-semibold text-amber-800">
                  Còn 1 tiếng nữa kết thúc ca {myShiftCalc.formattedDeadlineText} ({myShiftCalc.shiftInfo.name})
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900">
                Bạn có {myUnsubmittedDailyTasks.length} công việc hằng ngày chưa gửi báo cáo hoàn thành!
              </p>
              <p className="text-xs text-slate-600 line-clamp-1">
                Công việc: &ldquo;{myUnsubmittedDailyTasks[0].title}&rdquo; &bull; Vui lòng nộp báo cáo kết quả trước {myShiftCalc.formattedDeadlineText}.
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

      {/* Cảnh báo dành cho Cấp Quản Lý / Điều Phối / Giám Sát (Cấp 1, 2, 3) theo dõi tiến độ các ca trực */}
      {!isMyShiftReminderActive && overdueTasksForManager.length > 0 && canReview && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-blue-950 shadow-xs">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-200 text-blue-900">
                  Giám Sát Ca Trực (Trước hết ca 60 phút)
                </span>
                <span className="text-xs text-blue-800">Đôn đốc nộp báo cáo theo ca</span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                Đang có {overdueTasksForManager.length} công việc hằng ngày hôm nay đến hạn nhắc nhở mà chưa nộp báo cáo kết quả.
              </p>
              <p className="text-[11px] text-slate-500">
                Nhân sự phụ trách: {Array.from(new Set(overdueTasksForManager.flatMap((t) => t.assignedToNames || []))).map(n => getPersonalName(n)).join(', ')}
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
              const latestProgressWithImg = task.progressUpdates?.slice().reverse().find(p => p.attachments && p.attachments.length > 0);
              const progressImg = latestProgressWithImg?.attachments?.[0];
              const latestProgress = task.progressUpdates && task.progressUpdates.length > 0
                ? task.progressUpdates[task.progressUpdates.length - 1]
                : null;
              const deadlineDate = task.reportDeadline ? new Date(task.reportDeadline) : (task.dueDate ? new Date(task.dueDate) : null);
              const isValidDeadline = deadlineDate && !isNaN(deadlineDate.getTime());
              const isDueToday = isValidDeadline && deadlineDate.toDateString() === now.toDateString();
              const isRemindTime =
                task.status !== 'APPROVED' &&
                task.status !== 'SUBMITTED' &&
                task.isDaily &&
                (!task.reports || task.reports.length === 0) &&
                isValidDeadline &&
                !task.isDismissedOverdue &&
                now >= new Date(deadlineDate.getTime() - 60 * 60 * 1000);

              return (
                <div
                  key={`mobile-${task.id}`}
                  className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs space-y-2.5 transition-all"
                >
                  {/* Hàng 1: Phân Loại + Nhân Sự + Trạng Thái */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {task.isContractor ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 shrink-0 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-amber-700" />
                          <span>Nhà thầu: {task.contractorName}</span>
                        </span>
                      ) : task.durationDays && task.durationDays > 1 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300 shrink-0">
                          🗓️ Việc {task.durationDays} ngày
                        </span>
                      ) : task.isDaily ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                          ☀️ Việc ngày
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                          📋 Dự án
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-slate-700 truncate">
                        {task.isContractor
                          ? `Giám sát: ${task.assignedToNames?.map((n) => getPersonalName(n)).join(', ') || 'Chưa chỉ định'}`
                          : `👤 ${task.teamName || (task.assignedToNames?.map((n) => getPersonalName(n)).join(', ') || 'Chưa phân công')}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {(task.progressPercent !== undefined || (task.durationDays && task.durationDays > 1)) && task.status !== 'APPROVED' && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {task.progressPercent || 0}%
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          task.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : task.status === 'SUBMITTED'
                            ? 'bg-purple-50 text-purple-800 border border-purple-300'
                            : task.isDismissedOverdue
                            ? 'bg-slate-100 text-slate-700'
                            : isRemindTime
                            ? 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold animate-pulse'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {task.status === 'APPROVED'
                          ? '✓ Đã xong'
                          : task.status === 'SUBMITTED'
                          ? 'Chờ duyệt'
                          : task.isDismissedOverdue
                          ? 'Đang làm'
                          : isRemindTime
                          ? '⏰ Cần nộp'
                          : 'Đang làm'}
                      </span>
                    </div>
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

                  {/* Báo cáo gần nhất hoặc tiến độ thi công nếu có */}
                  {latestReport ? (
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
                  ) : latestProgress ? (
                    <div className="bg-indigo-50/50 rounded-xl p-2.5 border border-indigo-100/70 flex items-start justify-between gap-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200">
                            Tiến độ: {latestProgress.percent}%
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(latestProgress.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {latestProgress.note && (
                          <p className="line-clamp-2 italic text-[11px] text-slate-700">
                            &quot;{latestProgress.note}&quot;
                          </p>
                        )}
                      </div>
                      {progressImg && (
                        <div className="relative shrink-0">
                          <img
                            src={progressImg.url}
                            alt="Ảnh tiến độ"
                            className="w-10 h-10 rounded-lg object-cover border border-indigo-200 shrink-0 cursor-pointer hover:scale-105 transition-transform shadow-xs"
                            onClick={() => onOpenReviewModal(task)}
                          />
                          <span className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-[8px] font-bold px-1 rounded shadow-xs">
                            Ảnh
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}

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
                      {task.isDismissedOverdue && (
                        <span
                          title={`Đã tắt nhắc nhở bởi ${task.dismissedOverdueByName || 'Người dùng'}`}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1"
                        >
                          <span>🔕</span>
                          <span>Đã tắt nhắc</span>
                        </span>
                      )}
                    </div>

                    {/* Các nút thao tác */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                      {/* Nút Bỏ qua / Bật lại thông báo quá hạn */}
                      {task.status !== 'APPROVED' &&
                        isValidDeadline &&
                        now > deadlineDate &&
                        (isManager || isSecretary || task.createdBy === currentUser.id || task.assignedTo.includes(currentUser.id)) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDismissOverdue(task.id);
                            }}
                            title={task.isDismissedOverdue ? 'Bật lại thông báo quá hạn' : 'Bỏ qua / Tắt thông báo quá hạn'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold ${
                              task.isDismissedOverdue
                                ? 'text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-300'
                                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300'
                            }`}
                          >
                            {task.isDismissedOverdue ? (
                              <>
                                <Bell className="w-3.5 h-3.5 text-slate-500" />
                                <span className="hidden xs:inline">Bật lại</span>
                              </>
                            ) : (
                              <>
                                <BellOff className="w-3.5 h-3.5 text-amber-700" />
                                <span className="hidden xs:inline">Bỏ qua</span>
                              </>
                            )}
                          </button>
                        )}
                      {/* Nút Cập nhật nhanh tiến độ (Cấp 1, Cấp 2, Giám sát, Người tạo hoặc Người phụ trách) */}
                      {task.status !== 'APPROVED' && (isManager || isSecretary || task.createdBy === currentUser.id || task.assignedTo.includes(currentUser.id)) && (
                        <button
                          type="button"
                          onClick={() => setQuickProgressTask(task)}
                          title="Cập nhật nhanh tiến độ công việc"
                          className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                        </button>
                      )}

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
                          className="flex items-center space-x-1 text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Chi tiết</span>
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
                  const latestProgressWithImg = task.progressUpdates?.slice().reverse().find(p => p.attachments && p.attachments.length > 0);
                  const progressImg = latestProgressWithImg?.attachments?.[0];
                  const latestProgress = task.progressUpdates && task.progressUpdates.length > 0
                    ? task.progressUpdates[task.progressUpdates.length - 1]
                    : null;
                  const rowDeadline = task.reportDeadline ? new Date(task.reportDeadline) : (task.dueDate ? new Date(task.dueDate) : null);
                  const isRowOverdue = rowDeadline && !isNaN(rowDeadline.getTime()) && now > rowDeadline && task.status !== 'APPROVED';

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-3 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        {task.isContractor ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center space-x-1">
                            <Building2 className="w-3 h-3 text-amber-700" />
                            <span>Nhà thầu: {task.contractorName}</span>
                          </span>
                        ) : task.durationDays && task.durationDays > 1 ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center space-x-1">
                            <span>🗓️ Việc {task.durationDays} ngày</span>
                          </span>
                        ) : task.isDaily ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center space-x-1">
                            <span>☀️ Việc hằng ngày</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center space-x-1">
                            <span>📋 Dự án dài hạn</span>
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 cursor-pointer group"
                        onClick={() => onOpenReviewModal(task)}
                        title="Bấm để xem chi tiết hồ sơ công việc & nộp báo cáo"
                      >
                        <p className="font-bold text-slate-900 leading-snug group-hover:text-blue-600 group-hover:underline transition-colors">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 group-hover:text-slate-700 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                        {(task.progressPercent !== undefined || (task.durationDays && task.durationDays > 1)) && task.status !== 'APPROVED' && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.max(0, task.progressPercent || 0))}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-black text-indigo-700">
                              {task.progressPercent || 0}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task.isContractor ? (
                          <div>
                            <div className="flex items-center gap-1 font-bold text-amber-800 text-xs">
                              <Building2 className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                              <span>{task.contractorName}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Giám sát: {task.teamName || (task.assignedToNames?.map((n) => getPersonalName(n)).join(', ') || 'Chưa chỉ định')}
                            </p>
                            <p className="text-[9px] text-slate-400">Giao bởi: {getPersonalName(task.createdByName || '')}</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-slate-800">
                              {task.teamName || (task.assignedToNames?.map((n) => getPersonalName(n)).join(', ') || 'Chưa phân công')}
                            </p>
                            <p className="text-[10px] text-slate-400">Giao bởi: {getPersonalName(task.createdByName || '')}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        {task.reportDeadline && !isNaN(new Date(task.reportDeadline).getTime()) ? (() => {
                          const deadline = new Date(task.reportDeadline);
                          const isToday = deadline.toDateString() === now.toDateString();
                          const tomorrow = new Date(now);
                          tomorrow.setDate(now.getDate() + 1);
                          const isTomorrow = deadline.toDateString() === tomorrow.toDateString();
                          const isOverdue = now > deadline && task.status !== 'APPROVED';

                          const timeFormatted = deadline.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                          const dateFormatted = isToday
                            ? `Hôm nay (${deadline.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})`
                            : isTomorrow
                            ? `Ngày mai (${deadline.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})`
                            : deadline.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

                          return (
                            <div className="flex flex-col items-center justify-center space-y-0.5">
                              {/* 1. GIỜ HIỂN THỊ Ở TRÊN */}
                              <span
                                className={`text-sm font-extrabold tracking-tight ${
                                  isOverdue ? 'text-rose-600' : 'text-slate-900'
                                }`}
                              >
                                {timeFormatted}
                              </span>

                              {/* 2. NGÀY HIỂN THỊ Ở DƯỚI */}
                              <span
                                className={`text-[11px] font-semibold ${
                                  isToday ? 'text-blue-600 font-bold' : isTomorrow ? 'text-amber-700 font-semibold' : 'text-slate-500'
                                }`}
                              >
                                {dateFormatted}
                              </span>

                              {/* 3. THẺ GIA HẠN / NHẮC NỘP NẾU CÓ */}
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
                              {task.isDismissedOverdue ? (
                                <span
                                  title={`Đã tắt nhắc nhở bởi ${task.dismissedOverdueByName || 'Người dùng'}`}
                                  className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300 inline-flex items-center gap-1"
                                >
                                  <span>🔕</span>
                                  <span>Đã tắt nhắc</span>
                                </span>
                              ) : (
                                task.status !== 'APPROVED' &&
                                task.status !== 'SUBMITTED' &&
                                (!task.reports || task.reports.length === 0) &&
                                now >= new Date(deadline.getTime() - 60 * 60 * 1000) && (
                                  <span className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                    ⏰ Nhắc nộp báo cáo
                                  </span>
                                )
                              )}
                            </div>
                          );
                        })() : (
                          <span className="text-slate-400 text-xs">---</span>
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
                                !task.isDismissedOverdue &&
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
                              !task.isDismissedOverdue &&
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
                        ) : latestProgress ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                Tiến độ: {latestProgress.percent}%
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {new Date(latestProgress.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {latestProgress.note && (
                              <p className="line-clamp-1 italic text-slate-600 mt-0.5">&quot;{latestProgress.note}&quot;</p>
                            )}
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
                        ) : progressImg ? (
                          <div className="flex flex-col items-center justify-center">
                            <div className="relative group cursor-pointer" onClick={() => onOpenReviewModal(task)}>
                              <img
                                src={progressImg.url}
                                alt="Ảnh tiến độ"
                                className="w-10 h-10 rounded-lg object-cover border border-indigo-300 shadow-xs group-hover:scale-110 transition-transform"
                              />
                              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[8px] font-bold px-1 rounded whitespace-nowrap shadow-xs">
                                Tiến độ
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[10px]">Không có</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Nút Cập nhật nhanh tiến độ (Cấp 1, Cấp 2, Giám sát, Người tạo hoặc Người phụ trách) */}
                          {task.status !== 'APPROVED' && (isManager || isSecretary || task.createdBy === currentUser.id || task.assignedTo.includes(currentUser.id)) && (
                            <button
                              type="button"
                              onClick={() => setQuickProgressTask(task)}
                              title="Cập nhật nhanh tiến độ công việc"
                              className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Nút Bỏ qua / Bật lại thông báo quá hạn */}
                          {isRowOverdue &&
                            (isManager || isSecretary || task.createdBy === currentUser.id || task.assignedTo.includes(currentUser.id)) && (
                              <button
                                type="button"
                                onClick={() => toggleDismissOverdue(task.id)}
                                title={task.isDismissedOverdue ? 'Bật lại thông báo quá hạn' : 'Bỏ qua / Tắt thông báo quá hạn'}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold ${
                                  task.isDismissedOverdue
                                    ? 'text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-300'
                                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300'
                                }`}
                              >
                                {task.isDismissedOverdue ? (
                                  <>
                                    <Bell className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="hidden xl:inline">Bật lại</span>
                                  </>
                                ) : (
                                  <>
                                    <BellOff className="w-3.5 h-3.5 text-amber-700" />
                                    <span className="hidden xl:inline">Bỏ qua</span>
                                  </>
                                )}
                              </button>
                            )}

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
                              className="flex items-center space-x-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                              title="Phê duyệt báo cáo"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Duyệt</span>
                            </button>
                          ) : task.assignedTo.includes(currentUser.id) && task.status !== 'APPROVED' ? (
                            <button
                              onClick={() => onOpenReviewModal(task)}
                              className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                              title="Nộp báo cáo công việc"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Nộp</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onOpenReviewModal(task)}
                              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                              title="Bấm để xem chi tiết hồ sơ công việc & nộp báo cáo"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Xem</span>
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
      {/* Modal Cập Nhật Nhanh Tiến Độ Công Việc */}
      <QuickProgressModal
        task={quickProgressTask}
        isOpen={!!quickProgressTask}
        onClose={() => setQuickProgressTask(null)}
      />
    </div>
  );
}
