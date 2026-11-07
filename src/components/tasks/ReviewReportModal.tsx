'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, Attachment } from '@/types';
import { compressImage } from '@/lib/imageCompression';
import {
  X,
  CheckCircle,
  AlertTriangle,
  FileText,
  Clock,
  User,
  ShieldCheck,
  Users,
  Camera,
  UploadCloud,
  Trash2,
  Send,
  CheckCircle2,
  Image as ImageIcon,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FolderKanban,
  Check,
} from 'lucide-react';
import { getPersonalName } from '@/utils/nameHelper';
import { canReviewTask } from '@/utils/permissions';

interface ReviewReportModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewReportModal({ task, isOpen, onClose }: ReviewReportModalProps) {
  const { currentUser, users, reviewReport, submitReport } = useApp();

  // Review states
  const [feedback, setFeedback] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Submit report states
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{ original: number; compressed: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !task) return null;

  const isReviewer = canReviewTask(currentUser, task, users);
  const isAssigned = task.assignedTo.includes(currentUser.id);
  const isApproved = task.status === 'APPROVED';
  const latestReport = task.reports && task.reports.length > 0 ? task.reports[task.reports.length - 1] : null;

  // Handle Review action (Duyệt hoặc Yêu cầu sửa)
  const handleReviewAction = (status: 'ACCEPTED' | 'REVISION_NEEDED') => {
    if (!latestReport) return;
    reviewReport(task.id, latestReport.id, status, feedback.trim() || undefined);
    onClose();
  };

  // Handle File Input & Image Compression
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const newAttachments: Attachment[] = [];
      let totalOriginal = 0;
      let totalCompressed = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await compressImage(file);

        totalOriginal += res.originalSize;
        totalCompressed += res.compressedSize;

