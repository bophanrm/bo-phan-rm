'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Bell, CheckCheck, X, Clock, AlertCircle } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { notifications, currentUser, markNotificationAsRead } = useApp();

  if (!isOpen) return null;

  const userNotifs = notifications.filter((n) => n.userId === currentUser.id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Thông Báo Hệ Thống</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-medium text-slate-600">
              {userNotifs.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {userNotifs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <CheckCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">Không có thông báo mới</p>
              <p className="text-xs text-slate-400 mt-1">
                Khi quản lý giao việc hoặc có phản hồi duyệt, thông báo sẽ hiện ở đây.
              </p>
            </div>
          ) : (
            userNotifs.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markNotificationAsRead(notif.id)}
                className={`p-3.5 rounded-xl transition-all cursor-pointer ${
                  notif.isRead
                    ? 'bg-white hover:bg-slate-50'
                    : 'bg-blue-50/60 hover:bg-blue-50 border-l-4 border-blue-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-xs font-semibold text-slate-900">{notif.title}</h4>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(notif.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-[11px] text-slate-500">
            🔔 Thông báo tự động đẩy đến màn hình khóa điện thoại qua 4G/5G
          </p>
        </div>
      </div>
    </div>
  );
}
