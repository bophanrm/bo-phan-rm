'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, Attachment } from '@/types';
import { compressImage } from '@/lib/imageCompression';
import {
  X,
  TrendingUp,
  CheckCircle2,
  History,
  Building2,
  Camera,
  UploadCloud,
  FileText,
  Trash2,
  ImageIcon,
  Clock,
} from 'lucide-react';
import { getPersonalName } from '@/utils/nameHelper';

interface QuickProgressModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickProgressModal({ task, isOpen, onClose }: QuickProgressModalProps) {
  const { currentUser, updateTaskProgress } = useApp();

  const [percent, setPercent] = useState<number>(task?.progressPercent || 0);
  const [note, setNote] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [compressionStats, setCompressionStats] = useState<{ original: number; compressed: number } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) {
      setPercent(task.progressPercent || 0);
      setNote('');
      setAttachments([]);
      setCompressionStats(null);
    }
  }, [task]);

  if (!isOpen || !task) return null;

  // Xử lý nén ảnh tự động chuẩn Web
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const newAttachments: Attachment[] = [];
      let totalOrig = 0;
      let totalComp = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        totalOrig += file.size;

        if (file.type.startsWith('image/')) {
          const comp = await compressImage(file, 1200, 1200, 0.75);
          totalComp += comp.compressedSize;

          newAttachments.push({
            id: `att-prog-${Date.now()}-${i}`,
            name: file.name,
            size: comp.compressedSize,
            type: comp.file.type || file.type,
            url: comp.dataUrl,
          });
        } else {
          totalComp += file.size;
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          newAttachments.push({
            id: `att-prog-${Date.now()}-${i}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: dataUrl,
          });
        }
      }

      setAttachments((prev) => [...prev, ...newAttachments]);
      setCompressionStats({ original: totalOrig, compressed: totalComp });
    } catch (err: any) {
      alert('Có lỗi khi xử lý hình ảnh: ' + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      alert('Vui lòng nhập ghi chú tình hình tiến độ hiện tại.');
      return;
    }

    updateTaskProgress(task.id, {
      percent,
      note: note.trim(),
      attachments,
    });

    onClose();
  };

  const updates = task.progressUpdates || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-indigo-50/70">
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Báo Cáo Tiến Độ & Ảnh Hiện Trường</span>
              </span>
            </div>
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
          {/* Thông tin nhà thầu nếu có */}
          {task.isContractor && (
            <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3 flex items-start space-x-2 text-xs text-amber-950">
              <Building2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Đơn vị ngoài thực hiện: {task.contractorName}</p>
                <p className="text-[11px] text-amber-900">
                  Nhân sự nội bộ phụ trách theo dõi: {task.assignedToNames.join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Slider chọn % tiến độ */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Mức độ hoàn thành hiện tại:
              </label>
              <span className="text-base font-black text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                {percent}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={percent}
              onChange={(e) => setPercent(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
              <span>0% (Bắt đầu)</span>
              <span>50% (Đang làm)</span>
              <span>100% (Hoàn thành)</span>
            </div>
          </div>

          {/* Ghi chú tình hình */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nội dung khối lượng đã làm hôm nay <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Hôm nay đã hoàn thành kéo 50m ống dẫn, gắn van điều áp, tiếp tục lắp máy bơm vào ngày mai..."
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
            />
          </div>

          {/* Đính kèm hình ảnh hiện trường tiến độ hôm nay */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ảnh hiện trường tiến độ hôm nay:</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ⚡ Tự nén nhẹ mượt
              </span>
            </label>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
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
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-98"
              >
                <Camera className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Chụp ảnh camera</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-98"
              >
                <UploadCloud className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Chọn ảnh từ máy</span>
              </button>
            </div>

            {isCompressing && (
              <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1.5 animate-pulse font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Đang nén ảnh hiện trường tự động để gửi siêu tốc...</span>
              </p>
            )}

            {/* Preview các ảnh đã chọn */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Ảnh đính kèm đợt này ({attachments.length}):</span>
                  {compressionStats && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Tiết kiệm {Math.round((1 - compressionStats.compressed / compressionStats.original) * 100)}% dung lượng
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs">
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setSelectedImage(att.url)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                        title="Xóa ảnh này"
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

          {/* Lịch sử cập nhật tiến độ trước đó (kèm ảnh hiện trường) */}
          {updates.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Nhật ký tiến độ ({updates.length} lần cập nhật)</span>
              </div>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {updates.map((up) => {
                  const dateStr = new Intl.DateTimeFormat('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  }).format(new Date(up.updatedAt));
                  return (
                    <div
                      key={up.id}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {up.updatedByName} ({up.percent}%)
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{dateStr}</span>
                      </div>
                      <p className="text-slate-700 text-[11px] leading-relaxed whitespace-pre-line">{up.note}</p>

                      {/* Hiển thị ảnh hiện trường của lần cập nhật này nếu có */}
                      {up.attachments && up.attachments.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-200/70">
                          <p className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-indigo-600" />
                            <span>Ảnh hiện trường ({up.attachments.length}):</span>
                          </p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {up.attachments.map((att) => (
                              <img
                                key={att.id}
                                src={att.url}
                                alt={att.name}
                                onClick={() => setSelectedImage(att.url)}
                                className="w-full aspect-square object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-105 transition-transform"
                                title="Bấm để xem ảnh phóng to"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isCompressing}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/25 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Tiến Độ & Ảnh</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal xem ảnh phóng to toàn màn hình */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={selectedImage} alt="Phóng to" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

