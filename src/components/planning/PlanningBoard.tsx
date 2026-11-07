'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Task } from '@/types';
import {
  Calendar,
  Clock,
  CheckCircle,
  Users,
  PlusCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  CalendarDays,
  AlertTriangle,
  FolderKanban,
} from 'lucide-react';
import { canAssignProject as checkCanAssignProject, canViewTask } from '@/utils/permissions';
import { getPersonalName } from '@/utils/nameHelper';

interface PlanningBoardProps {
  onOpenCreateModal: (dateStr?: string) => void;
  onOpenReviewModal: (task: Task) => void;
  onOpenReportModal: (task: Task) => void;
}

export function PlanningBoard({ onOpenCreateModal, onOpenReviewModal, onOpenReportModal }: PlanningBoardProps) {
  const { tasks, currentUser, users, teams } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

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

  // Reference Monday for this week
  const thisWeekMonday = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = (day + 6) % 7;
    const mon = new Date(today);
    mon.setDate(today.getDate() - diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  }, []);

  const thisMondayTime = thisWeekMonday.getTime();
  const currentMondayTime = currentMonday.getTime();
  const isPastWeek = currentMondayTime < thisMondayTime;
  const isCurrentWeek = currentMondayTime === thisMondayTime;
  const isFutureWeek = currentMondayTime > thisMondayTime;

  // Active day index on mobile (0 to 6, default to today if in current week, else Monday)
  const todayDay = new Date().getDay();
  const todayMondayIndex = (todayDay + 6) % 7;
  const [mobileActiveDayIdx, setMobileActiveDayIdx] = useState<number>(isCurrentWeek ? todayMondayIndex : 0);

  // Generate 7 days of the selected week with exact dates
  const daysOfWeek = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
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
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        isToday,
      };
    });
  }, [currentMonday]);

  // Week navigation
  const goToPreviousWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(currentMonday.getDate() - 7);
    setCurrentMonday(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(currentMonday.getDate() + 7);
    setCurrentMonday(next);
  };

  const goToThisWeek = () => {
    setCurrentMonday(new Date(thisWeekMonday));
    setMobileActiveDayIdx(todayMondayIndex);
  };

  // Chỉ hiển thị các task mà currentUser có quyền thấy theo phân cấp
  const visibleTasks = tasks.filter((t) => canViewTask(currentUser, t, users));

  // Filter tasks by selected staff or team
  const filteredTasks =
    selectedFilter === 'ALL'
      ? visibleTasks
      : visibleTasks.filter((t) => {
          if (selectedFilter.startsWith('team:')) {
            const teamId = selectedFilter.replace('team:', '');
            const team = teams.find((tm) => tm.id === teamId);
            return team && t.assignedTo.some((memberId) => team.memberIds.includes(memberId));
          }
          return t.assignedTo.includes(selectedFilter);
        });

  // Helper tìm công việc theo ngày cụ thể (dựa trên dueDate hoặc khoảng startDate - dueDate)
  const getTasksForDate = (dateStr: string) => {
    return filteredTasks.filter((t) => {
      const dueStr = t.dueDate ? t.dueDate.split('T')[0] : '';
      const startStr = t.startDate ? t.startDate.split('T')[0] : '';
      return dueStr === dateStr || (startStr && startStr <= dateStr && dueStr >= dateStr);
    });
  };

  // Tasks in the selected week
  const weekStartStr = daysOfWeek[0].dateStr;
  const weekEndStr = daysOfWeek[6].dateStr;
  const tasksInWeek = useMemo(() => {
    return filteredTasks.filter((t) => {
      const dueStr = t.dueDate ? t.dueDate.split('T')[0] : '';
      const startStr = t.startDate ? t.startDate.split('T')[0] : '';
      return (dueStr >= weekStartStr && dueStr <= weekEndStr) || (startStr && startStr <= weekEndStr && dueStr >= weekStartStr);
    });
  }, [filteredTasks, weekStartStr, weekEndStr]);

  const completedInWeek = tasksInWeek.filter((t) => t.status === 'APPROVED').length;
  const progressInWeek = tasksInWeek.length > 0 ? Math.round((completedInWeek / tasksInWeek.length) * 100) : 0;

  const canAssignProject = checkCanAssignProject(currentUser);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Header Controls Card */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
              <FolderKanban className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Kế Hoạch & Tiến Độ Công Việc Theo Tuần
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500">
            Xem lại công việc các tuần trước, theo dõi tuần này và lập kế hoạch cho các tuần tiếp theo
          </p>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap gap-y-2">
          {/* Filter by staff or team */}
          <div className="flex-1 sm:flex-none">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full sm:w-auto text-xs font-semibold bg-slate-100 border-none rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">👥 Tất cả ({visibleTasks.length} việc)</option>
              <optgroup label="Theo Tổ / Đội">
                {teams.map((tm) => (
                  <option key={tm.id} value={`team:${tm.id}`}>
                    📁 {tm.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Theo Từng Nhân Sự">
                {users
                  .filter((u) => {
                    if (currentUser.level === 'LEVEL_4_STAFF' || (currentUser.role === 'STAFF' && currentUser.level !== 'LEVEL_3_LEAD')) {
                      return u.id === currentUser.id;
                    }
                    if (currentUser.level === 'LEVEL_3_LEAD') {
                      return u.level === 'LEVEL_4_STAFF' || (u.role === 'STAFF' && u.level !== 'LEVEL_3_LEAD') || u.level === 'LEVEL_3_LEAD' || u.id === currentUser.id;
                    }
                    return true;
                  })
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      👤 {getPersonalName(u.name, true)}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {canAssignProject && (
            <button
              onClick={() => onOpenCreateModal(daysOfWeek[0].dateStr)}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all shrink-0 active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isFutureWeek ? 'Lập kế hoạch tuần này' : isPastWeek ? 'Giao bù việc tuần này' : 'Giao dự án tuần'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Week Navigator & Progress Bar */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Navigation buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={goToPreviousWeek}
            title="Xem lại các tuần trước"
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

          <button
            onClick={goToNextWeek}
            title="Lập kế hoạch các tuần tiếp theo"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs sm:text-sm font-bold text-slate-900 ml-1">
            {daysOfWeek[0].dayNumber}/{daysOfWeek[0].monthNumber} &ndash; {daysOfWeek[6].dayNumber}/{daysOfWeek[6].monthNumber}/{daysOfWeek[6].date.getFullYear()}
          </span>

          {/* Badge nhận diện tuần */}
          {isCurrentWeek ? (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              📍 Tuần Hiện Tại
            </span>
          ) : isPastWeek ? (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              📜 Lịch Đã Qua ({completedInWeek}/{tasksInWeek.length} hoàn thành)
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
              🚀 Kế Hoạch Tuần Tới ({tasksInWeek.length} việc đã lên)
            </span>
          )}
        </div>

        {/* Tiến độ tóm tắt tuần */}
        <div className="flex items-center space-x-3 text-xs self-end md:self-auto">
          <span className="text-slate-500 font-medium">
            {isPastWeek ? (
              <span>Kết quả: <strong>{completedInWeek}/{tasksInWeek.length}</strong> việc xong</span>
            ) : isFutureWeek ? (
              <span>Dự kiến: <strong>{tasksInWeek.length}</strong> công việc</span>
            ) : (
              <span>Tiến độ tuần: <strong>{completedInWeek}/{tasksInWeek.length}</strong> ({progressInWeek}%)</span>
            )}
          </span>
          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressInWeek === 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${tasksInWeek.length > 0 ? progressInWeek : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Mobile View: Day Carousel + List by Day */}
      <div className="md:hidden space-y-3">
        {/* Day selector tabs */}
        <div className="grid grid-cols-7 gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm text-center">
          {daysOfWeek.map((day) => {
            const dayTasks = getTasksForDate(day.dateStr);
            const isSelected = mobileActiveDayIdx === day.index;
            return (
              <button
                key={day.index}
                onClick={() => setMobileActiveDayIdx(day.index)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                    : day.isToday
                    ? 'bg-blue-50 text-blue-900 border border-blue-200 font-semibold'
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-[10px] leading-tight">{day.name}</span>
                <span className="text-xs font-bold leading-tight mt-0.5">{day.dayNumber}</span>
                <span
                  className={`text-[9px] mt-1 px-1 rounded-full font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : dayTasks.length > 0
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-300'
                  }`}
                >
                  {dayTasks.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Day Tasks on Mobile */}
        {(() => {
          const activeDay = daysOfWeek[mobileActiveDayIdx] || daysOfWeek[0];
          if (!activeDay) return null;
          const activeTasks = getTasksForDate(activeDay.dateStr);
          return (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {activeDay.fullName} ({activeDay.dayNumber}/{activeDay.monthNumber})
                  </span>
                  {activeDay.isToday && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                      Hôm nay
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-blue-600">
                    {activeTasks.length} công việc
                  </span>
                  {canAssignProject && (
                    <button
                      onClick={() => onOpenCreateModal(activeDay.dateStr)}
                      className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title="Thêm kế hoạch cho ngày này"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                {activeTasks.length === 0 ? (
                  <div className="text-center py-8 px-2 space-y-2">
                    <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-400">Chưa có công việc nào trong ngày này</p>
                    {canAssignProject && (
                      <button
                        onClick={() => onOpenCreateModal(activeDay.dateStr)}
                        className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Thêm kế hoạch công việc</span>
                      </button>
                    )}
                  </div>
                ) : (
                  activeTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onOpenReviewModal(task)}
                      className="bg-slate-50 hover:bg-blue-50/50 p-3.5 rounded-xl border border-slate-200 transition-all text-left space-y-2 cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {task.teamName && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md truncate">
                            {task.teamName}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-auto ${
                            task.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : task.status === 'SUBMITTED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {task.status === 'APPROVED' ? '✓ Đã xong' : task.status === 'SUBMITTED' ? 'Chờ duyệt' : 'Đang làm'}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{task.title}</h4>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">
                        <span className="font-semibold text-slate-700 truncate max-w-[180px]">
                          👤 {task.assignedToNames?.map((n) => getPersonalName(n)).join(', ') || 'Chưa phân công'}
                        </span>
                        {task.dueDate && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            Hạn: {new Date(task.dueDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 4. Desktop Week Grid (7 Columns) */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-7 gap-3">
        {daysOfWeek.map((day) => {
          const dayTasks = getTasksForDate(day.dateStr);

          return (
            <div
              key={day.index}
              className={`rounded-2xl border p-3 flex flex-col min-h-[340px] transition-all ${
                day.isToday
                  ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-400/30'
                  : 'bg-slate-50/80 border-slate-200/80'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      {day.fullName}
                    </span>
                    {day.isToday && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {day.dayNumber}/{day.monthNumber}
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      dayTasks.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-500'
                    }`}
                  >
                    {dayTasks.length}
                  </span>
                  {canAssignProject && (
                    <button
                      onClick={() => onOpenCreateModal(day.dateStr)}
                      className="p-1 rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 transition-colors"
                      title={`Thêm kế hoạch cho ${day.fullName} (${day.dayNumber}/${day.monthNumber})`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Day Tasks List */}
              <div className="space-y-2 flex-1">
                {dayTasks.length === 0 ? (
                  <div className="text-center py-12 px-2 space-y-2">
                    <p className="text-[11px] text-slate-400">Trống lịch</p>
                    {canAssignProject && (
                      <button
                        onClick={() => onOpenCreateModal(day.dateStr)}
                        className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Thêm việc</span>
                      </button>
                    )}
                  </div>
                ) : (
                  dayTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onOpenReviewModal(task)}
                      className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer text-left space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        {task.teamName && (
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded truncate max-w-[100px]">
                            {task.teamName}
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ml-auto ${
                            task.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : task.status === 'SUBMITTED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {task.status === 'APPROVED' ? '✓ Xong' : task.status === 'SUBMITTED' ? 'Chờ duyệt' : 'Đang làm'}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                        {task.title}
                      </h4>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="truncate font-medium text-slate-700 max-w-[130px]">
                          {getPersonalName(task.assignedToNames?.[0] || 'Nhân sự')}
                          {task.assignedToNames && task.assignedToNames.length > 1 ? ` +${task.assignedToNames.length - 1}` : ''}
                        </span>
                        {task.dueDate && (
                          <span className="text-[9px] text-slate-400">
                            {new Date(task.dueDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
