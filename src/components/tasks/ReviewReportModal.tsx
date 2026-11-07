'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, TaskReport } from '@/types';
import { X, CheckCircle, AlertTriangle, FileText, Clock, User, ShieldCheck, Users } from 'lucide-react';
import { getPersonalName } from '@/utils/nameHelper';
import { canReviewTask } from '@/utils/permissions';

interface ReviewReportModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewReportModal({ task, isOpen, onClose }: ReviewReportModalProps) {
  const { currentUser, users, reviewReport } = useApp();
  const [feedback, setFeedback] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!isOpen || !task) return null;

  const isReviewer = canReviewTask(currentUser, task, users);

  const latestReport = task.reports && task.reports.length > 0 ? task.reports[task.reports.length - 1] : null;

  const handleAction = (status: 'ACCEPTED' | 'REVISION_NEEDED') => {
    if (!latestReport) return;
    reviewReport(task.id, latestReport.id, status, feedback.trim() || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
              <span>Hồ sơ công việc & Báo cáo kết quả</span>
              {task.teamName && (
                <span className="text-blue-600 font-semibold">&bull; {task.teamName}</span>
              )}
            </span>
            <h3 className="font-bold text-slate-900 text-lg leading-tight">{task.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Task Info Summary */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Thành viên thực hiện:</span>
              </span>
              <span className="font-bold text-slate-900">
                {task.assignedToNames?.join(', ') || 'Chưa phân công'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Nơi nhận báo cáo (Đồng nhận):</span>
              </span>
              <span className="font-semibold text-amber-900">
                {task.reviewerNames?.join(' & ') || 'Chưa thiết lập'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Hạn nộp báo cáo:</span>
              </span>
              <span className="font-semibold text-slate-800">
                {task.reportDeadline && !isNaN(new Date(task.reportDeadline).getTime())
                  ? new Date(task.reportDeadline).toLocaleString('vi-VN')
                  : '---'}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 text-slate-700 leading-relaxed">
              <strong>Yêu cầu ban đầu:</strong> {task.description}
            </div>
          </div>

          {/* Report Section */}
          {latestReport ? (
            <div className="space-y-4">
              <div className="border border-blue-200 bg-blue-50/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-blue-900">
                    Bản Báo Cáo Kết Quả Nộp Về
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {getPersonalName(latestReport.submittedByName, true)} &bull; nộp lúc{' '}
                    {new Date(latestReport.submittedAt).toLocaleTimeString('vi-VN')}{' '}
                    {new Date(latestReport.submittedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="bg-white rounded-xl p-3.5 border border-blue-100 shadow-sm text-xs leading-relaxed text-slate-800">
                  <p className="font-semibold text-slate-900 mb-1">Nội dung báo cáo:</p>
                  <p className="whitespace-pre-line">{latestReport.summary}</p>
                  {latestReport.notes && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-slate-600">
                      <strong>Ghi chú / Đề xuất:</strong> {latestReport.notes}
                    </div>
                  )}
                </div>

                {/* Attachments & Photos */}
                {latestReport.attachments && latestReport.attachments.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-800 mb-2">
                      Hình ảnh & Tệp đính kèm kết quả ({latestReport.attachments.length}):
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {latestReport.attachments.map((att) => (
                        <div
                          key={att.id}
                          onClick={() => att.type.startsWith('image/') && setSelectedImage(att.url)}
                          className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm hover:border-blue-400 transition-all cursor-pointer group"
                        >
                          {att.type.startsWith('image/') ? (
                            <div className="relative aspect-video bg-slate-100 overflow-hidden">
                              <img
                                src={att.url}
                                alt={att.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                          ) : (
                            <div className="aspect-video bg-slate-100 flex items-center justify-center text-slate-500">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}
                          <div className="p-2 text-left">
                            <p className="text-[11px] font-medium text-slate-800 truncate">{att.name}</p>
                            <p className="text-[9px] text-slate-400">{(att.size / 1024).toFixed(0)} KB</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review status badge if already reviewed */}
                {latestReport.leadStatus === 'LEAD_ACCEPTED' && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">
                        Tổ Trưởng ({getPersonalName(latestReport.leadReviewedByName, true)}) đã duyệt sơ bộ hiện trường
                      </p>
                      <p className="text-[11px] text-blue-700">
                        Xác nhận lúc {new Date(latestReport.leadReviewedAt || '').toLocaleString('vi-VN')}.
                        {latestReport.leadFeedback && ` Nhận xét: "${latestReport.leadFeedback}"`}
                      </p>
                    </div>
                  </div>
                )}

                {latestReport.status === 'REVISION_NEEDED' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Báo cáo đang có yêu cầu chỉnh sửa lại</p>
                      <p className="text-[11px] text-rose-700 italic">
                        &ldquo;{latestReport.managerFeedback || latestReport.leadFeedback || 'Cần kiểm tra và nộp lại báo cáo.'}&rdquo;
                      </p>
                      <p className="text-[10px] text-rose-500 mt-0.5">
                        Khóa duyệt đạt cho đến khi nhân sự nộp bản báo cáo mới khắc phục.
                      </p>
                    </div>
                  </div>
                )}

                {latestReport.reviewedAt && latestReport.status === 'ACCEPTED' && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p>
                      Đã được nghiệm thu hoàn tất bởi <strong>{getPersonalName(latestReport.reviewedByName, true)}</strong> vào lúc{' '}
                      {new Date(latestReport.reviewedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                )}
              </div>

              {/* Reviewer Action Area */}
              {isReviewer && task.status === 'SUBMITTED' ? (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Nhận xét của {currentUser.level === 'LEVEL_3_LEAD' ? 'Tổ Trưởng (Duyệt Hiện Trường)' : currentUser.id === task.createdBy ? 'Người Giao Việc' : 'Cấp Quản Lý'} (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="VD: Hồ sơ đầy đủ, duyệt hoàn thành / Cần chụp lại ảnh công tơ điện..."
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {latestReport.status === 'REVISION_NEEDED' && (
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Báo cáo này đang yêu cầu sửa lại. Không thể duyệt đạt cho đến khi có báo cáo mới.</span>
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => handleAction('REVISION_NEEDED')}
                      className="flex items-center justify-center space-x-1.5 py-3 px-4 rounded-xl border border-rose-300 text-rose-700 font-semibold text-xs hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Yêu Cầu Sửa Lại</span>
                    </button>
                    <button
                      disabled={latestReport.status === 'REVISION_NEEDED'}
                      onClick={() => handleAction('ACCEPTED')}
                      className="flex items-center justify-center space-x-1.5 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{currentUser.level === 'LEVEL_3_LEAD' && task.createdBy !== currentUser.id ? 'Duyệt Sơ Bộ Hiện Trường' : 'Duyệt Đạt (Hoàn Thành)'}</span>
                    </button>
                  </div>
                </div>
              ) : !isReviewer && task.status === 'SUBMITTED' ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Báo cáo đang chờ người giao việc (<strong>{getPersonalName(task.createdByName)}</strong>) hoặc Cấp Quản Lý phê duyệt. Bạn đang ở chế độ xem.
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Chưa có báo cáo nào được nộp</p>
              <p className="text-xs text-slate-500 mt-1">
                Tổ đang thực hiện công việc. Khi hoàn thành, báo cáo sẽ tự động gửi về đây cho cả Trưởng phòng và Nhân Viên Điều Phối.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Image Lightbox Preview */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <img src={selectedImage} alt="Full view" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