        newAttachments.push({
          id: `att-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          url: res.dataUrl,
          size: res.compressedSize,
          type: file.type,
        });
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
      setCompressionStats({
        original: totalOriginal,
        compressed: totalCompressed,
      });
    } catch (err) {
      alert('Có lỗi khi xử lý hình ảnh: ' + err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Handle Report Submission
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      alert('Vui lòng nhập tóm tắt kết quả công việc đã hoàn thành!');
      return;
    }

    setIsSubmitting(true);
    try {
      submitReport(task.id, {
        taskId: task.id,
        submittedBy: currentUser.id,
        submittedByName: getPersonalName(currentUser.name, true),
        summary: summary.trim(),
        notes: notes.trim() || undefined,
        attachments,
      });

      setSubmitSuccessMsg(true);
      setTimeout(() => {
        setSubmitSuccessMsg(false);
        setSummary('');
        setNotes('');
        setAttachments([]);
        setCompressionStats(null);
      }, 1500);
    } catch (err) {
      alert('Có lỗi khi gửi báo cáo: ' + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Badge config
  const getStatusBadge = () => {
    if (task.extensionRequest?.status === 'PENDING') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
          ⏳ Đang xin gia hạn
        </span>
      );
    }
    switch (task.status) {
      case 'TODO':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Chưa thực hiện
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Đang tiến hành
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            Chờ duyệt nghiệm thu
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Đã nghiệm thu hoàn tất</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            Cần chỉnh sửa lại
          </span>
        );
      default:
        return null;
    }
  };

  const getPriorityBadge = () => {
    switch (task.priority) {
      case 'URGENT':
        return <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">🔴 Khẩn cấp</span>;
      case 'HIGH':
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">🟠 Ưu tiên cao</span>;
      case 'MEDIUM':
        return <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">🔵 Bình thường</span>;
      case 'LOW':
        return <span className="text-[10px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">⚪ Thấp</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* HEADER: Tên công việc & Huy hiệu phân loại */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            {/* Tag Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {getStatusBadge()}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                task.isDaily ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-indigo-50 text-indigo-900 border-indigo-200'
              }`}>
                {task.isDaily ? '☀️ Việc Trong Ngày' : '📋 Kế Hoạch - Dự Án'}
              </span>
              {getPriorityBadge()}
              {task.teamName && (
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200">
                  📁 {task.teamName}
                </span>
              )}
            </div>

            {/* Task Title */}
            <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl leading-snug tracking-tight">
              {task.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (Cuộn linh hoạt) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-sm">

          {/* ==================================================== */}
          {/* KHỐI 1: BẢNG HỒ SƠ & THÔNG TIN CHI TIẾT CÔNG VIỆC    */}
          {/* ==================================================== */}
          <div className="bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
              <FolderKanban className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Hồ Sơ & Thông Tin Giao Việc
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Người giao việc */}
              <div className="space-y-1">
                <span className="text-slate-500 font-medium flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Người giao việc:</span>
                </span>
                <p className="font-bold text-slate-900 pl-5">
                  {task.createdByName || 'Ban Quản Lý'}
                  {task.createdAt && (
                    <span className="text-slate-500 font-normal text-[11px] block">
                      Giao lúc: {new Date(task.createdAt).toLocaleString('vi-VN')}
                    </span>
                  )}
                </p>
              </div>

              {/* Nơi nhận báo cáo (Đồng nhận) */}
              <div className="space-y-1">
                <span className="text-slate-500 font-medium flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Nơi nhận báo cáo (Đồng nhận):</span>
                </span>
                <p className="font-bold text-amber-950 pl-5">
                  {task.reviewerNames?.join(' & ') || 'Tống Trường Xa & Nguyễn Trần Hoàng Vũ'}
                </p>
              </div>

              {/* Thành viên thực hiện */}
              <div className="space-y-1 sm:col-span-2">
                <span className="text-slate-500 font-medium flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Thành viên thực hiện ({task.assignedTo.length} người):</span>
                </span>
                <div className="pl-5 pt-0.5 flex flex-wrap gap-1.5">
                  {(task.assignedToNames || []).map((name, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold text-xs shadow-2xs"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mốc thời gian */}
              <div className="space-y-1">
                <span className="text-slate-500 font-medium flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Hạn nộp báo cáo:</span>
                </span>
                <p className="font-bold text-rose-700 pl-5">
                  {task.reportDeadline && !isNaN(new Date(task.reportDeadline).getTime())
                    ? new Date(task.reportDeadline).toLocaleString('vi-VN')
                    : 'Không xác định'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-medium flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hạn hoàn thành (Due date):</span>
                </span>
                <p className="font-semibold text-slate-800 pl-5">
                  {task.dueDate && !isNaN(new Date(task.dueDate).getTime())
                    ? new Date(task.dueDate).toLocaleString('vi-VN')
                    : 'Không xác định'}
                </p>
              </div>
            </div>

            {/* Mô tả / Yêu cầu ban đầu */}
            <div className="pt-2.5 border-t border-slate-200">
              <span className="text-slate-500 text-xs font-semibold block mb-1">
                Yêu cầu & Hướng dẫn thực hiện:
              </span>
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs leading-relaxed text-slate-800 whitespace-pre-line font-medium shadow-2xs">
                {task.description || 'Không có mô tả chi tiết'}
              </div>
            </div>

            {/* Lịch sử gia hạn / chuyển giao nếu có */}
            {task.extensionHistory && task.extensionHistory.length > 0 && (
              <div className="pt-2 border-t border-slate-200 text-xs">
                <span className="font-bold text-amber-900 block mb-1.5">
                  🔄 Lịch sử gia hạn / chuyển giao:
                </span>
                <div className="space-y-1.5 pl-2 border-l-2 border-amber-300">
                  {task.extensionHistory.map((ext, idx) => (
                    <div key={idx} className="text-[11px] text-slate-700">
                      <strong>{ext.extendedByName}</strong> gia hạn đến{' '}
                      <strong>{new Date(ext.newDeadline).toLocaleString('vi-VN')}</strong>
                      {ext.reason && <span className="italic text-slate-500"> ({ext.reason})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ==================================================== */}
          {/* KHỐI 2: BÁO CÁO ĐÃ NỘP TRƯỚC ĐÓ (NẾU CÓ)             */}
          {/* ==================================================== */}
          {latestReport && (
            <div className="border border-blue-200 bg-blue-50/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <span className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Bản Báo Cáo Kết Quả Mới Nhất</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {getPersonalName(latestReport.submittedByName, true)} &bull;{' '}
                  {new Date(latestReport.submittedAt).toLocaleTimeString('vi-VN')}{' '}
                  {new Date(latestReport.submittedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>

              {/* Nội dung báo cáo */}
              <div className="bg-white rounded-xl p-3.5 border border-blue-100 shadow-2xs text-xs leading-relaxed text-slate-800">
                <p className="font-bold text-slate-900 mb-1">Nội dung báo cáo kết quả:</p>
                <p className="whitespace-pre-line text-slate-700">{latestReport.summary}</p>
                {latestReport.notes && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-slate-600">
                    <strong>Ghi chú / Đề xuất vật tư:</strong> {latestReport.notes}
                  </div>
                )}
              </div>

              {/* Hình ảnh nghiệm thu thực tế */}
              {latestReport.attachments && latestReport.attachments.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-800 mb-2 flex items-center space-x-1">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ảnh hiện trường & Kết quả nghiệm thu ({latestReport.attachments.length}):</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {latestReport.attachments.map((att) => (
                      <div
                        key={att.id}
                        onClick={() => att.type.startsWith('image/') && setSelectedImage(att.url)}
                        className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs hover:border-blue-400 transition-all cursor-pointer group"
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
                        <div className="p-1.5 text-left bg-slate-50/50">
                          <p className="text-[11px] font-semibold text-slate-800 truncate">{att.name}</p>
                          <p className="text-[9px] text-slate-400">{(att.size / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Đã nghiệm thu hoàn tất */}
              {latestReport.reviewedAt && latestReport.status === 'ACCEPTED' && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p>
                    Đã nghiệm thu hoàn tất bởi <strong>{getPersonalName(latestReport.reviewedByName, true)}</strong> vào lúc{' '}
                    {new Date(latestReport.reviewedAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              )}

              {/* Yêu cầu chỉnh sửa lại */}
              {latestReport.status === 'REVISION_NEEDED' && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Lãnh đạo yêu cầu chỉnh sửa lại báo cáo:</span>
                  </div>
                  <p className="pl-5 italic text-rose-900">
                    &ldquo;{latestReport.managerFeedback || latestReport.leadFeedback || 'Cần kiểm tra và nộp lại báo cáo khắc phục.'}&rdquo;
                  </p>
                  <p className="pl-5 text-[10px] text-rose-600">
                    Vui lòng sử dụng bảng nộp báo cáo bên dưới để nộp bản khắc phục mới kèm ảnh.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* KHỐI 3: BẢNG NỘP CÔNG VIỆC TRỰC TIẾP (TÍCH HỢP)     */}
          {/* ==================================================== */}
          {!isApproved && (
            <div className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {latestReport ? 'Nộp Bổ Sung / Cập Nhật Báo Cáo Công Việc' : 'Bảng Nộp Báo Cáo Kết Quả Công Việc'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Điền tóm tắt kết quả và đính kèm ảnh hiện trường để gửi Ban Quản Lý nghiệm thu
                    </p>
                  </div>
                </div>

                {latestReport && (
                  <button
                    type="button"
                    onClick={() => setShowSubmissionForm(!showSubmissionForm)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showSubmissionForm ? 'Thu gọn' : 'Mở bảng nộp'}</span>
                    {showSubmissionForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              {submitSuccessMsg ? (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-1 animate-fade-in">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-bold text-emerald-900 text-sm">Gửi báo cáo thành công!</p>
                  <p className="text-xs text-emerald-700">
                    Báo cáo đã được lưu và gửi thông báo đến Ban Quản Lý & Nhân Viên Điều Phối.
                  </p>
                </div>
              ) : (
                showSubmissionForm && (
                  <form onSubmit={handleSubmitReport} className="space-y-3.5">
                    {/* Tóm tắt kết quả */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Tóm tắt kết quả công việc đã hoàn thành <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="VD: Đã dán nhãn toàn bộ 45 thiết bị tại xưởng, cập nhật mã tài sản và kiểm tra hoạt động ổn định..."
                        className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium leading-relaxed bg-white shadow-2xs"
                      />
                    </div>

                    {/* Ghi chú thêm */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        Ghi chú phát sinh / Đề xuất vật tư (Tùy chọn)
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ghi chú thêm về thiết bị hỏng cần thanh lý hoặc phụ tùng cần mua bổ sung..."
                        className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-white shadow-2xs"
                      />
                    </div>

                    {/* Đính kèm ảnh & Camera hiện trường */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Hình ảnh hiện trường / Nghiệm thu thực tế
                      </label>

                      {/* Hidden inputs */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={(e) => handleFiles(e.target.files)}
                        className="hidden"
                      />
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handleFiles(e.target.files)}
                        className="hidden"
                      />

                      {/* Hai nút chụp ảnh & tải ảnh */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-98"
                        >
                          <Camera className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Chụp ảnh hiện trường</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-98"
                        >
                          <UploadCloud className="w-4 h-4 text-slate-600 shrink-0" />
                          <span>Tải ảnh từ máy</span>
                        </button>
                      </div>

                      {isCompressing && (
                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1.5 animate-pulse font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Đang nén ảnh tự động chuẩn Web để gửi siêu nhanh...</span>
                        </p>
                      )}

                      {/* Preview ảnh đã chọn */}
                      {attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                            <span>Đã đính kèm ({attachments.length} ảnh):</span>
                            {compressionStats && (
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                Tiết kiệm {Math.round((1 - compressionStats.compressed / compressionStats.original) * 100)}% dung lượng
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {attachments.map((att) => (
                              <div key={att.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs">
                                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(att.id)}
                                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate text-center">
                                  {(att.size / 1024).toFixed(0)} KB
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Nút gửi báo cáo hoàn thành */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || isCompressing}
                        className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isSubmitting ? 'Đang gửi báo cáo...' : 'Gửi Báo Cáo Nghiệm Thu'}</span>
                      </button>
                    </div>
                  </form>
                )
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* KHỐI 4: KHU VỰC PHÊ DUYỆT CỦA LÃNH ĐẠO (REVIEWER)    */}
          {/* ==================================================== */}
          {isReviewer && task.status === 'SUBMITTED' && latestReport && (
            <div className="border border-purple-200 bg-purple-50/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center space-x-2 pb-2 border-b border-purple-100">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                  Thẩm Quyền Phê Duyệt Của Lãnh Đạo
                </h4>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ý kiến nhận xét & Chỉ đạo (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="VD: Nghiệm thu đạt, hồ sơ thiết bị đầy đủ / Cần chụp lại chi tiết phụ tùng..."
                  className="w-full text-xs sm:text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => handleReviewAction('REVISION_NEEDED')}
                    className="flex items-center justify-center space-x-1.5 py-3 px-4 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Yêu Cầu Sửa Lại</span>
                  </button>

                  <button
                    onClick={() => handleReviewAction('ACCEPTED')}
                    className="flex items-center justify-center space-x-1.5 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-98"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {currentUser.level === 'LEVEL_3_LEAD' && task.createdBy !== currentUser.id
                        ? 'Duyệt Sơ Bộ Hiện Trường'
                        : 'Phê Duyệt Nghiệm Thu (Đạt)'}
                    </span>
                  </button>
                </div>
              </div>
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
