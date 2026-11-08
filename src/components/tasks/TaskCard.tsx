'use client';

import React from 'react';
import { Task, User } from '@/types';
import { useApp } from '@/context/AppContext';
import { Clock, Calendar, CheckCircle, AlertTriangle, FileText, ArrowRight, Users, ShieldCheck } from 'lucide-react';
import { getPersonalName } from '@/utils/nameHelper';
import { canReviewTask } from '@/utils/permissions';

interface TaskCardProps {
  task: Task;
  onOpenReportModal: (task: Task) => void;
  onOpenReviewModal: (task: Task) => void;
}

export function TaskCard({ task, onOpenReportModal, onOpenReviewModal }: TaskCardProps) {
  const { currentUser, users } = useApp();

  const isReviewer = canReviewTask(currentUser, task, users);

  const isAssignedToMe = task.assignedTo.includes(currentUser.id);

  // Status mapping
  const getStatusBadge = () => {
    if (task.extensionRequest?.status === 'PENDING') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse whitespace-nowrap">
          ⏳ Xin gia hạn
        </span>
      );
    }

    switch (task.status) {
      case 'TODO':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">Mới giao</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">Đang làm</span>;
      case 'SUBMITTED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 animate-pulse whitespace-nowrap">Chờ duyệt</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 flex items-center space-x-1 whitespace-nowrap">
          <CheckCircle className="w-3 h-3 inline mr-0.5" />
          <span>Hoàn thành</span>
        </span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 whitespace-nowrap">Cần sửa</span>;
      default:
        return null;
    }
  };

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'URGENT':
        return <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">Khẩn cấp</span>;
      case 'HIGH':
        return <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">Ưu tiên cao</span>;
      case 'MEDIUM':
        return <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Bình thường</span>;
      case 'LOW':
        return <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Thấp</span>;
    }
  };

  const isOverdue = new Date(task.reportDeadline) < new Date() && task.status !== 'APPROVED';

  // Get assigned users objects
  const assignedUsers = task.assignedTo
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean) as User[];

  return (
    <div className="bg-white rounded-2xl sm:rounded-bento border border-slate-200/80 p-4 sm:p-5 shadow-sm sm:shadow-bento hover:shadow-bento-hover transition-all flex flex-col justify-between">
      <div>
        {/* Header Badges */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {getPriorityBadge()}
            {task.isDirectToStaff && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                <span>🔒 Việc riêng Cấp 1</span>
              </span>
            )}
            {isOverdue && (
              <span className="flex items-center space-x-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                <AlertTriangle className="w-3 h-3" />
                <span>Quá hạn</span>
              </span>
            )}
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Team Tag if assigned to a team */}
        {task.teamName && (
          <div className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-blue-800 bg-blue-50/80 px-2.5 py-0.5 rounded-md mb-2 border border-blue-200/60">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>{task.teamName}</span>
          </div>
        )}

        {/* Title & Description */}
        <div onClick={() => onOpenReviewModal(task)} className="cursor-pointer group">
          <h3 className="font-bold text-slate-900 text-base leading-snug tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
            {task.title}
          </h3>
          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
            {task.description}
          </p>
        </div>
      </div>

      <div>
        {/* Deadlines & Reviewers Tag */}
        <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1.5 text-xs text-slate-600 border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Hạn hoàn thành:</span>
            </span>
            <span className="font-medium text-slate-800">
              {new Date(task.dueDate).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Hạn nộp báo cáo:</span>
            </span>
            <span className="font-semibold text-slate-900">
              {new Date(task.reportDeadline).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Dual Reviewer notice */}
          <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Nơi nhận báo cáo:</span>
            </span>
            <span className="font-semibold text-amber-800 truncate max-w-[160px]">
              {task.isDirectToStaff
                ? 'Ban Quản Lý (Cấp 1 duyệt)'
                : task.reviewerNames && task.reviewerNames.length > 0
                ? task.reviewerNames.map((n) => getPersonalName(n)).join(' & ')
                : 'Trưởng phòng & Nhân Viên Điều Phối'}
            </span>
          </div>
        </div>

        {/* Footer: Assigned Team Avatars & Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          {/* Assigned Team / Member Name */}
          <div className="flex items-center space-x-2">
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-800 leading-none">
                {task.teamName ? getPersonalName(task.leadName || assignedUsers[0]?.name) : getPersonalName(assignedUsers[0]?.name)}
              </p>
              {assignedUsers.length > 1 && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  và {assignedUsers.length - 1} người khác
                </p>
              )}
            </div>
          </div>

          {/* Action Trigger */}
          <div>
            {isReviewer && task.status === 'SUBMITTED' && (
              <button
                onClick={() => onOpenReviewModal(task)}
                className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all"
              >
                <span>Duyệt Báo Cáo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {isReviewer && task.status !== 'SUBMITTED' && (
              <button
                onClick={() => onOpenReviewModal(task)}
                className="text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Chi tiết
              </button>
            )}

            {!isReviewer && isAssignedToMe && task.status !== 'APPROVED' && (
              <button
                onClick={() => onOpenReviewModal(task)}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{task.status === 'REJECTED' ? 'Nộp lại' : 'Nộp Báo Cáo'}</span>
              </button>
            )}

            {!isReviewer && task.status === 'APPROVED' && (
              <button
                onClick={() => onOpenReviewModal(task)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Xem chi tiết</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
