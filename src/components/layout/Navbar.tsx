'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Bell,
  Shield,
  Calendar,
  CheckSquare,
  DownloadCloud,
  Users,
  UserCheck,
  ChevronDown,
  X,
  Plus,
  Sun,
  Clock,
  Smartphone,
  MessageSquare,
} from 'lucide-react';
import { NotificationDrawer } from '../notifications/NotificationDrawer';
import { BackupDrawer } from '../backup/BackupDrawer';
import { getPersonalName } from '@/utils/nameHelper';
import { canAssignProject as checkCanAssignProject, canAssignAnyTask, canViewTask } from '@/utils/permissions';

interface NavbarProps {
  currentTab: 'tasks' | 'planning' | 'schedule' | 'teams' | 'chat';
  setCurrentTab: (tab: 'tasks' | 'planning' | 'schedule' | 'teams' | 'chat') => void;
  openCreateModal: (isDaily?: boolean) => void;
}

export function Navbar({ currentTab, setCurrentTab, openCreateModal }: NavbarProps) {
  const { currentUser, setCurrentUser, users, tasks, unreadCount, unreadMessagesCount } = useApp();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);

  const canAssign = canAssignAnyTask(currentUser);

  // Count daily tasks for today badge
  const todayStr = new Date().toDateString();
  const todayTasksCount = tasks
    .filter((t) => canViewTask(currentUser, t, users))
    .filter((t) => t.isDaily || new Date(t.dueDate).toDateString() === todayStr).length;

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="w-full px-3 sm:px-6 lg:px-8 xl:px-10 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand with Original Logo */}
          <div className="flex items-center space-x-2.5 shrink-0 select-none">
            <img
              src="/logo.png"
              alt="Logo Bộ Phận RM Song Be Golf Resort"
              className="h-10 sm:h-11 w-auto object-contain shrink-0"
            />
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg leading-tight whitespace-nowrap">
                Bộ Phận RM
              </span>
              <p className="text-[11px] font-semibold text-slate-500 leading-none whitespace-nowrap mt-0.5">
                Hệ thống công việc
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile) */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setCurrentTab('tasks')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'tasks' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span>Tất cả công việc</span>
              {todayTasksCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                  {todayTasksCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentTab('planning')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'planning' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Kế hoạch</span>
            </button>
            <button
              onClick={() => setCurrentTab('schedule')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'schedule' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Lịch Làm Việc</span>
            </button>
            <button
              onClick={() => setCurrentTab('chat')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
                currentTab === 'chat' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Tin nhắn</span>
              {unreadMessagesCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center ml-0.5">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentTab('teams')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'teams' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Danh sách nhân viên</span>
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Notification Bell (Cả Mobile & Desktop) */}
            <button
              onClick={() => setShowNotifs(true)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 relative transition-colors"
              aria-label="Thông báo"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Backup status / manual export */}
            <button
              onClick={() => setShowBackup(true)}
              title="Sao lưu dự phòng Google Drive"
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 relative transition-colors"
            >
              <DownloadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Mobile Preview Link */}
            <Link
              href="/preview"
              title="Mở giả lập xem trên điện thoại (Mobile Simulator)"
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-semibold transition-all border border-slate-200"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span>Xem Mobile</span>
            </Link>

            {/* User Switcher Pill / Button */}
            <button
              onClick={() => setShowUserModal(true)}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-800 truncate max-w-[160px] sm:max-w-[220px]">
                {getPersonalName(currentUser.name)}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (iOS/Android Native Feel - 4 Tabs) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 py-1 flex items-center justify-around shadow-lg">
        <button
          onClick={() => setCurrentTab('tasks')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-all relative ${
            currentTab === 'tasks' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Công việc</span>
          {todayTasksCount > 0 && (
            <span className="absolute top-0 right-3 w-4 h-4 rounded-full bg-blue-600 text-[9px] font-bold text-white flex items-center justify-center">
              {todayTasksCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentTab('planning')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-all ${
            currentTab === 'planning' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Kế hoạch</span>
        </button>

        <button
          onClick={() => setCurrentTab('schedule')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-all ${
            currentTab === 'schedule' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Lịch ca</span>
        </button>

        <button
          onClick={() => setCurrentTab('chat')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-all relative ${
            currentTab === 'chat' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Tin nhắn</span>
          {unreadMessagesCount > 0 && (
            <span className="absolute top-0 right-3 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center">
              {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentTab('teams')}
          className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[44px] transition-all ${
            currentTab === 'teams' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Nhân viên</span>
        </button>
      </div>

      {/* Switch User Modal / Bottom Sheet */}
      {showUserModal && (
        <div
          onClick={() => setShowUserModal(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Đổi Tài Khoản Thử Nghiệm</h3>
                <p className="text-xs text-slate-500">Chuyển đổi góc nhìn Quản Lý, Nhân Viên Điều Phối, hoặc Nhân Viên</p>
              </div>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {users.map((u) => {
                const isSelected = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      setShowUserModal(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-bold text-sm text-slate-900">{getPersonalName(u.name)}</p>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              u.role === 'ADMIN'
                                ? 'bg-indigo-950 text-indigo-100 border border-indigo-800'
                                : u.level === 'LEVEL_1_MANAGER' || u.role === 'MANAGER'
                                ? 'bg-amber-100 text-amber-800'
                                : u.level === 'LEVEL_2_SECRETARY' || u.role === 'SECRETARY'
                                ? 'bg-blue-100 text-blue-800'
                                : u.level === 'LEVEL_3_LEAD'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.role === 'ADMIN'
                              ? 'Quản Trị Viên'
                              : u.level === 'LEVEL_1_MANAGER' || u.role === 'MANAGER'
                              ? 'Cấp 1 • Quản Lý'
                              : u.level === 'LEVEL_2_SECRETARY' || u.role === 'SECRETARY'
                              ? 'Cấp 2 • Nhân Viên Điều Phối'
                              : u.level === 'LEVEL_3_LEAD'
                              ? 'Cấp 3 • Giám Sát'
                              : 'Cấp 4 • Nhân Viên'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected && <span className="text-xs font-bold text-blue-600">Đang chọn</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Notification Drawer */}
      <NotificationDrawer isOpen={showNotifs} onClose={() => setShowNotifs(false)} />

      {/* Backup Drawer */}
      <BackupDrawer isOpen={showBackup} onClose={() => setShowBackup(false)} />
    </>
  );
}
