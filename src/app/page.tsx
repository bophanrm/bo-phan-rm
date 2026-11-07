'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, SHIFTS_CONFIG, ShiftId } from '@/types';
import { Navbar } from '@/components/layout/Navbar';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { SubmitReportModal } from '@/components/tasks/SubmitReportModal';
import { ReviewReportModal } from '@/components/tasks/ReviewReportModal';
import { PlanningBoard } from '@/components/planning/PlanningBoard';
import { ScheduleBoard } from '@/components/schedule/ScheduleBoard';
import { TeamDirectory } from '@/components/teams/TeamDirectory';
import { DailyTracker } from '@/components/daily/DailyTracker';
import { ChatCenter } from '@/components/chat/ChatCenter';
import { getPersonalName } from '@/utils/nameHelper';
import {
  canAssignProject as checkCanAssignProject,
  canViewTask,
  canReviewTask,
  canAssignAnyTask,
  canReviewReports,
} from '@/utils/permissions';
import {
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Layers,
} from 'lucide-react';

export default function Home() {
  const { tasks, currentUser, users, shifts, getShiftForUser, teams, shiftsConfig } = useApp();

  const [mounted, setMounted] = useState(false);
  const [currentTab, setCurrentTab] = useState<'tasks' | 'planning' | 'schedule' | 'teams' | 'chat'>('tasks');

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateDaily, setIsCreateDaily] = useState(false);
  const [createTaskDueDate, setCreateTaskDueDate] = useState<string | undefined>(undefined);
  const [reportTask, setReportTask] = useState<Task | null>(null);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);

  // Lọc chỉ những task mà currentUser có quyền thấy theo phân quyền:
  // - Cấp 4 chỉ thấy việc được giao cho mình
  // - Cấp 3 chỉ thấy việc hằng ngày của Cấp 4 để duyệt (và việc giao cho chính mình)
  // - Cấp 1 & 2 thấy tất cả
  const visibleTasks = tasks.filter((t) => canViewTask(currentUser, t, users));

  const canAssign = canAssignAnyTask(currentUser);
  const canReview = canReviewReports(currentUser);

  // Stats calculation dựa trên visibleTasks
  const totalTasks = visibleTasks.length;
  const inProgressTasks = visibleTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'TODO').length;
  // Số báo cáo chờ duyệt mà người này có quyền duyệt
  const submittedTasks = visibleTasks.filter(
    (t) => t.status === 'SUBMITTED' && canReviewTask(currentUser, t, users)
  ).length;
  const completedTasks = visibleTasks.filter((t) => t.status === 'APPROVED').length;

  // Lấy thông tin ca làm việc hôm nay và ngày mai cho tất cả các cấp độ
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const todayShift = getShiftForUser
    ? getShiftForUser(currentUser.id, todayStr)
    : shifts.find((s) => s.userId === currentUser.id && s.date === todayStr);

  const tomorrowShift = getShiftForUser
    ? getShiftForUser(currentUser.id, tomorrowStr)
    : shifts.find((s) => s.userId === currentUser.id && s.date === tomorrowStr);

  const getShiftDisplay = (shift?: { shiftId: ShiftId; isHalfDay?: boolean } | null, date?: Date) => {
    const shiftId = shift?.shiftId;
    const isHalfDay = !!shift?.isHalfDay;
    const halfSuffix = isHalfDay ? ' (Nghỉ 1/2 ca)' : '';

    const customConfig = shiftsConfig?.find((s) => s.id === shiftId);
    if (customConfig) {
      return {
        name: `${customConfig.name}${halfSuffix}`,
        time: customConfig.hasNoTime ? '' : customConfig.timeRange,
        isOff: shiftId === 'OFF' || Boolean(customConfig.hasNoTime),
      };
    }
    if (shiftId && SHIFTS_CONFIG[shiftId]) {
      const config = SHIFTS_CONFIG[shiftId];
      return {
        name: `${config.name}${halfSuffix}`,
        time: config.hasNoTime ? '' : config.timeRange,
        isOff: shiftId === 'OFF' || Boolean(config.hasNoTime),
      };
    }
    const isSunday = date ? date.getDay() === 0 : false;
    if (isSunday) {
      return {
        name: 'Nghỉ Ca',
        time: 'Chủ nhật',
        isOff: true,
      };
    }
    return {
      name: `Ca Hành Chính${halfSuffix}`,
      time: '7h30 - 16h',
      isOff: false,
    };
  };

  const todayShiftInfo = getShiftDisplay(todayShift, today);
  const tomorrowShiftInfo = getShiftDisplay(tomorrowShift, tomorrow);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openCreateModal={(isDaily) => {
          setIsCreateDaily(!!isDaily);
          setIsCreateOpen(true);
        }}
      />

      <main className="w-full px-3 sm:px-6 lg:px-8 xl:px-10 pt-4 sm:pt-6 pb-24 sm:pb-12 space-y-4 sm:space-y-6">
        {/* Welcome Banner & Role Card - Thiết kế cân đối thẩm mỹ */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl shadow-blue-600/15 border border-blue-500/25 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          {/* Subtle background glow effect */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          {/* Cột trái: Thông tin chức danh, lời chào và lịch ca */}
          <div className="relative z-10 flex-1 space-y-2.5">
            <div className="inline-flex items-center">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15 text-white backdrop-blur-md border border-white/20 shadow-xs">
                {currentUser.role === 'ADMIN'
                  ? '🛡️ Quản Trị Viên • Vận Hành Hệ Thống'
                  : currentUser.level === 'LEVEL_1_MANAGER' || currentUser.role === 'MANAGER'
                  ? '⭐ Cấp 1 • Quản Lý'
                  : currentUser.level === 'LEVEL_2_SECRETARY' || currentUser.role === 'SECRETARY'
                  ? '📝 Cấp 2 • Nhân Viên Điều Phối'
                  : currentUser.level === 'LEVEL_3_LEAD'
                  ? '🔍 Cấp 3 • Giám Sát'
                  : '🔧 Cấp 4 • Nhân Viên'}
              </span>
            </div>

            <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight leading-snug">
              {currentUser.role === 'ADMIN'
                ? 'Chào Quản Trị Viên, hệ thống đang vận hành ổn định!'
                : canReview && submittedTasks > 0
                ? `Chào ${getPersonalName(currentUser.name, false)}, có ${submittedTasks} báo cáo cần duyệt!`
                : `Chào ${getPersonalName(currentUser.name, false)}, chúc bạn một ngày làm việc hiệu quả!`}
            </h1>

            {/* Dòng ca hôm nay & ca ngày mai hoặc thông báo quyền cho Admin */}
            {currentUser.role === 'ADMIN' ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-xs text-xs">
                <span className="font-semibold text-blue-100">
                  &ldquo;Tài khoản này có đầy đủ mọi thẩm quyền cao nhất: thêm/sửa/xoá nhân viên, phân quyền 4 cấp bậc, tạo tổ/đội.&rdquo;
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-xs">
                  <span className="text-blue-100 font-medium">📍 Ca hôm nay:</span>
                  <span className={`font-bold ${todayShiftInfo.isOff ? 'text-amber-200' : 'text-emerald-300'}`}>
                    {todayShiftInfo.name}{todayShiftInfo.time ? ` (${todayShiftInfo.time})` : ''}
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-xs">
                  <span className="text-blue-200 font-medium">🗓️ Ca ngày mai:</span>
                  <span className={`font-bold ${tomorrowShiftInfo.isOff ? 'text-amber-200' : 'text-emerald-300'}`}>
                    {tomorrowShiftInfo.name}{tomorrowShiftInfo.time ? ` (${tomorrowShiftInfo.time})` : ''}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Cột phải: Nút Giao Việc nổi bật, cân đối hoàn hảo trên Desktop và Mobile */}
          {canAssign && (
            <div className="relative z-10 flex items-center justify-end md:self-center shrink-0 pt-1 md:pt-0">
              <button
                onClick={() => {
                  setIsCreateDaily(!checkCanAssignProject(currentUser));
                  setIsCreateOpen(true);
                }}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-xl shadow-amber-500/25 border border-amber-200/90 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 shrink-0" />
                <span className="tracking-wider uppercase font-black text-xs sm:text-sm">Giao việc</span>
              </button>
            </div>
          )}
        </div>

        {/* Bento KPI Summary Metrics */}
        {currentUser.role === 'ADMIN' ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex items-center space-x-2.5 sm:space-x-3.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tổng nhân sự</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  {users.filter((u) => u.role !== 'ADMIN').length} người
                </h3>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex items-center space-x-2.5 sm:space-x-3.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tổng tổ / đội</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{teams.length} tổ</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex items-center space-x-2.5 sm:space-x-3.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Toàn bộ công việc</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{tasks.length}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex items-center space-x-2.5 sm:space-x-3.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Đã hoàn thành</p>
                <h3 className="text-lg sm:text-xl font-bold text-emerald-600 leading-tight">
                  {tasks.filter((t) => t.status === 'APPROVED').length}
                </h3>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex items-center space-x-2.5 sm:space-x-3.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tổng việc</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{totalTasks}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex items-center space-x-2.5 sm:space-x-3.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Đang làm</p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{inProgressTasks}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex items-center space-x-2.5 sm:space-x-3.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Chờ duyệt</p>
                <h3 className="text-lg sm:text-xl font-bold text-rose-600 leading-tight">{submittedTasks}</h3>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-sm flex items-center space-x-2.5 sm:space-x-3.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 uppercase tracking-wider">Đã xong</p>
                <h3 className="text-lg sm:text-xl font-bold text-emerald-600 leading-tight">{completedTasks}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Content Tabs Switcher */}
        {currentTab === 'tasks' ? (
          <DailyTracker
            onOpenReportModal={(t) => setReportTask(t)}
            onOpenReviewModal={(t) => setReviewTask(t)}
          />
        ) : currentTab === 'planning' ? (
          <PlanningBoard
            onOpenCreateModal={(dateStr?: string) => {
              setIsCreateDaily(false);
              setCreateTaskDueDate(dateStr);
              setIsCreateOpen(true);
            }}
            onOpenReviewModal={(t) => setReviewTask(t)}
            onOpenReportModal={(t) => setReportTask(t)}
          />
        ) : currentTab === 'schedule' ? (
          <ScheduleBoard />
        ) : currentTab === 'chat' ? (
          <ChatCenter />
        ) : (
          <TeamDirectory />
        )}
      </main>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setIsCreateDaily(false);
          setCreateTaskDueDate(undefined);
        }}
        initialIsDaily={isCreateDaily}
        initialDueDate={createTaskDueDate}
      />
      <SubmitReportModal task={reportTask} isOpen={!!reportTask} onClose={() => setReportTask(null)} />
      <ReviewReportModal task={reviewTask} isOpen={!!reviewTask} onClose={() => setReviewTask(null)} />
    </div>
  );
}
