'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Task, NotificationItem } from '@/types';
import {
  Bell,
  CheckCheck,
  X,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask?: (task: Task) => void;
  onNavigateTab?: (tab: 'tasks' | 'planning' | 'schedule' | 'teams' | 'chat') => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  onSelectTask,
  onNavigateTab,
}: NotificationDrawerProps) {
  const { notifications, currentUser, tasks, markNotificationAsRead, markAllNotificationsAsRead } = useApp();

  if (!isOpen) return null;

  const userNotifs = notifications.filter((n) => n.userId === currentUser.id || !n.userId);
  const unreadNotifs = userNotifs.filter((n) => !n.isRead);

  const handleNotificationClick = (notif: NotificationItem) => {
    // 1. Luôn đánh dấu đã đọc
    markNotificationAsRead(notif.id);

    // 2. Nếu thông báo có gắn taskId, mở ngay công việc đó
    if (notif.taskId) {
      const targetTask = tasks.find((t) => t.id === notif.taskId);
      if (targetTask) {
        onClose();
        if (onNavigateTab) {
          onNavigateTab('tasks');
        }
        if (onSelectTask) {
          onSelectTask(targetTask);
        }
        return;
      }
    }

    // 3. Nếu là thông báo về Lịch làm việc
    const titleLower = notif.title.toLowerCase();
    if (
      titleLower.includes('lịch làm việc') ||
      titleLower.includes('lịch trực') ||
      notif.message.toLowerCase().includes('lịch làm việc')
    ) {
      onClose();
      if (onNavigateTab) {
        onNavigateTab('schedule');
      }
      return;
    }
  };

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Thông Báo Hệ Thống</h3>
              <span className="text-[10px] text-slate-500">
                {unreadNotifs.length > 0 ? `${unreadNotifs.length} thông báo mới chưa đọc` : 'Tất cả đã đọc'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            {unreadNotifs.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Đánh dấu tất cả là đã đọc"
              >
                Đọc tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {userNotifs.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <CheckCheck className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-slate-700">Không có thông báo mới</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Khi quản lý giao việc, có báo cáo cần duyệt hoặc nhắc lịch trực, thông báo sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            userNotifs.map((notif) => {
              const hasTask = !!notif.taskId && tasks.some((t) => t.id === notif.taskId);
              const isSchedule =
                notif.title.toLowerCase().includes('lịch') ||
                notif.message.toLowerCase().includes('lịch làm việc');

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group p-3.5 rounded-xl transition-all cursor-pointer border ${
                    notif.isRead
                      ? 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200'
                      : 'bg-blue-50/70 hover:bg-blue-50 border-l-4 border-l-blue-600 border-blue-100 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      {isSchedule ? (
                        <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : hasTask ? (
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <Bell className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <h4 className="text-xs font-bold text-slate-900 truncate">{notif.title}</h4>
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center space-x-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(notif.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{notif.message}</p>

                  {/* Hành động trực quan khi nhấp: dẫn thẳng tới công việc hoặc lịch làm việc */}
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-100">
                    {hasTask ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-700 bg-white group-hover:bg-blue-600 group-hover:text-white px-2 py-0.5 rounded-md border border-blue-200 group-hover:border-blue-600 transition-all shadow-2xs">
                        <span>👉 Nhấn để mở công việc</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    ) : isSchedule ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-indigo-700 bg-white group-hover:bg-indigo-600 group-hover:text-white px-2 py-0.5 rounded-md border border-indigo-200 group-hover:border-indigo-600 transition-all shadow-2xs">
                        <span>👉 Nhấn để xem lịch làm việc</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Nhấn để đánh dấu đã đọc</span>
                    )}

                    <span className="text-[10px] text-slate-400">
                      {new Date(notif.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            🔔 Nhấn vào thông báo để mở thẳng công việc hoặc lịch làm việc
          </p>
        </div>
      </div>
    </div>
  );
}
