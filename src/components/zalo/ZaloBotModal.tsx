'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Users,
  Settings,
  Bell,
  LogOut,
  Smartphone,
  ShieldCheck,
  Droplets,
  Clock,
  UserCheck,
  CalendarClock,
  Calculator,
  Sliders,
  Save,
  Eye,
  Info,
} from 'lucide-react';

const DEFAULT_SCHEDULE_WELLS = [
  { wellId: 1, wellName: 'Giếng G1', enabled: true, dinhMuc: 450, luuLuongPerHour: 72, delayMinutes: 0 },
  { wellId: 2, wellName: 'Giếng G2', enabled: true, dinhMuc: 480, luuLuongPerHour: 85, delayMinutes: 0 },
  { wellId: 3, wellName: 'Giếng G3', enabled: true, dinhMuc: 480, luuLuongPerHour: 66, delayMinutes: 0 },
  { wellId: 4, wellName: 'Giếng G4', enabled: true, dinhMuc: 480, luuLuongPerHour: 13, delayMinutes: 0 },
  { wellId: 5, wellName: 'Giếng G5', enabled: true, dinhMuc: 650, luuLuongPerHour: 79, delayMinutes: 0 },
  { wellId: 6, wellName: 'Giếng G6', enabled: false, dinhMuc: 480, luuLuongPerHour: 50, delayMinutes: 0 },
];

interface ZaloGroupInfo {
  id: string;
  name: string;
  totalMember?: number;
  avatar?: string;
}

interface ZaloFriendInfo {
  id: string;
  name: string;
  avatar?: string;
}

interface ZaloBotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ZaloBotModal({ isOpen, onClose }: ZaloBotModalProps) {
  const [status, setStatus] = useState<'DISCONNECTED' | 'GENERATING_QR' | 'QR_READY' | 'SCANNED' | 'CONNECTED' | 'ERROR'>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [groups, setGroups] = useState<ZaloGroupInfo[]>([]);
  const [friends, setFriends] = useState<ZaloFriendInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [config, setConfig] = useState({
    enabled: true,
    notifyOnNewTask: true,
    notifyDailyShiftReminder: true,
    notifyProjectDeadline: true,
  });

