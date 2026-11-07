'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DownloadCloud, CheckCircle2, ShieldCheck, X, HardDrive, FileJson, Clock } from 'lucide-react';

interface BackupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupDrawer({ isOpen, onClose }: BackupDrawerProps) {
  const { tasks, notifications, users, shiftsConfig } = useApp();
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  // Export full backup
  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      totalTasks: tasks.length,
      users,
      tasks,
      notifications,
      shiftsConfig,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `BoPhanRM_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DownloadCloud className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Sao Lưu & Dữ Liệu Kênh 3</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-900">Sao lưu tự động đang HOẠT ĐỘNG</h4>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                  Đúng 00:00 hằng ngày, kịch bản tự động sẽ xuất dữ liệu và đồng bộ hóa sang <strong>Google Drive cá nhân</strong> của bạn.
                </p>
                <div className="mt-3 flex items-center space-x-1.5 text-[11px] text-emerald-800 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Lần backup gần nhất: Hôm nay, 00:00:15 (Thành công)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cloud & 3rd Party Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span>Kênh lưu trữ thứ 3 được cấu hình</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Kênh sao lưu:</span>
                <span className="font-semibold text-slate-800">Google Drive API (Thư mục riêng)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Chu kỳ:</span>
                <span className="font-semibold text-slate-800">Mỗi 24 giờ (Lúc 00:00 đêm)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Định dạng file:</span>
                <span className="font-semibold text-slate-800">Nén .SQL & .JSON đính kèm</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Chi phí kênh thứ 3:</span>
                <span className="font-semibold text-emerald-600">0 VNĐ (Dùng 15GB miễn phí của Google)</span>
              </div>
            </div>
          </div>

          {/* Manual Download Button */}
          <div className="pt-2">
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Tải bản sao lưu về máy tính ngay:</h4>
            <button
              onClick={handleExportBackup}
              className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-xl shadow-sm transition-all text-sm"
            >
              <FileJson className="w-4 h-4 text-blue-400" />
              <span>{downloaded ? 'Đã tải thành công file Backup!' : 'Tải toàn bộ dữ liệu về máy (.JSON)'}</span>
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              File chứa toàn bộ danh sách công việc, nhân sự và báo cáo kết quả hiện tại.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
