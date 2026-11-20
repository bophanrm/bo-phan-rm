'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Task, User } from '@/types';
import { calculateShiftTimes } from '@/utils/shiftHelper';
import { getPersonalName } from '@/utils/nameHelper';
import {
  canDirectlyExtendTask,
  canRequestExtension,
  canApproveExtensionRequest,
} from '@/utils/permissions';
import {
  X,
  Calendar,
  Clock,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  Send,
  ArrowRightLeft,
  ShieldCheck,
  Info,
} from 'lucide-react';

interface ExtendDeadlineModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExtendDeadlineModal({ task, isOpen, onClose }: ExtendDeadlineModalProps) {
  const {
    currentUser,
    users,
    getShiftForUser,
    extendTaskDeadline,
    requestTaskExtension,
    approveTaskExtension,
    rejectTaskExtension,
  } = useApp();

  // Xác định hạn hiện tại của task và mốc cơ sở để tính gia hạn
  const currentDeadline = task ? new Date(task.reportDeadline || task.dueDate) : new Date();
  const isValidCurrentDeadline = !isNaN(currentDeadline.getTime());

  // Mốc cơ sở để gia hạn (Base Date):
  // - Nếu hạn hiện tại >= hôm nay (chưa quá hạn, vd hạn 20/11 mà hôm nay 17/11): Mốc cơ sở là ngày hạn hiện tại (20/11)
  // - Nếu đã quá hạn so với hôm nay (vd hạn 15/11, hôm nay 17/11): Mốc cơ sở là ngày hôm nay (17/11)
  const getBaseExtendDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isValidCurrentDeadline) {
      const taskDay = new Date(currentDeadline);
      taskDay.setHours(0, 0, 0, 0);
      if (taskDay.getTime() >= today.getTime()) {
        return taskDay;
      }
    }
    return today;
  };

  const getDefaultTargetDateStr = () => {
    const base = getBaseExtendDate();
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getDefaultTargetDateStr());
  const [selectedTime, setSelectedTime] = useState<string>('16:00');
  const [useShiftTime, setUseShiftTime] = useState<boolean>(true);
  const [reason, setReason] = useState<string>('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectFeedback, setRejectFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quyền hạn đối với task hiện tại
  const hasDirectExtendPermission = task ? canDirectlyExtendTask(currentUser, task, users) : false;
  const hasApprovePermission = task ? canApproveExtensionRequest(currentUser, task, users) : false;
  const hasRequestPermission = task ? canRequestExtension(currentUser, task) : false;

  const pendingRequest = task?.extensionRequest?.status === 'PENDING' ? task.extensionRequest : null;

  // Khi mở modal, khởi tạo lại giá trị dựa trên trạng thái task
  useEffect(() => {
    if (isOpen && task) {
      setIsRejecting(false);
      setRejectFeedback('');

      if (pendingRequest) {
        // Nếu có pending request, điền trước thông tin đề xuất
        const reqDateObj = new Date(pendingRequest.requestedNewDeadline);
        if (!isNaN(reqDateObj.getTime())) {
          setSelectedDate(reqDateObj.toISOString().split('T')[0]);
          const hh = reqDateObj.getHours().toString().padStart(2, '0');
          const mm = reqDateObj.getMinutes().toString().padStart(2, '0');
          setSelectedTime(`${hh}:${mm}`);
        } else {
          setSelectedDate(getDefaultTargetDateStr());
          setSelectedTime('16:00');
        }
        setReason(pendingRequest.reason || '');
        setSelectedAssigneeId(pendingRequest.suggestedAssigneeId || task.assignedTo[0] || '');
        setUseShiftTime(false);
      } else {
        setSelectedDate(getDefaultTargetDateStr());
        setSelectedTime('16:00');
        setReason('');
        setSelectedAssigneeId(task.assignedTo[0] || '');
        setUseShiftTime(true);
      }
    }
  }, [isOpen, task, pendingRequest]);

  if (!isOpen || !task) return null;

  // Nhân sự được nhắm đến (được chọn để làm tiếp hoặc nhận bàn giao)
  const effectiveAssigneeId = selectedAssigneeId || task.assignedTo[0];
  const targetUser = users.find((u) => u.id === effectiveAssigneeId);
  const targetUserName = targetUser ? getPersonalName(targetUser.name) : 'Nhân sự';

  // Đối chiếu ca trực vào ngày đã chọn
  const targetDateObj = selectedDate ? new Date(selectedDate) : new Date();
  const assigneeShift = effectiveAssigneeId ? getShiftForUser(effectiveAssigneeId, selectedDate) : undefined;
  const hasAssigneeShift = !!assigneeShift;
  const isAssigneeOff = assigneeShift?.shiftId === 'OFF';
  const shiftCalc = calculateShiftTimes(assigneeShift?.shiftId || 'HANH_CHINH', targetDateObj);

  // Tính số ngày chênh lệch giữa ngày mới và mốc hạn cơ sở
  const baseDateForDiff = getBaseExtendDate();
  const diffDaysFromBase = selectedDate
    ? Math.round((new Date(selectedDate).setHours(0, 0, 0, 0) - baseDateForDiff.getTime()) / (1000 * 60 * 60 * 24))
    : 1;

  // Tính ISO deadline mới
  const computeNewDeadlineIso = () => {
    if (useShiftTime) {
      if (hasAssigneeShift && !isAssigneeOff) {
        return shiftCalc.reportDeadlineIso;
      }
      // Chưa có lịch điều phối hoặc ngày nghỉ ca: tạm áp dụng mốc giờ chuẩn 16:00
      // Hệ thống sẽ tự động cập nhật khớp theo ca trực thực tế ngay khi Điều phối viên duyệt lịch tuần
      const d = new Date(selectedDate);
      d.setHours(16, 0, 0, 0);
      return d.toISOString();
    }
    const [h, m] = selectedTime.split(':').map(Number);
    const d = new Date(selectedDate);
    d.setHours(h || 16, m || 0, 0, 0);
    return d.toISOString();
  };

  const handleAddDays = (daysToAdd: number) => {
    const base = getBaseExtendDate();
    const d = new Date(base);
    d.setDate(d.getDate() + daysToAdd);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Xử lý gửi: Phụ thuộc vào vai trò (Cấp trên duyệt, Cấp trên đổi trực tiếp, hoặc Cấp 4 xin gia hạn)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const newDeadlineIso = computeNewDeadlineIso();
      const finalReason =
        reason.trim() ||
        (useShiftTime
          ? `Theo ca ${shiftCalc.shiftInfo.name}: ${shiftCalc.shiftInfo.timeRange || 'Ca nghỉ'}`
          : 'Điều chỉnh tiến độ hoàn thành');

      if (pendingRequest && hasApprovePermission) {
        // Cấp trên / Người giao việc phê duyệt yêu cầu gia hạn
        approveTaskExtension(
          task.id,
          newDeadlineIso,
          selectedAssigneeId !== task.assignedTo[0] ? selectedAssigneeId : undefined,
          finalReason
        );
      } else if (hasDirectExtendPermission) {
        // Cấp 1, Cấp 2, hoặc Người tạo việc chủ động gia hạn / chuyển giao
        extendTaskDeadline(
          task.id,
          newDeadlineIso,
          finalReason,
          selectedAssigneeId !== task.assignedTo[0] ? selectedAssigneeId : undefined
        );
      } else if (hasRequestPermission) {
        // Cấp 4 gửi yêu cầu xin gia hạn & đề xuất bàn giao
        requestTaskExtension(
          task.id,
          newDeadlineIso,
          finalReason,
          selectedAssigneeId !== task.assignedTo[0] ? selectedAssigneeId : undefined
        );
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Từ chối yêu cầu gia hạn
  const handleReject = () => {
    if (!rejectFeedback.trim()) {
      alert('Vui lòng nhập lý do từ chối yêu cầu gia hạn.');
      return;
    }
    setIsSubmitting(true);
    try {
      rejectTaskExtension(task.id, rejectFeedback.trim());
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Danh sách nhân sự khả dụng để chuyển giao / bàn giao (Cấp 3 và Cấp 4)
  const availableAssignees = users.filter((u) => u.role === 'STAFF' || u.level === 'LEVEL_3_LEAD' || u.level === 'LEVEL_4_STAFF');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/50">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs text-white ${
              pendingRequest && hasApprovePermission
                ? 'bg-amber-600'
                : hasDirectExtendPermission
                ? 'bg-blue-600'
                : 'bg-indigo-600'
            }`}>
              {pendingRequest && hasApprovePermission ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                pendingRequest && hasApprovePermission
                  ? 'text-amber-800'
                  : 'text-blue-700'
              }`}>
                {pendingRequest && hasApprovePermission
                  ? 'Phê Duyệt Gia Hạn & Điều Phối Bàn Giao'
                  : hasDirectExtendPermission
                  ? 'Gia Hạn & Điều Phối Bàn Giao Công Việc'
                  : 'Xin Gia Hạn & Đề Xuất Bàn Giao (Cấp 4)'}
              </span>
              <h3 className="font-bold text-slate-900 text-sm truncate max-w-xs">{task.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* BANNER 1: Khi có yêu cầu xin gia hạn đang chờ cấp trên duyệt */}
          {pendingRequest && (
            <div className="p-3.5 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 flex items-center space-x-1.5 text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Yêu Cầu Gia Hạn Từ: {pendingRequest.requestedByName}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  Chờ Duyệt
                </span>
              </div>
              <div className="bg-white/95 rounded-lg p-2.5 border border-amber-200 space-y-1 text-slate-700 text-[11px]">
                <p>
                  <strong>Hạn xin gia hạn:</strong>{' '}
                  <span className="text-blue-700 font-bold">
                    {new Date(pendingRequest.requestedNewDeadline).toLocaleString('vi-VN', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
                <p>
                  <strong>Lý do:</strong> &quot;{pendingRequest.reason}&quot;
                </p>
                {pendingRequest.suggestedAssigneeName && (
                  <p className="text-purple-700 font-medium">
                    <strong>Đề xuất bàn giao cho:</strong> {pendingRequest.suggestedAssigneeName}
                  </p>
                )}
              </div>

              {!hasApprovePermission && (
                <div className="text-[11px] text-amber-800 italic pt-1">
                  ⏳ Yêu cầu đã được gửi lên Ban Quản Lý / Người giao việc. Vui lòng chờ phản hồi.
                </div>
              )}
            </div>
          )}

          {/* BANNER 2: Hướng dẫn cho Cấp 4 nếu chưa gửi yêu cầu */}
          {!pendingRequest && !hasDirectExtendPermission && hasRequestPermission && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start space-x-2 text-blue-900 text-[11px]">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Quy tắc phân quyền:</strong> Yêu cầu xin gia hạn và đề xuất bàn giao của bạn sẽ được gửi tới Cấp trên / Người giao việc để xem xét và phê duyệt.
              </div>
            </div>
          )}

          {/* Thông tin hạn chót & Người thực hiện hiện tại */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px]">
            <div>
              <span className="text-slate-500 block">Hạn hiện tại:</span>
              <span className="font-bold text-rose-600">
                {new Date(task.reportDeadline || task.dueDate).toLocaleString('vi-VN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Người thực hiện:</span>
              <span className="font-bold text-slate-800 truncate block">
                {task.assignedToNames?.map((n) => getPersonalName(n)).join(', ') || 'Chưa có'}
              </span>
            </div>
          </div>

          {/* CHẾ ĐỘ TỪ CHỐI DUYỆT (Nếu cấp trên muốn từ chối yêu cầu gia hạn) */}
          {isRejecting ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Từ Chối Yêu Cầu Xin Gia Hạn</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Nhập lý do chỉ đạo nhân sự tiếp tục hoàn thành đúng hạn hoặc biện pháp khắc phục:
              </p>
              <textarea
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                placeholder="VD: Không duyệt gia hạn do tiến độ gấp, đề nghị hoàn thành dứt điểm trong ngày..."
                rows={3}
                className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-600 font-semibold hover:bg-white cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  Xác Nhận Từ Chối
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* PHÂN CÔNG LẠI / CHUYỂN GIAO CÔNG VIỆC CHO NGƯỜI KHÁC */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {hasDirectExtendPermission || (pendingRequest && hasApprovePermission)
                      ? 'Chỉ Định Người Thực Hiện / Chuyển Giao (Tùy Chọn)'
                      : 'Đề Xuất Bàn Giao Cho Người Khác (Tùy Chọn)'}
                  </span>
                </label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={task.assignedTo[0]}>
                    -- Giữ nguyên: {task.assignedToNames?.[0] || 'Nhân sự hiện tại'} --
                  </option>
                  <optgroup label="Bàn giao sang nhân sự khác">
                    {availableAssignees
                      .filter((u) => u.id !== task.assignedTo[0])
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {getPersonalName(u.name, false)} ({u.level === 'LEVEL_3_LEAD' ? 'Giám Sát' : 'Nhân Viên'})
                        </option>
                      ))}
                  </optgroup>
                </select>
                {selectedAssigneeId && selectedAssigneeId !== task.assignedTo[0] && (
                  <p className="text-[10px] text-indigo-700 font-medium">
                    ✦ Công việc sẽ được chuyển giao sang cho: <strong>{targetUserName}</strong>.
                  </p>
                )}
              </div>

              {/* CHỌN NGÀY HOÀN THÀNH MỚI */}
              <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    {pendingRequest && hasApprovePermission
                      ? 'Thời Gian Hoàn Thành Được Phê Duyệt'
                      : 'Gia Hạn Thêm / Chọn Ngày Hoàn Thành Mới'}
                  </label>
                  {diffDaysFromBase > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      + {diffDaysFromBase} ngày so với hạn
                    </span>
                  )}
                </div>

                {/* Các nút chọn nhanh số ngày gia hạn thêm (+1 ngày, +2 ngày, +3 ngày, +5 ngày, +7 ngày) */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-slate-500 mr-1">Cộng thêm:</span>
                  {[
                    { label: '+1 ngày', days: 1 },
                    { label: '+2 ngày', days: 2 },
                    { label: '+3 ngày', days: 3 },
                    { label: '+4 ngày', days: 4 },
                    { label: '+5 ngày', days: 5 },
                    { label: '+6 ngày', days: 6 },
                    { label: '+7 ngày', days: 7 },
                    { label: '+10 ngày', days: 10 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleAddDays(preset.days)}
                      className={`px-2.5 py-1 rounded-lg border font-bold text-xs transition-all active:scale-95 cursor-pointer ${
                        diffDaysFromBase === preset.days
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Ô chọn ngày từ lịch */}
                <div className="flex items-center space-x-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                      required
                    />
                  </div>
                </div>

                {/* Đối chiếu trực quan: Hạn cũ -> Hạn mới đề xuất */}
                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Mốc tính hạn</span>
                    <span className="font-semibold text-slate-700">
                      {baseDateForDiff.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-blue-500 font-bold">➜</span>
                  <div className="text-right">
                    <span className="text-blue-600 block text-[9px] uppercase font-bold">Hạn mới đề xuất</span>
                    <span className="font-extrabold text-blue-700">
                      {selectedDate ? new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '---'}
                    </span>
                  </div>
                </div>
              </div>

              {/* THẺ ĐỐI CHIẾU CA TRỰC THỰC TẾ CỦA NHÂN SỰ ĐƯỢC CHỈ ĐỊNH */}
              <div
                className={`rounded-xl p-3.5 border space-y-2.5 ${
                  isAssigneeOff
                    ? 'bg-amber-50/90 border-amber-300'
                    : hasAssigneeShift
                    ? 'bg-gradient-to-br from-blue-50/90 via-sky-50/70 to-indigo-50/70 border-blue-200/90'
                    : 'bg-slate-50 border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center space-x-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lịch Trực Ca: {targetUserName}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isAssigneeOff
                        ? 'bg-amber-200 text-amber-900 border border-amber-300'
                        : hasAssigneeShift
                        ? 'bg-blue-600 text-white'
                        : 'bg-purple-600 text-white'
                    }`}
                  >
                    {isAssigneeOff
                      ? '⚠️ Nghỉ Ca'
                      : hasAssigneeShift
                      ? shiftCalc.shiftInfo.shortName
                      : '⏳ Chờ điều phối (Thứ 6)'}
                  </span>
                </div>

                {hasAssigneeShift && !isAssigneeOff ? (
                  <div className="bg-white/95 rounded-lg p-2.5 border border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 text-[11px]">{shiftCalc.formattedShiftText}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Tự động nhắc việc trước khi hết ca 1 tiếng: <strong>{shiftCalc.formattedReminderText}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-semibold text-slate-400 block uppercase">Hết ca lúc</span>
                      <span className="font-extrabold text-blue-700 text-xs">{shiftCalc.formattedDeadlineText}</span>
                    </div>
                  </div>
                ) : isAssigneeOff ? (
                  <div className="bg-white/95 rounded-lg p-2.5 border border-amber-300 space-y-2 text-amber-900 text-xs">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">
                          Lưu ý: {targetUserName} có lịch Nghỉ Ca vào ngày đã chọn ({selectedDate ? new Date(selectedDate).toLocaleDateString('vi-VN') : ''}).
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Đề xuất xử lý: <strong>(1) Gia hạn sang ca trực kế tiếp</strong> hoặc <strong>(2) Thay đổi hạn chót cho công việc đó</strong>.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddDays((diffDaysFromBase || 0) + 1)}
                      className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                    >
                      ➕ (1) Gia hạn sang ca trực kế tiếp (+1 ngày)
                    </button>
                  </div>
                ) : (
                  <div className="bg-white/95 rounded-lg p-2.5 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-[11px]">Chưa có lịch phân ca từ điều phối viên</span>
                      <span className="font-extrabold text-blue-700 text-xs">16:00 (Mốc tiêu chuẩn)</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Lịch làm việc tuần sau sẽ được điều phối viên lập vào Thứ 6. Hệ thống tạm lấy mốc 16:00 và sẽ tự động khớp ca trực ngay khi duyệt lịch tuần.
                    </p>
                  </div>
                )}

                {/* Checkbox: Tự động chốt theo giờ hết ca hay tùy chỉnh */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-[11px]">
                  <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={useShiftTime}
                      onChange={(e) => setUseShiftTime(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>
                      {hasAssigneeShift && !isAssigneeOff
                        ? `Tự động chốt hạn theo giờ hết ca (${shiftCalc.formattedDeadlineText})`
                        : 'Tự động chốt hạn theo khung giờ chuẩn (16:00)'}
                    </span>
                  </label>

                  {!useShiftTime && (
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>

              {/* LÝ DO GIA HẠN / GHI CHÚ */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  {pendingRequest && hasApprovePermission
                    ? 'Ghi Chú Phê Duyệt / Chỉ Đạo'
                    : 'Lý Do Gia Hạn & Bàn Giao'}
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    hasDirectExtendPermission
                      ? 'VD: Điều chuyển tiến độ ca sau, hỗ trợ khối lượng phát sinh...'
                      : 'VD: Khối lượng công việc phát sinh, chờ vật tư, đề xuất bàn giao ca sau...'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={!hasDirectExtendPermission && !pendingRequest}
                />
              </div>

              {/* ACTIONS */}
              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                >
                  Đóng
                </button>

                {/* Nếu có pendingRequest và user có quyền duyệt: hiển thị nút Duyệt & Từ chối */}
                {pendingRequest && hasApprovePermission ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsRejecting(true)}
                      className="py-2.5 px-3 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold transition-all cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Từ Chối</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Duyệt Gia Hạn & Bàn Giao</span>
                    </button>
                  </>
                ) : hasDirectExtendPermission ? (
                  /* Cấp 1, Cấp 2, hoặc Người tạo việc gia hạn trực tiếp */
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu Gia Hạn & Bàn Giao</span>
                  </button>
                ) : hasRequestPermission && !pendingRequest ? (
                  /* Cấp 4 gửi yêu cầu xin gia hạn */
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>Gửi Yêu Cầu Xin Gia Hạn</span>
                  </button>
                ) : null}
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
