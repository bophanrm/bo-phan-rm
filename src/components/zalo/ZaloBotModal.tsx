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
} from 'lucide-react';

interface ZaloGroupInfo {
  id: string;
  name: string;
  totalMember?: number;
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
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [config, setConfig] = useState({
    enabled: true,
    notifyOnNewTask: true,
    notifyDailyShiftReminder: true,
    notifyProjectDeadline: true,
  });

  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

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
      }
      if (data.groups && Array.isArray(data.groups)) {
        setGroups(data.groups);
      }
    } catch (err: any) {
      console.error('Lỗi lấy trạng thái Zalo Bot:', err);
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
    const targetGroupId = newGroupId !== undefined ? newGroupId : selectedGroupId;
    const groupName = groups.find((g) => g.id === targetGroupId)?.name || null;

    try {
      const res = await fetch('/api/zalo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: targetGroupId || null,
          groupName,
          ...config,
        }),
      });
      const data = await res.json();
      if (data?.config?.groupId) {
        setSelectedGroupId(data.config.groupId);
      }
      fetchStatus();
    } catch (err) {
      console.error('Lỗi lưu cấu hình:', err);
    }
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
                
                {/* CÔNG TẮC TỔNG (MASTER SWITCH) */}
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
                        {config.enabled ? 'Đang BẬT Gửi Tin Tự Động' : 'ĐÃ TẮT GỬI TIN TỰ ĐỘNG'}
                      </span>
                    </div>
                    <p className={`text-[11px] leading-tight ${config.enabled ? 'text-emerald-800' : 'text-rose-800 font-medium'}`}>
                      {config.enabled
                        ? 'Hệ thống tự động gửi tin vào Zalo theo các kịch bản bên dưới.'
                        : 'Bot tạm dừng 100% mọi tin tự động (Zalo Chị Nguyên vẫn được lưu phiên, không bị mất).'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...config, enabled: !config.enabled };
                      setConfig(updated);
                      fetch('/api/zalo/config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...updated, groupId: selectedGroupId }),
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all shadow-xs cursor-pointer ${
                      config.enabled
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {config.enabled ? 'TẮT GỬI TIN' : 'BẬT LẠI NGAY'}
                  </button>
                </div>

                <div className="flex items-center space-x-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider pt-1 border-t border-slate-200/80">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>Kịch Bản Chi Tiết (Bật/Tắt theo nhu cầu)</span>
                </div>

                <div className={`space-y-2 text-xs transition-opacity ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!config.enabled}
                      checked={config.notifyOnNewTask}
                      onChange={(e) => {
                        const updated = { ...config, notifyOnNewTask: e.target.checked };
                        setConfig(updated);
                        fetch('/api/zalo/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ...updated, groupId: selectedGroupId }),
                        });
                      }}
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
                      onChange={(e) => {
                        const updated = { ...config, notifyDailyShiftReminder: e.target.checked };
                        setConfig(updated);
                        fetch('/api/zalo/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ...updated, groupId: selectedGroupId }),
                        });
                      }}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Nhắc nhở lúc 15:00 hằng ngày (Trước hết ca 1h)</span>
                      <p className="text-[11px] text-slate-500">Tự động quét danh sách ai chưa nộp báo cáo ca trực và tag tên đôn đốc trong nhóm.</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!config.enabled}
                      checked={config.notifyProjectDeadline}
                      onChange={(e) => {
                        const updated = { ...config, notifyProjectDeadline: e.target.checked };
                        setConfig(updated);
                        fetch('/api/zalo/config', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ...updated, groupId: selectedGroupId }),
                        });
                      }}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Nhắc nhở Dự án / Kế hoạch dài hạn</span>
                      <p className="text-[11px] text-slate-500">Tự động nhắc nhở trước hạn nộp 1 ngày và ngày kết thúc dự án.</p>
                    </div>
                  </label>
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
