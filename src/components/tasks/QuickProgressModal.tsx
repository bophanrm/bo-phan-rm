'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Task } from '@/types';
import { X, TrendingUp, CheckCircle2, History, Building2, UserCheck } from 'lucide-react';
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

  useEffect(() => {
    if (task) {
      setPercent(task.progressPercent || 0);
      setNote('');
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      alert('Vui lòng nhập ghi chú tình hình tiến độ hiện tại.');
      return;
    }

    updateTaskProgress(task.id, {
      percent,
      note: note.trim(),
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
                <span>Cập Nhật Nhanh Tiến Độ (Cấp 1 & Cấp 2)</span>
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
                Mức độ hoàn thành:
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
              Ghi chú tình hình tiến độ <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Đã kiểm tra hiện trường, nhà thầu đã kéo dây được 60%, dự kiến xong trong chiều nay..."
              className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
            />
          </div>

          {/* Lịch sử cập nhật tiến độ trước đó */}
          {updates.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Nhật ký tiến độ ({updates.length} lần cập nhật)</span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
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
                      className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          {up.updatedByName} ({up.percent}%)
                        </span>
                        <span className="text-[10px] text-slate-400">{dateStr}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{up.note}</p>
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
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/25 transition-all flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Cập Nhật</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
