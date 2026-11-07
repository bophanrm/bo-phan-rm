'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, Attachment } from '@/types';
import { compressImage } from '@/lib/imageCompression';
import { X, UploadCloud, Camera, CheckCircle2, Image as ImageIcon, FileText, Trash2 } from 'lucide-react';
import { getPersonalName } from '@/utils/nameHelper';

interface SubmitReportModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SubmitReportModal({ task, isOpen, onClose }: SubmitReportModalProps) {
  const { currentUser, submitReport } = useApp();

  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{ original: number; compressed: number } | null>(null);

  if (!isOpen || !task) return null;

  // Handle File Input & Client-Side Image Compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
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
          id: `att-${Date.now()}-${i}`,
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
      alert('Có lỗi khi xử lý hình ảnh/tệp tin: ' + err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      alert('Vui lòng nhập tóm tắt kết quả công việc đã hoàn thành.');
      return;
    }

    submitReport(task.id, {
      taskId: task.id,
      submittedBy: currentUser.id,
      submittedByName: getPersonalName(currentUser.name, true),
      summary: summary.trim(),
      notes: notes.trim() || undefined,
      attachments,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-blue-50/60">
          <div>
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              Nộp Báo Cáo Hoàn Thành
            </span>
            <h3 className="font-bold text-slate-900 text-base line-clamp-1">{task.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kết quả công việc đã thực hiện <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Mô tả cụ thể những gì đã làm, các thông số, kết quả đạt được..."
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ghi chú thêm hoặc đề xuất (nếu có)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Cần lưu ý bảo dưỡng thêm vào tuần sau..."
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Upload Attachments / Photos with Client-Side Compression */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>Hình ảnh & Tệp đính kèm kết quả</span>
              </span>
              <span className="text-[11px] font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                ⚡ Tự động nén ảnh nhẹ mượt
              </span>
            </label>

            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-blue-400 transition-colors bg-slate-50 relative">
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
                <div className="flex text-xs text-slate-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-semibold text-blue-600 hover:text-blue-500 px-2 py-0.5 border border-slate-200 shadow-sm">
                    <span>Chọn ảnh hoặc file</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xlsx"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">hoặc chụp từ camera</p>
                </div>
                <p className="text-[10px] text-slate-400">PNG, JPG, PDF, Excel, Word</p>
              </div>
            </div>

            {isCompressing && (
              <div className="mt-2 text-xs text-blue-600 font-medium animate-pulse flex items-center space-x-1.5">
                <span>Đang tự động nén tối ưu ảnh...</span>
              </div>
            )}

            {compressionStats && (
              <div className="mt-2 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <span>
                  Đã nén từ {(compressionStats.original / 1024 / 1024).toFixed(1)}MB xuống{' '}
                  {(compressionStats.compressed / 1024).toFixed(0)}KB
                </span>
                <span className="font-bold">
                  (Tiết kiệm{' '}
                  {Math.round(
                    (1 - compressionStats.compressed / compressionStats.original) * 100
                  )}
                  % dung lượng)
                </span>
              </div>
            )}

            {/* List of Attached files */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      {att.type.startsWith('image/') ? (
                        <img
                          src={att.url}
                          alt={att.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="truncate text-left">
                        <p className="text-xs font-semibold text-slate-800 truncate">{att.name}</p>
                        <p className="text-[10px] text-slate-400">{(att.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isCompressing}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Gửi Báo Cáo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
