'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  DownloadCloud,
  CheckCircle2,
  X,
  HardDrive,
  FileJson,
  Clock,
  UploadCloud,
  AlertCircle,
  RefreshCw,
  Folder,
  Key,
  ExternalLink,
  Settings2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  FileText,
  Cloud,
} from 'lucide-react';

interface BackupDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GoogleDriveBackupFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  webViewLink?: string;
}

interface GoogleDriveConfigState {
  enabled: boolean;
  clientEmail: string;
  privateKey: string;
  folderId: string;
  folderName?: string;
  scheduleTime: string;
  frequency: 'daily' | '12h' | 'manual';
  hasPrivateKey?: boolean;
  privateKeyMasked?: string;
  lastBackupTime?: string;
  lastBackupFileName?: string;
  lastBackupStatus?: 'success' | 'error' | 'idle';
  lastBackupError?: string;
}

export function BackupDrawer({ isOpen, onClose }: BackupDrawerProps) {
  const {
    currentUser,
    tasks,
    notifications,
    users,
    shiftsConfig,
    teams,
    shifts,
    importBackup,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'gdrive' | 'local'>('gdrive');
  const [downloaded, setDownloaded] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const serviceAccountFileRef = useRef<HTMLInputElement>(null);

  // Google Drive state
  const [driveConfig, setDriveConfig] = useState<GoogleDriveConfigState>({
    enabled: true,
    clientEmail: '',
    privateKey: '',
    folderId: '',
    scheduleTime: '00:00',
    frequency: 'daily',
    lastBackupStatus: 'idle',
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; folderName?: string } | null>(null);

  const [syncingNow, setSyncingNow] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [syncErrorMsg, setSyncErrorMsg] = useState<string | null>(null);

  const [recentFiles, setRecentFiles] = useState<GoogleDriveBackupFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [editPrivateKey, setEditPrivateKey] = useState(false);

  // Tải cấu hình và danh sách file khi mở Drawer
  useEffect(() => {
    if (isOpen && currentUser.role === 'ADMIN') {
      loadDriveConfig();
      loadRecentFiles();
    }
  }, [isOpen]);

  const loadDriveConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/drive/config');
      const data = await res.json();
      if (data.success && data.config) {
        setDriveConfig((prev) => ({
          ...prev,
          ...data.config,
          privateKey: '', // Giữ trống cho form, chỉ nạp nếu người dùng thay đổi
        }));
      }
    } catch (err) {
      console.error('Lỗi nạp cấu hình Drive:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadRecentFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch('/api/drive/backups');
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setRecentFiles(data.files);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách file Drive:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Đọc file Service Account JSON do Google cấp
  const handleServiceAccountFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.client_email && json.private_key) {
          setDriveConfig((prev) => ({
            ...prev,
            clientEmail: json.client_email,
            privateKey: json.private_key,
          }));
          setEditPrivateKey(true);
          setTestResult({
            success: true,
            message: `Đã nạp file chứng thực Service Account: ${json.client_email}. Hãy bấm "Lưu cấu hình" & "Kiểm tra kết nối".`,
          });
        } else {
          setTestResult({
            success: false,
            message: 'File JSON không hợp lệ! Thiếu trường client_email hoặc private_key.',
          });
        }
      } catch (err) {
        setTestResult({
          success: false,
          message: 'Lỗi đọc file JSON. Vui lòng kiểm tra lại file tải về từ Google Cloud.',
        });
      }
    };
    reader.readAsText(file);
    if (serviceAccountFileRef.current) serviceAccountFileRef.current.value = '';
  };

  // Lưu cấu hình
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setTestResult(null);
    try {
      const payload: any = {
        enabled: driveConfig.enabled,
        clientEmail: driveConfig.clientEmail,
        folderId: driveConfig.folderId,
        scheduleTime: driveConfig.scheduleTime,
        frequency: driveConfig.frequency,
      };

      if (driveConfig.privateKey) {
        payload.privateKey = driveConfig.privateKey;
      }

      const res = await fetch('/api/drive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setDriveConfig((prev) => ({
          ...prev,
          ...data.config,
          privateKey: '',
        }));
        setEditPrivateKey(false);
        setTestResult({
          success: true,
          message: 'Đã lưu cấu hình Google Drive thành công!',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Lưu cấu hình thất bại.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Lỗi mạng khi lưu cấu hình.',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  // Kiểm tra kết nối Google Drive
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const payload: any = {
        clientEmail: driveConfig.clientEmail,
        folderId: driveConfig.folderId,
      };
      if (driveConfig.privateKey) {
        payload.privateKey = driveConfig.privateKey;
      }

      const res = await fetch('/api/drive/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message,
          folderName: data.folderName,
        });
        if (data.folderName) {
          setDriveConfig((prev) => ({ ...prev, folderName: data.folderName }));
        }
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Kiểm tra kết nối thất bại.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Không thể kết nối đến máy chủ.',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Sao lưu thủ công ngay lập tức lên Drive
  const handleSyncNow = async () => {
    setSyncingNow(true);
    setSyncSuccessMsg(null);
    setSyncErrorMsg(null);

    try {
      // Đóng gói snapshot dữ liệu trực tiếp từ client state
      const snapshotData = {
        users,
        teams,
        shifts,
        tasks,
        notifications,
        shiftsConfig,
      };

      const res = await fetch('/api/drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotData,
          initiatedBy: `Quản trị viên ${currentUser.name}`,
        }),
      });

      const data = await res.json();
      if (data.success && data.backupFile) {
        setSyncSuccessMsg(`Sao lưu thành công! File "${data.backupFile.name}" đã tải lên Drive.`);
        // Làm mới danh sách file và config
        loadRecentFiles();
        loadDriveConfig();
      } else {
        setSyncErrorMsg(data.error || 'Sao lưu lên Google Drive thất bại.');
      }
    } catch (err: any) {
      setSyncErrorMsg(err?.message || 'Lỗi mạng khi thực hiện sao lưu.');
    } finally {
      setSyncingNow(false);
    }
  };

  // Export full backup JSON về máy
  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      totalTasks: tasks.length,
      users,
      teams,
      shifts,
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

  // Import JSON từ máy
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const ok = importBackup(json);
        if (ok) {
          setImportStatus('success');
          setTimeout(() => {
            setImportStatus('idle');
            window.location.reload();
          }, 1200);
        } else {
          setImportStatus('error');
        }
      } catch (err) {
        console.error('Lỗi đọc file JSON:', err);
        setImportStatus('error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Chỉ Quản Trị Viên mới có quyền thao tác
  if (!isOpen || currentUser.role !== 'ADMIN') return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-snug">Sao Lưu & Đồng Bộ Dữ Liệu</h3>
              <p className="text-xs text-slate-500 font-medium">Kênh lưu trữ bảo vệ dữ liệu Bộ Phận RM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('gdrive')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'gdrive'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="text-sm">📁</span>
            <span>Đồng bộ Google Drive (Service Account)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'local'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Sao lưu Cục bộ & Realtime</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'gdrive' ? (
            /* TAB 1: GOOGLE DRIVE SYNC */
            <div className="space-y-4">
              {/* Thẻ trạng thái kết nối */}
              <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/80 border border-blue-200/90 rounded-2xl p-4 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      GD
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">Google Drive Service Account</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            driveConfig.clientEmail && driveConfig.hasPrivateKey
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {driveConfig.clientEmail && driveConfig.hasPrivateKey ? 'Đã cấu hình' : 'Chưa đủ chứng thực'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Hệ thống tự động đồng bộ ngầm toàn bộ dữ liệu (công việc, lịch trực, báo cáo) lên thư mục Google Drive của bạn theo định kỳ hoặc thủ công.
                      </p>
                      {driveConfig.lastBackupTime && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>Lần sao lưu gần nhất:</span>
                          <span className="text-blue-700 font-bold">
                            {new Date(driveConfig.lastBackupTime).toLocaleString('vi-VN')}
                          </span>
                          {driveConfig.lastBackupFileName && (
                            <span className="text-slate-500 truncate max-w-[180px]">
                              ({driveConfig.lastBackupFileName})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hàng nút bấm thao tác nhanh */}
                <div className="mt-4 pt-3 border-t border-blue-200/80 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={syncingNow || (!driveConfig.clientEmail && !driveConfig.hasPrivateKey)}
                    className="flex-1 min-w-[160px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
                    <span>{syncingNow ? 'Đang tải lên Drive...' : 'Sao lưu ngay lên Drive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection || (!driveConfig.clientEmail && !driveConfig.hasPrivateKey)}
                    className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-300 font-semibold py-2.5 px-3.5 rounded-xl text-xs shadow-2xs transition-all cursor-pointer"
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${testingConnection ? 'animate-pulse text-blue-600' : 'text-emerald-600'}`} />
                    <span>{testingConnection ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
                  </button>
                </div>

                {/* Thông báo kết quả thao tác */}
                {syncSuccessMsg && (
                  <div className="mt-3 p-2.5 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-semibold">{syncSuccessMsg}</span>
                  </div>
                )}
                {syncErrorMsg && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span className="font-semibold">{syncErrorMsg}</span>
                  </div>
                )}
                {testResult && (
                  <div
                    className={`mt-3 p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-emerald-100/90 border-emerald-300 text-emerald-900'
                        : 'bg-rose-100/90 border-rose-300 text-rose-900'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                    )}
                    <span className="font-semibold leading-relaxed">{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Hướng dẫn cấu hình 3 bước */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>Hướng dẫn thiết lập Google Drive Service Account (2 phút)</span>
                  </div>
                  {showGuide ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>
                {showGuide && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-600 space-y-2 border-t border-slate-200/80 leading-relaxed bg-white">
                    <p className="font-semibold text-slate-800">3 Bước kết nối cực kỳ đơn giản:</p>
                    <ol className="list-decimal pl-4 space-y-1.5">
                      <li>
                        Vào <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Google Cloud Console</a> &gt; Bật <strong>Google Drive API</strong>.
                      </li>
                      <li>
                        Tạo một <strong>Service Account</strong> &gt; Tab <strong>Keys</strong> &gt; <strong>Add Key (JSON)</strong> để tải file chứng thực về máy.
                      </li>
                      <li>
                        Tạo một thư mục trên <a href="https://drive.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Google Drive</a> &gt; Bấm <strong>Chia sẻ (Share)</strong> cho email của Service Account với quyền <strong>Người chỉnh sửa (Editor)</strong>.
                      </li>
                    </ol>
                    <p className="text-[11px] text-slate-500 pt-1">
                      💡 Mẹo: Bấm nút <strong>"Tải file JSON chứng thực"</strong> bên dưới để hệ thống tự động điền Email và Private Key mà không cần copy paste thủ công!
                    </p>
                  </div>
                )}
              </div>

              {/* Form Cấu hình Service Account */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-blue-600" />
                    <span>Thông tin kết nối & Lịch sao lưu</span>
                  </h4>
                  {/* Nút Upload nhanh file credentials JSON */}
                  <div>
                    <input
                      ref={serviceAccountFileRef}
                      type="file"
                      accept=".json"
                      onChange={handleServiceAccountFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => serviceAccountFileRef.current?.click()}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Nạp file .JSON Google</span>
                    </button>
                  </div>
                </div>

                {/* Bật/Tắt tự động */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Tự động sao lưu định kỳ</span>
                    <span className="text-[11px] text-slate-500">Chạy ngầm qua hệ thống Cron</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={driveConfig.enabled}
                      onChange={(e) => setDriveConfig({ ...driveConfig, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Giờ sao lưu & Tần suất */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Giờ tự động sao lưu:</label>
                    <input
                      type="time"
                      value={driveConfig.scheduleTime}
                      onChange={(e) => setDriveConfig({ ...driveConfig, scheduleTime: e.target.value })}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Tần suất:</label>
                    <select
                      value={driveConfig.frequency}
                      onChange={(e) => setDriveConfig({ ...driveConfig, frequency: e.target.value as any })}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                    >
                      <option value="daily">Hàng ngày (Mỗi 24h)</option>
                      <option value="12h">Mỗi 12 giờ</option>
                      <option value="manual">Chỉ thủ công</option>
                    </select>
                  </div>
                </div>

                {/* Folder ID hoặc URL */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-amber-600" />
                    <span>ID hoặc Đường dẫn thư mục Google Drive:</span>
                  </label>
                  <input
                    type="text"
                    value={driveConfig.folderId}
                    onChange={(e) => setDriveConfig({ ...driveConfig, folderId: e.target.value })}
                    placeholder="Ví dụ: 1ABCxyz... hoặc https://drive.google.com/drive/folders/..."
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Nhớ chia sẻ quyền <strong>Người chỉnh sửa (Editor)</strong> thư mục này cho Service Account bên dưới.
                  </p>
                </div>

                {/* Client Email */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <span>📧</span>
                    <span>Service Account Client Email:</span>
                  </label>
                  <input
                    type="email"
                    value={driveConfig.clientEmail}
                    onChange={(e) => setDriveConfig({ ...driveConfig, clientEmail: e.target.value })}
                    placeholder="bophanrm-backup@project-id.iam.gserviceaccount.com"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden font-mono"
                  />
                </div>

                {/* Private Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-blue-600" />
                      <span>Private Key (RSA-SHA256):</span>
                    </label>
                    {driveConfig.hasPrivateKey && !editPrivateKey && (
                      <button
                        type="button"
                        onClick={() => setEditPrivateKey(true)}
                        className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        Thay đổi Key
                      </button>
                    )}
                  </div>

                  {driveConfig.hasPrivateKey && !editPrivateKey ? (
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-300 text-xs font-mono text-slate-600 flex items-center justify-between">
                      <span>{driveConfig.privateKeyMasked || '••••••••••••••••••••••••••••••••'}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Đã lưu an toàn
                      </span>
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={driveConfig.privateKey}
                      onChange={(e) => setDriveConfig({ ...driveConfig, privateKey: e.target.value })}
                      placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-hidden"
                    />
                  )}
                </div>

                {/* Nút Lưu Cấu Hình */}
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{savingConfig ? 'Đang lưu cấu hình...' : 'Lưu cấu hình Google Drive'}</span>
                </button>
              </div>

              {/* Danh sách các file sao lưu gần nhất trên Google Drive */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Bản sao lưu trên Google Drive</span>
                  </h4>
                  <button
                    type="button"
                    onClick={loadRecentFiles}
                    disabled={loadingFiles}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Làm mới danh sách"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {recentFiles.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <p>Chưa có file sao lưu nào được tải lên hoặc chưa thể đọc thư mục Drive.</p>
                    <p className="mt-1 text-[11px]">Bấm "Sao lưu ngay lên Drive" ở trên để tạo bản lưu đầu tiên.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <FileJson className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{file.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {file.createdTime ? new Date(file.createdTime).toLocaleString('vi-VN') : ''} •{' '}
                              {file.size ? `${(Number(file.size) / 1024).toFixed(1)} KB` : 'JSON'}
                            </p>
                          </div>
                        </div>

                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1 transition-colors"
                          >
                            <span>Mở Drive</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: LOCAL BACKUP & SUPABASE */
            <div className="space-y-5">
              {/* Status Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-900">Đồng Bộ Đám Mây Realtime: ĐANG HOẠT ĐỘNG</h4>
                    <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                      Hệ thống kết nối trực tiếp với <strong>Supabase Cloud</strong>. Mọi thay đổi về phân ca, công việc, báo cáo sẽ tự động nhảy số tức thì trên toàn bộ 19 máy của nhân sự trong ~0.2 giây.
                    </p>
                    <div className="mt-3 flex items-center space-x-1.5 text-[11px] text-emerald-800 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Trạng thái: Trực tuyến (Đã liên kết bophanrm&apos;s Project)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Download Button */}
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Tải bản sao lưu về máy tính:</h4>
                <button
                  onClick={handleExportBackup}
                  className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-xl shadow-xs transition-all text-sm cursor-pointer"
                >
                  <FileJson className="w-4 h-4 text-blue-400" />
                  <span>{downloaded ? 'Đã tải thành công file Backup!' : 'Tải toàn bộ dữ liệu về máy (.JSON)'}</span>
                </button>
                <p className="text-[11px] text-slate-500 text-center mt-2">
                  File chứa toàn bộ danh sách công việc, nhân sự, tổ đội, ca trực và báo cáo.
                </p>
              </div>

              {/* Manual Import Section */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-xs font-semibold text-slate-700 mb-2">Nạp dữ liệu từ file sao lưu:</h4>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-medium py-3 px-4 rounded-xl shadow-2xs transition-all text-sm cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  <span>Nạp file sao lưu vào máy (.JSON)</span>
                </button>

                {importStatus === 'success' && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Nạp dữ liệu thành công! Đang làm mới hệ thống...</span>
                  </div>
                )}

                {importStatus === 'error' && (
                  <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>File không đúng định dạng sao lưu hoặc bị lỗi.</span>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 text-center mt-2">
                  Dùng để khôi phục hoặc chuyển dữ liệu nhanh giữa các thiết bị.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