  const [wellConfig, setWellConfig] = useState({
    enabled: false,
    time: '00:05',
    sendToUser: true,
    targetUserId: '',
    targetUserName: '',
    sendToGroup: false,
    targetGroupId: '',
    targetGroupName: '',
  });

  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: false,
    time: '18:30',
    sendToUser: true,
    targetUserId: '',
    targetUserName: '',
    sendToGroup: false,
    targetGroupId: '',
    targetGroupName: '',
    wells: DEFAULT_SCHEDULE_WELLS,
  });

  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [sendingWellTest, setSendingWellTest] = useState(false);
  const [wellTestResult, setWellTestResult] = useState<string | null>(null);

  const [schedulePreview, setSchedulePreview] = useState<any | null>(null);
  const [loadingSchedulePreview, setLoadingSchedulePreview] = useState(false);
  const [sendingScheduleTest, setSendingScheduleTest] = useState(false);
  const [scheduleTestResult, setScheduleTestResult] = useState<string | null>(null);
  const [scheduleSaveSuccess, setScheduleSaveSuccess] = useState(false);

  // Lấy trạng thái hiện tại từ server
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/zalo/status');
      const data = await res.json();
      setStatus(data.status);
      setQrCode(data.qrCode);
      setUserInfo(data.userInfo);
      setErrorMessage(data.errorMessage);
      if (data.config) {
        setConfig({
          enabled: data.config.enabled ?? true,
          notifyOnNewTask: data.config.notifyOnNewTask ?? true,
          notifyDailyShiftReminder: data.config.notifyDailyShiftReminder ?? true,
          notifyProjectDeadline: data.config.notifyProjectDeadline ?? true,
        });
        if (data.config.groupId) {
          setSelectedGroupId(data.config.groupId);
        }
        if (data.config.wellReport) {
          setWellConfig({
            enabled: data.config.wellReport.enabled ?? false,
            time: data.config.wellReport.time || '00:05',
            sendToUser: data.config.wellReport.sendToUser ?? true,
            targetUserId: data.config.wellReport.targetUserId || '',
            targetUserName: data.config.wellReport.targetUserName || '',
            sendToGroup: data.config.wellReport.sendToGroup ?? false,
            targetGroupId: data.config.wellReport.targetGroupId || '',
            targetGroupName: data.config.wellReport.targetGroupName || '',
          });
        }
        if (data.config.wellSchedule) {
          const loadedWells = (data.config.wellSchedule.wells && data.config.wellSchedule.wells.length > 0)
            ? data.config.wellSchedule.wells
            : DEFAULT_SCHEDULE_WELLS;
          setScheduleConfig({
            enabled: data.config.wellSchedule.enabled ?? false,
            time: data.config.wellSchedule.time || '18:30',
            sendToUser: data.config.wellSchedule.sendToUser ?? true,
            targetUserId: data.config.wellSchedule.targetUserId || '',
            targetUserName: data.config.wellSchedule.targetUserName || '',
            sendToGroup: data.config.wellSchedule.sendToGroup ?? false,
            targetGroupId: data.config.wellSchedule.targetGroupId || '',
            targetGroupName: data.config.wellSchedule.targetGroupName || '',
            wells: loadedWells,
          });
          if (data.config.wellSchedule.enabled) {
            fetchSchedulePreview(loadedWells);
          }
        }
      }
      if (data.groups && Array.isArray(data.groups)) {
        setGroups(data.groups);
      }
      if (data.friends && Array.isArray(data.friends)) {
        setFriends(data.friends);
      }
    } catch (err: any) {
      console.error('Lỗi lấy trạng thái Zalo Bot:', err);
    }
  };

  // Hàm lưu cấu hình đồng bộ toàn diện, đảm bảo không bao giờ bị thất lạc trường dữ liệu nào
  const saveFullConfig = async (
    partialConfig?: Partial<typeof config>,
    partialWellReport?: any,
    partialWellSchedule?: any,
    newGroupId?: string
  ) => {
    const updatedConfig = { ...config, ...(partialConfig || {}) };
    const updatedWellReport = partialWellReport !== undefined ? partialWellReport : wellConfig;
    const updatedWellSchedule = partialWellSchedule !== undefined ? partialWellSchedule : scheduleConfig;
    const targetGroupId = newGroupId !== undefined ? newGroupId : selectedGroupId;
    const groupName = groups.find((g) => g.id === targetGroupId)?.name || null;

    if (partialConfig) setConfig(updatedConfig);
    if (partialWellReport !== undefined) setWellConfig(updatedWellReport);
    if (partialWellSchedule !== undefined) setScheduleConfig(updatedWellSchedule);
    if (newGroupId !== undefined) setSelectedGroupId(targetGroupId);

    try {
      await fetch('/api/zalo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedConfig,
          groupId: targetGroupId || null,
          groupName,
          wellReport: updatedWellReport,
          wellSchedule: updatedWellSchedule,
        }),
      });
      console.log('[ZaloBotModal] Saved full config successfully');
    } catch (e) {
      console.error('[ZaloBotModal] Lỗi lưu cấu hình:', e);
    }
  };

  // Cập nhật cấu hình báo cáo giếng
  const handleSaveWellConfig = async (newWellConfig: any) => {
    await saveFullConfig(undefined, newWellConfig, undefined);
  };

  // Gửi thử báo cáo giếng
  const handleSendWellTest = async () => {
    setSendingWellTest(true);
    setWellTestResult(null);
    try {
      const res = await fetch('/api/zalo/well-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: wellConfig.sendToUser && wellConfig.sendToGroup ? 'BOTH' : wellConfig.sendToUser ? 'USER' : 'GROUP',
          targetUserId: wellConfig.targetUserId,
          targetGroupId: wellConfig.targetGroupId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWellTestResult(`✅ Đã gửi báo cáo thành công! Tổng sản lượng 24h: ${data.data.totalVolume} m³.`);
      } else {
        setWellTestResult(`❌ Lỗi gửi: ${data.error}`);
      }
    } catch (err: any) {
      setWellTestResult(`❌ Lỗi kết nối: ${err.message}`);
    } finally {
      setSendingWellTest(false);
    }
  };

  // Tính toán xem trước lịch mở giếng hôm nay
  const fetchSchedulePreview = async (wellsToPreview?: any) => {
    setLoadingSchedulePreview(true);
    try {
      const wellsParam = encodeURIComponent(JSON.stringify(wellsToPreview || scheduleConfig.wells));
      const res = await fetch(`/api/zalo/well-schedule?wells=${wellsParam}`);
      const data = await res.json();
      if (data.success) {
        setSchedulePreview(data.data);
      }
    } catch (e) {
      console.error('Lỗi tính toán xem trước lịch mở giếng:', e);
    } finally {
      setLoadingSchedulePreview(false);
    }
  };

  // Lưu cấu hình lịch mở giếng & bảng thông số
  const handleSaveScheduleConfig = async (newScheduleConfig: any) => {
    await saveFullConfig(undefined, undefined, newScheduleConfig);
    setScheduleSaveSuccess(true);
    setTimeout(() => setScheduleSaveSuccess(false), 3000);
    fetchSchedulePreview(newScheduleConfig.wells);
  };

  // Cập nhật thông số một giếng (định mức, lưu lượng, độ trễ)
  const handleWellParamChange = (wellId: number, field: string, value: any) => {
    const updatedWells = scheduleConfig.wells.map((w) => {
      if (w.wellId === wellId) {
        return { ...w, [field]: value };
      }
      return w;
    });
    const updated = { ...scheduleConfig, wells: updatedWells };
    setScheduleConfig(updated);
  };

  // Gửi thử lịch mở giếng
  const handleSendScheduleTest = async () => {
    setSendingScheduleTest(true);
    setScheduleTestResult(null);
    try {
      const res = await fetch('/api/zalo/well-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: scheduleConfig.sendToUser && scheduleConfig.sendToGroup ? 'BOTH' : scheduleConfig.sendToUser ? 'USER' : 'GROUP',
          targetUserId: scheduleConfig.targetUserId,
          targetGroupId: scheduleConfig.targetGroupId,
          wells: scheduleConfig.wells,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScheduleTestResult('✅ Đã tính toán và gửi lịch mở giếng thành công vào Zalo!');
        fetchSchedulePreview();
      } else {
        setScheduleTestResult(`❌ Gửi thất bại: ${data.error || 'Lỗi không xác định'}`);
      }
    } catch (err: any) {
      setScheduleTestResult(`❌ Lỗi kết nối: ${err.message}`);
    } finally {
      setSendingScheduleTest(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  // Polling khi đang ở trạng thái quét QR
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && (status === 'GENERATING_QR' || status === 'QR_READY' || status === 'SCANNED')) {
      interval = setInterval(fetchStatus, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, status]);

  // Tạo mã QR mới
  const handleGenerateQR = async () => {
    setLoading(true);
    setErrorMessage(null);
    setTestResult(null);
    try {
      const res = await fetch('/api/zalo/qr', { method: 'POST' });
      const data = await res.json();
      if (data.status) setStatus(data.status);
      if (data.qrCode) setQrCode(data.qrCode);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tạo mã QR Zalo');
    } finally {
      setLoading(false);
    }
  };

  // Lưu cấu hình nhóm & tuỳ chọn thông báo
  const handleSaveConfig = async (newGroupId?: string) => {
    await saveFullConfig(undefined, undefined, undefined, newGroupId);
  };

  // Gửi tin nhắn test vào nhóm Zalo
  const handleSendTestMessage = async () => {
    if (!selectedGroupId) {
      alert('Vui lòng chọn Nhóm Zalo trước khi gửi tin nhắn test!');
      return;
    }

    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/zalo/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroupId,
          message: `👋 [TEST KẾT NỐI] Xin chào các anh em Bộ Phận RM!\n\nBot Zalo (Tài khoản Chị Nguyên) đã được kết nối thành công với hệ thống Quản lý công việc.\nTừ nay các thông báo giao việc và nhắc nhở hạn nộp sẽ được tự động gửi vào nhóm này!\n\nThời gian: ${new Date().toLocaleTimeString('vi-VN')} - ${new Date().toLocaleDateString('vi-VN')}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult('Đã gửi tin nhắn test thành công vào nhóm Zalo!');
      } else {
        setTestResult(`Lỗi: ${data.error || 'Không gửi được'}`);
      }
    } catch (err: any) {
      setTestResult(`Lỗi gửi: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  // Đăng xuất
  const handleLogout = async () => {
    if (!confirm('Bạn có chắc muốn ngắt kết nối Bot Zalo? Hệ thống sẽ ngừng tự động gửi tin nhắn cho đến khi quét mã lại.')) {
      return;
    }
    try {
      await fetch('/api/zalo/logout', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header với nhận diện thương hiệu Zalo */}
        <div className="bg-gradient-to-r from-[#0068FF] to-[#0052cc] p-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-black text-lg border border-white/20">
              Z
            </div>
            <div>
              <h2 className="text-base font-extrabold leading-tight">Quản Lý Bot Zalo Tự Động</h2>
              <p className="text-[11px] text-blue-100 font-medium">
                Tài khoản phụ Chị Nguyên (Cấp 2) • Gửi tin nhắc việc
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* TRƯỜNG HỢP 1: ĐÃ KẾT NỐI THÀNH CÔNG */}
          {status === 'CONNECTED' && (
            <div className="space-y-4">
              {/* Thẻ trạng thái tài khoản */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                    {userInfo?.avatar ? (
                      <img src={userInfo.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      'ZN'
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Đang hoạt động 24/7</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {userInfo?.name || 'Zalo Chị Nguyên (Cấp 2)'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center space-x-1 transition-colors"
                  title="Ngắt kết nối Bot Zalo"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Ngắt</span>
                </button>
              </div>

              {/* Chọn Nhóm Zalo nhận tin nhắn */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Chọn Nhóm Zalo Nhận Thông Báo</span>
                </div>

                {groups.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Chọn từ danh sách nhóm Zalo đã tìm thấy:</label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => {
                        setSelectedGroupId(e.target.value);
                        handleSaveConfig(e.target.value);
                      }}
                      className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">-- Bấm vào đây để chọn nhóm --</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} {g.totalMember ? `(${g.totalMember} thành viên)` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                    <span>Dán đường link nhóm hoặc ID nhóm:</span>
                    {selectedGroupId && <span className="text-[10px] text-emerald-600 font-bold">Đã lưu: {selectedGroupId}</span>}
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Dán link (https://zalo.me/g/qxgadv733) hoặc ID nhóm"
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value.trim())}
                      className="flex-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveConfig(selectedGroupId)}
                      className="px-3.5 py-2 bg-[#0068FF] hover:bg-[#0052cc] text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-xs"
                    >
                      Lưu Nhóm
                    </button>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-[11px] text-emerald-900 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hệ thống hỗ trợ tự động giải mã đường link <strong>https://zalo.me/g/...</strong> thành ID nhóm chuẩn!</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={fetchStatus}
                    className="text-xs text-blue-600 hover:underline flex items-center space-x-1 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Làm mới danh sách nhóm</span>
                  </button>

                  <button
                    onClick={handleSendTestMessage}
                    disabled={sendingTest || !selectedGroupId}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center space-x-1.5 shadow-xs transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingTest ? 'Đang gửi...' : 'Gửi thử tin test'}</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`p-2 rounded-lg text-xs font-medium flex items-center space-x-1.5 ${
                    testResult.startsWith('Đã gửi') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{testResult}</span>
                  </div>
                )}
              </div>

              {/* Các thiết lập tự động gửi tin */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                
                {/* CÔNG TẮC BẬT/TẮT THÔNG BÁO CÔNG VIỆC */}
                <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                  config.enabled
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
                }`}>
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      <span className={`text-xs font-black uppercase tracking-wider ${
                        config.enabled ? 'text-emerald-950' : 'text-rose-950'
                      }`}>
                        {config.enabled ? 'Thông Báo Công Việc: Đang Bật' : 'Thông Báo Công Việc: Đã Tắt'}
                      </span>
                    </div>
                    <p className={`text-[11px] leading-tight ${config.enabled ? 'text-emerald-800' : 'text-rose-800 font-medium'}`}>
                      {config.enabled
                        ? 'Gửi tin nhắc việc, thông báo giao việc vào nhóm Zalo (Báo cáo giếng có công tắc riêng độc lập bên dưới).'
                        : 'Đang tắt tin nhắn giao việc & nhắc việc. Báo cáo giếng và Lịch mở giếng bên dưới vẫn hoạt động độc lập.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => saveFullConfig({ enabled: !config.enabled })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all shadow-xs cursor-pointer ${
                      config.enabled
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {config.enabled ? 'TẮT BÁO VIỆC' : 'BẬT LẠI NGAY'}
                  </button>
                </div>

                <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider pt-1 border-t border-slate-200/80">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>Kịch Bản Công Việc & Ca Trực (Bật/Tắt theo nhu cầu)</span>
                </div>

                <div className={`space-y-2 text-xs transition-opacity ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!config.enabled}
                      checked={config.notifyOnNewTask}
                      onChange={(e) => saveFullConfig({ notifyOnNewTask: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Thông báo khi có công việc mới được giao</span>
                      <p className="text-[11px] text-slate-500">Tự động bắn tin vào nhóm kèm tên người phụ trách, thời hạn và độ ưu tiên.</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!config.enabled}
                      checked={config.notifyDailyShiftReminder}
                      onChange={(e) => saveFullConfig({ notifyDailyShiftReminder: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Nhắc nhở trước khi hết ca 60 phút (Theo lịch ca từng nhân viên)</span>
                      <p className="text-[11px] text-slate-500">Tự động căn cứ lịch ca (Ca 1: 13h00, Hành chính: 15h00, Buggy: 14h30, Ca 2: 21h00, Ca 3: 05h00...) để tag tên đôn đốc đúng ca.</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!config.enabled}
                      checked={config.notifyProjectDeadline}
                      onChange={(e) => saveFullConfig({ notifyProjectDeadline: e.target.checked })}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Nhắc nhở Dự án / Kế hoạch dài hạn</span>
                      <p className="text-[11px] text-slate-500">Tự động nhắc nhở trước hạn nộp 1 ngày và ngày kết thúc dự án.</p>
                    </div>
                  </label>
                </div>

                {/* PHÂN HỆ MỚI: BÁO CÁO KHAI THÁC NƯỚC GIẾNG KHOAN (24H) */}
                <div className="pt-3 border-t border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-cyan-100 text-cyan-800">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          Báo Cáo Khai Thác Nước Giếng 24h
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Tự động đăng nhập web quan trắc & gửi sản lượng ngày hôm trước (0h hôm trước đến 0h hôm nay)
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveWellConfig({ ...wellConfig, enabled: !wellConfig.enabled })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs cursor-pointer ${
                        wellConfig.enabled
                          ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {wellConfig.enabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                    </button>
                  </div>

                  {wellConfig.enabled && (
                    <div className="p-3.5 bg-cyan-50/70 border border-cyan-200 rounded-2xl space-y-3 animate-fade-in text-xs">
                      {/* Cài đặt giờ gửi */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-cyan-200/70">
                        <div className="space-y-0.5">
                          <label className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-cyan-700" />
                            <span>Giờ gửi báo cáo tự động:</span>
                          </label>
                          <p className="text-[10px] text-slate-500">Gửi tổng sản lượng 24h của ngày hôm trước (0h hôm trước đến 0h hôm nay)</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="time"
                            value={wellConfig.time}
                            onChange={(e) => handleSaveWellConfig({ ...wellConfig, time: e.target.value })}
                            className="bg-white border border-cyan-300 rounded-lg px-2.5 py-1 font-bold text-cyan-950 text-xs outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleSaveWellConfig({ ...wellConfig, time: '00:05' })}
                              className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                wellConfig.time === '00:05' ? 'bg-cyan-600 text-white' : 'bg-white border border-cyan-300 text-cyan-800 hover:bg-cyan-50'
                              }`}
                            >
                              00:05 (Đêm)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveWellConfig({ ...wellConfig, time: '07:00' })}
                              className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                wellConfig.time === '07:00' ? 'bg-cyan-600 text-white' : 'bg-white border border-cyan-300 text-cyan-800 hover:bg-cyan-50'
                              }`}
                            >
                              07:00 (Sáng)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Tùy chọn 1: Gửi qua Zalo cá nhân */}
                      <div className="space-y-2 p-2.5 bg-white rounded-xl border border-cyan-200/80">
                        <label className="flex items-start space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={wellConfig.sendToUser}
                            onChange={(e) => handleSaveWellConfig({ ...wellConfig, sendToUser: e.target.checked })}
                            className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-900">1. Gửi qua Zalo cá nhân (Chat riêng 1:1)</span>
                            <p className="text-[11px] text-slate-500">
                              Chỉ gửi trực tiếp vào Zalo người được chọn, không chia sẻ ra nhóm chung.
                            </p>
                          </div>
                        </label>

                        {wellConfig.sendToUser && (
                          <div className="pl-6 pt-1 space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-700">
                              Chọn tài khoản Zalo nhận tin:
                            </label>
                            <select
                              value={wellConfig.targetUserId || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const f = friends.find((item) => item.id === selectedId);
                                handleSaveWellConfig({
                                  ...wellConfig,
                                  targetUserId: selectedId,
                                  targetUserName: f?.name || '',
                                });
                              }}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">-- Click chọn tài khoản trong danh bạ Zalo Bot --</option>
                              {friends.map((f) => (
                                <option key={f.id} value={f.id}>
                                  👤 {f.name} {f.id ? `(ID: ${f.id})` : ''}
                                </option>
                              ))}
                            </select>
                            <p className="text-[10px] text-slate-500 italic">
                              * Danh bạ tự động lấy từ các liên hệ / bạn bè mà Zalo Bot (Chị Nguyên) có thể nhắn tin trực tiếp.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tùy chọn 2: Gửi vào Nhóm Zalo */}
                      <div className="space-y-2 p-2.5 bg-white rounded-xl border border-cyan-200/80">
                        <label className="flex items-start space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={wellConfig.sendToGroup}
                            onChange={(e) => handleSaveWellConfig({ ...wellConfig, sendToGroup: e.target.checked })}
                            className="mt-0.5 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-900">2. Gửi vào Nhóm Zalo (Group chat)</span>
                            <p className="text-[11px] text-slate-500">
                              Gửi số liệu khai thác vào nhóm làm việc chung để các bộ phận cùng nắm.
                            </p>
                          </div>
                        </label>

                        {wellConfig.sendToGroup && (
                          <div className="pl-6 pt-1 space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-700">
                              Chọn nhóm Zalo nhận tin:
                            </label>
                            <select
                              value={wellConfig.targetGroupId || selectedGroupId || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const g = groups.find((item) => item.id === selectedId);
                                handleSaveWellConfig({
                                  ...wellConfig,
                                  targetGroupId: selectedId,
                                  targetGroupName: g?.name || '',
                                });
                              }}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                              <option value="">-- Chọn nhóm Zalo nhận báo cáo --</option>
                              {groups.map((g) => (
                                <option key={g.id} value={g.id}>
                                  📁 {g.name} ({g.totalMember || 0} thành viên)
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Nút gửi thử & thông báo kết quả */}
                      <div className="pt-2 border-t border-cyan-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-[11px] text-cyan-900 font-medium">
                          {wellTestResult && <p className="font-bold">{wellTestResult}</p>}
                        </div>
                        <button
                          type="button"
                          disabled={sendingWellTest || (!wellConfig.sendToUser && !wellConfig.sendToGroup)}
                          onClick={handleSendWellTest}
                          className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                        >
                          {sendingWellTest ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang cào dữ liệu & gửi...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Tra Cứu & Gửi Thử Ngay</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* PHÂN HỆ MỚI: BẢNG TÍNH & LỊCH MỞ GIẾNG TỰ ĐỘNG (LẬP LỊCH CA ĐÊM) */}
                <div className="pt-3 border-t border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                        <CalendarClock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Lịch Mở Giếng Tự Động (Theo Bảng Tính)</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-900 font-bold">Mới</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Tự động tính giờ mở giếng ban đêm theo định mức m³ & lưu lượng bơm gửi qua Zalo
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveScheduleConfig({ ...scheduleConfig, enabled: !scheduleConfig.enabled })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all shadow-xs cursor-pointer ${
                        scheduleConfig.enabled
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {scheduleConfig.enabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                    </button>
                  </div>

                  {scheduleConfig.enabled && (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3.5 animate-fade-in text-xs">
                      {/* Cài đặt giờ gửi */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-200/70">
                        <div className="space-y-0.5">
                          <label className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Giờ gửi lịch mở giếng tự động:</span>
                          </label>
                          <p className="text-[10px] text-slate-500">
                            Khung giờ chốt dữ liệu quan trắc trong ngày để tính giờ mở giếng ban đêm
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="time"
                            value={scheduleConfig.time}
                            onChange={(e) => handleSaveScheduleConfig({ ...scheduleConfig, time: e.target.value })}
                            className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 font-bold text-amber-950 text-xs outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <div className="flex items-center space-x-1">
                            {['18:00', '18:30', '19:00', '19:30'].map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => handleSaveScheduleConfig({ ...scheduleConfig, time: t })}
                                className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                  scheduleConfig.time === t
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Tùy chọn 1: Gửi qua Zalo cá nhân */}
                      <div className="space-y-2 p-2.5 bg-white rounded-xl border border-amber-200/80">
                        <label className="flex items-start space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={scheduleConfig.sendToUser}
                            onChange={(e) => handleSaveScheduleConfig({ ...scheduleConfig, sendToUser: e.target.checked })}
                            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-900">1. Gửi qua Zalo cá nhân (Chat riêng 1:1)</span>
                            <p className="text-[11px] text-slate-500">
                              Chỉ gửi lịch mở giếng cho Admin hoặc người phụ trách ca trực.
                            </p>
                          </div>
                        </label>

                        {scheduleConfig.sendToUser && (
                          <div className="pl-6 pt-1 space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-700">
                              Chọn tài khoản Zalo nhận lịch mở giếng:
                            </label>
                            <select
                              value={scheduleConfig.targetUserId || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const f = friends.find((item) => item.id === selectedId);
                                handleSaveScheduleConfig({
                                  ...scheduleConfig,
                                  targetUserId: selectedId,
                                  targetUserName: f?.name || '',
                                });
                              }}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="">-- Click chọn tài khoản trong danh bạ Zalo Bot --</option>
                              {friends.map((f) => (
                                <option key={f.id} value={f.id}>
                                  👤 {f.name} {f.id ? `(ID: ${f.id})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Tùy chọn 2: Gửi vào Nhóm Zalo */}
                      <div className="space-y-2 p-2.5 bg-white rounded-xl border border-amber-200/80">
                        <label className="flex items-start space-x-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={scheduleConfig.sendToGroup}
                            onChange={(e) => handleSaveScheduleConfig({ ...scheduleConfig, sendToGroup: e.target.checked })}
                            className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-900">2. Gửi vào Nhóm Zalo (Group chat)</span>
                            <p className="text-[11px] text-slate-500">
                              Gửi lịch mở giếng vào nhóm làm việc chung để toàn bộ nhân viên ca trực cùng nắm.
                            </p>
                          </div>
                        </label>

                        {scheduleConfig.sendToGroup && (
                          <div className="pl-6 pt-1 space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-700">
                              Chọn nhóm Zalo nhận lịch:
                            </label>
                            <select
                              value={scheduleConfig.targetGroupId || selectedGroupId || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const g = groups.find((item) => item.id === selectedId);
                                handleSaveScheduleConfig({
                                  ...scheduleConfig,
                                  targetGroupId: selectedId,
                                  targetGroupName: g?.name || '',
                                });
                              }}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                            >
                              <option value="">-- Chọn nhóm Zalo nhận lịch mở giếng --</option>
                              {groups.map((g) => (
                                <option key={g.id} value={g.id}>
                                  📁 {g.name} ({g.totalMember || 0} thành viên)
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* BẢNG THÔNG SỐ ĐỊNH MỨC & ĐỘ TRỄ TỪNG GIẾNG */}
                      <div className="p-3 bg-white rounded-xl border border-amber-200/90 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Sliders className="w-4 h-4 text-amber-700" />
                            <span className="font-extrabold text-slate-900 text-xs">
                              Cài Đặt Định Mức (m³), Lưu Lượng & Độ Trễ Từng Giếng
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveScheduleConfig(scheduleConfig)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] shadow-xs flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <Save className="w-3 h-3" />
                            <span>{scheduleSaveSuccess ? 'Đã lưu thành công!' : 'Lưu Thông Số'}</span>
                          </button>
                        </div>

                        {/* Ghi chú bảo mật về độ trễ */}
                        <div className="bg-amber-50/90 border border-amber-300/80 rounded-lg p-2 text-[11px] text-amber-950 flex items-start space-x-2">
                          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-bold">Cơ chế bảo mật Độ Trễ (+phút):</p>
                            <p className="text-[10px] text-amber-900 leading-relaxed">
                              Độ trễ giúp Admin điều chỉnh dời thời gian mở giếng (ví dụ hệ thống tính 22:16, đặt trễ 20 phút $\rightarrow$ thông báo mở lúc <strong>22:36</strong>).
                              Thông báo gửi qua Zalo <strong>hoàn toàn KHÔNG ghi chú cộng thêm số phút này</strong>, đảm bảo bảo mật và bảo toàn quy trình nội bộ của Admin.
                            </p>
                          </div>
                        </div>

                        {/* Bảng nhập liệu cho từng giếng */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-[10px] font-extrabold uppercase text-slate-700 border-b border-slate-200">
                                <th className="p-2">Giếng</th>
                                <th className="p-2 text-center">Áp Dụng</th>
                                <th className="p-2">Định Mức (m³)</th>
                                <th className="p-2">Lưu Lượng/1h (m³/h)</th>
                                <th className="p-2">Độ Trễ (+phút)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-[11px]">
                              {scheduleConfig.wells.map((well) => (
                                <tr key={well.wellId} className={`hover:bg-amber-50/40 transition-colors ${!well.enabled ? 'opacity-50 bg-slate-50' : ''}`}>
                                  <td className="p-2 font-bold text-slate-900 whitespace-nowrap">
                                    {well.wellName}
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="checkbox"
                                      checked={well.enabled}
                                      onChange={(e) => handleWellParamChange(well.wellId, 'enabled', e.target.checked)}
                                      className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="number"
                                        min="0"
                                        step="10"
                                        value={well.dinhMuc}
                                        onChange={(e) => handleWellParamChange(well.wellId, 'dinhMuc', parseFloat(e.target.value) || 0)}
                                        className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-right"
                                      />
                                      <span className="text-[10px] text-slate-500">m³</span>
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={well.luuLuongPerHour}
                                        onChange={(e) => handleWellParamChange(well.wellId, 'luuLuongPerHour', parseFloat(e.target.value) || 1)}
                                        className="w-16 bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-right"
                                      />
                                      <span className="text-[10px] text-slate-500">m³/h</span>
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="number"
                                        min="0"
                                        step="5"
                                        value={well.delayMinutes}
                                        onChange={(e) => handleWellParamChange(well.wellId, 'delayMinutes', parseInt(e.target.value, 10) || 0)}
                                        className="w-16 bg-amber-50 border border-amber-300 rounded px-2 py-1 font-black text-amber-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-right"
                                      />
                                      <span className="text-[10px] font-bold text-amber-800">phút</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* KHUNG XEM TRƯỚC BẢNG TÍNH & TIN NHẮN MẪU */}
                      <div className="p-3 bg-white rounded-xl border border-amber-200/90 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Calculator className="w-4 h-4 text-amber-700" />
                            <span className="font-extrabold text-slate-900 text-xs">
                              Bảng Tính Thực Tế Hôm Nay (Quan Trắc Trực Tuyến)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => fetchSchedulePreview()}
                            disabled={loadingSchedulePreview}
                            className="px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 rounded-lg flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <RefreshCw className={`w-3 h-3 ${loadingSchedulePreview ? 'animate-spin' : ''}`} />
                            <span>{loadingSchedulePreview ? 'Đang tính...' : 'Tính toán lại'}</span>
                          </button>
                        </div>

                        {schedulePreview && (
                          <div className="space-y-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-100 text-[10px] font-extrabold uppercase text-slate-700 border-b border-slate-200">
                                    <th className="p-1.5">Giếng</th>
                                    <th className="p-1.5 text-right">Đã Khai Thác</th>
                                    <th className="p-1.5 text-right">Định Mức</th>
                                    <th className="p-1.5 text-right">Còn Lại</th>
                                    <th className="p-1.5 text-center">Giờ Lý Thuyết</th>
                                    <th className="p-1.5 text-center font-black text-amber-900">Giờ Báo Zalo</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-[11px]">
                                  {schedulePreview.wells
                                    .filter((w: any) => w.enabled)
                                    .map((w: any) => (
                                      <tr key={w.wellId} className="hover:bg-slate-50">
                                        <td className="p-1.5 font-bold text-slate-900">{w.wellName}</td>
                                        <td className="p-1.5 text-right font-medium text-slate-700">{w.daKhaiThac} m³</td>
                                        <td className="p-1.5 text-right font-medium text-slate-700">{w.dinhMuc} m³</td>
                                        <td className="p-1.5 text-right font-bold text-slate-900">{w.conLai} m³</td>
                                        <td className="p-1.5 text-center font-mono text-slate-500 text-[10px]">
                                          {w.thoiGianMoLyThuyet !== '--' ? w.thoiGianMoLyThuyet.slice(0, 5) : '--'}
                                        </td>
                                        <td className="p-1.5 text-center font-mono font-black text-amber-900 bg-amber-50/80 rounded">
                                          {w.displayTime}
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Khung mô phỏng tin nhắn Zalo sẽ nhận */}
                            <div className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-[11px] whitespace-pre-wrap leading-relaxed shadow-inner">
                              <div className="text-[10px] text-amber-400 font-bold mb-1 uppercase tracking-wider flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                <span>Xem trước tin nhắn sẽ gửi vào Zalo:</span>
                              </div>
                              {schedulePreview ? (
                                `⏰ [BỘ PHẬN RM] LỊCH MỞ GIẾNG TỰ ĐỘNG\n` +
                                `━━━━━━━━━━━━━━━━━━━━\n` +
                                `📅 Ngày: ${schedulePreview.dateStr} (Chốt số liệu quan trắc lúc ${schedulePreview.cutOffTimeStr})\n\n` +
                                schedulePreview.wells
                                  .filter((w: any) => w.enabled)
                                  .map((w: any) => {
                                    if (w.status === 'QUOTA_REACHED') {
                                      return `🔹 ${w.wellName}: Đã đạt định mức (Không cần mở)\n   • Đã khai thác: ${w.daKhaiThac} m³ / Định mức: ${w.dinhMuc} m³`;
                                    }
                                    if (w.status === 'RUN_NOW') {
                                      return `🔹 ${w.wellName}: Cần mở ngay\n   • Đã khai thác: ${w.daKhaiThac} m³ / Định mức: ${w.dinhMuc} m³\n   • Còn lại: ${w.conLai} m³ (~${w.soGioCanBom} giờ)`;
                                    }
                                    return `🔹 ${w.wellName}: Thời gian mở giếng lúc ${w.displayTime}\n   • Đã khai thác: ${w.daKhaiThac} m³ / Định mức: ${w.dinhMuc} m³\n   • Còn lại: ${w.conLai} m³`;
                                  })
                                  .join('\n\n') +
                                `\n━━━━━━━━━━━━━━━━━━━━\n` +
                                `📌 Đề nghị nhân viên ca trực theo dõi và vận hành giếng theo đúng lịch trên.`
                              ) : (
                                'Chưa có dữ liệu tính toán.'
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Nút gửi thử & thông báo kết quả */}
                      <div className="pt-2 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-[11px] text-amber-900 font-medium">
                          {scheduleTestResult && <p className="font-bold">{scheduleTestResult}</p>}
                        </div>
                        <button
                          type="button"
                          disabled={sendingScheduleTest || (!scheduleConfig.sendToUser && !scheduleConfig.sendToGroup)}
                          onClick={handleSendScheduleTest}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                        >
                          {sendingScheduleTest ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang tính toán & gửi Zalo...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>⚡ Tính Toán & Gửi Thử Lịch Mở Giếng</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TRƯỜNG HỢP 2: ĐANG TẠO MÃ QR HOẶC CHỜ QUÉT */}
          {(status === 'QR_READY' || status === 'GENERATING_QR' || status === 'SCANNED') && (
            <div className="text-center py-3 space-y-4">
              {status === 'GENERATING_QR' && (
                <div className="py-8 space-y-3">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                  <p className="text-sm font-bold text-slate-700">Đang khởi tạo phiên Zalo và tạo mã QR...</p>
                  <p className="text-xs text-slate-500">Vui lòng chờ khoảng vài giây</p>
                </div>
              )}

              {status === 'QR_READY' && qrCode && (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-left flex items-start space-x-2.5">
                    <Smartphone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-950 space-y-1">
                      <p className="font-bold">Hướng dẫn kết nối tài khoản Chị Nguyên:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-blue-900">
                        <li>Mở ứng dụng <strong>Zalo trên điện thoại</strong> của Chị Nguyên.</li>
                        <li>Bấm vào biểu tượng <strong>Quét mã QR</strong> ở góc trên bên phải.</li>
                        <li>Hướng camera quét mã QR bên dưới và bấm <strong>Cho phép đăng nhập</strong>.</li>
                      </ol>
                    </div>
                  </div>

                  <div className="inline-block p-4 bg-white border-2 border-dashed border-blue-300 rounded-2xl shadow-md">
                    <img
                      src={qrCode}
                      alt="Mã QR đăng nhập Zalo"
                      className="w-56 h-56 mx-auto object-contain rounded-lg"
                    />
                  </div>

                  <div className="flex items-center justify-center space-x-2 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Đang chờ quét mã QR... Mã có hiệu lực trong 90 giây.</span>
                  </div>

                  <div>
                    <button
                      onClick={handleGenerateQR}
                      disabled={loading}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-xl inline-flex items-center space-x-1.5 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>Tạo lại mã QR mới</span>
                    </button>
                  </div>
                </div>
              )}

              {status === 'SCANNED' && (
                <div className="py-6 space-y-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto animate-bounce">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-extrabold text-amber-950">ĐÃ QUÉT MÃ QR THÀNH CÔNG!</h3>
                  <p className="text-xs text-amber-800 max-w-sm mx-auto">
                    Chị Nguyên vui lòng nhìn vào màn hình điện thoại và bấm <strong>"Cho phép đăng nhập"</strong> (hoặc "Xác nhận") để hoàn tất.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TRƯỜNG HỢP 3: CHƯA KẾT NỐI (DISCONNECTED / ERROR) */}
          {(status === 'DISCONNECTED' || status === 'ERROR') && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0068FF] flex items-center justify-center mx-auto font-black text-2xl shadow-xs">
                  Z
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Chưa Kết Nối Bot Zalo</h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1">
                    Kết nối tài khoản Zalo phụ của Chị Nguyên (Cấp 2) để hệ thống tự động bắn tin giao việc & nhắc nhở ca trực vào nhóm Zalo chung.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2 text-left">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleGenerateQR}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-[#0068FF] hover:bg-[#0052cc] text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <QrCode className="w-5 h-5" />
                    <span>{loading ? 'Đang tạo mã...' : 'Tạo Mã QR Quét Kết Nối Zalo'}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-100/80 rounded-xl text-[11px] text-slate-600 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>An toàn & Độc lập 100%:</span>
                </div>
                <p>• Chị Nguyên vẫn dùng phần mềm Zalo trên máy tính để trao đổi bình thường, không bị văng ra.</p>
                <p>• Máy tính chị Nguyên tắt thì Bot trên hệ thống vẫn tự động nhắc việc đúng 15:00 hằng ngày.</p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
}
