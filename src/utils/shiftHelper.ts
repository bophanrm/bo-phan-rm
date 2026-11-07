import { ShiftId, SHIFTS_CONFIG, WorkShiftAssignment, ShiftInfo } from '@/types';

export interface ShiftTimeCalculation {
  shiftId: ShiftId;
  shiftInfo: ShiftInfo;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  reminderHour: number;
  reminderMinute: number;
  startDateIso: string;
  dueDateIso: string;
  reportDeadlineIso: string;
  reminderDateIso: string;
  formattedShiftText: string;
  formattedDeadlineText: string;
  formattedReminderText: string;
  isOff: boolean;
}

/**
 * Tính toán giờ bắt đầu, hạn chót và mốc nhắc nhở (1 tiếng trước khi hết ca)
 * theo ca làm việc được chỉ định và ngày cơ sở.
 */
export function calculateShiftTimes(
  shiftId: ShiftId = 'HANH_CHINH',
  baseDate: Date = new Date(),
  customShiftsMap?: Record<string, ShiftInfo>
): ShiftTimeCalculation {
  const isOff =
    shiftId === 'OFF' ||
    shiftId === 'OFF_HALF' ||
    Boolean(customShiftsMap?.[shiftId]?.hasNoTime) ||
    Boolean(SHIFTS_CONFIG[shiftId]?.hasNoTime);
  const effectiveShiftId: ShiftId = isOff ? 'HANH_CHINH' : shiftId;
  const shiftInfo =
    (customShiftsMap && customShiftsMap[shiftId]) ||
    (customShiftsMap && customShiftsMap[effectiveShiftId]) ||
    SHIFTS_CONFIG[shiftId] ||
    SHIFTS_CONFIG[effectiveShiftId] ||
    SHIFTS_CONFIG.HANH_CHINH;

  let startH = 7,
    startM = 30;
  let endH = 16,
    endM = 0;
  let reminderH = 15,
    reminderM = 0;
  let isNextDay = false;

  if (shiftInfo.startTime && shiftInfo.endTime) {
    const [sH, sM] = shiftInfo.startTime.split(':').map(Number);
    const [eH, eM] = shiftInfo.endTime.split(':').map(Number);
    startH = isNaN(sH) ? 7 : sH;
    startM = isNaN(sM) ? 30 : sM;
    endH = isNaN(eH) ? 16 : eH;
    endM = isNaN(eM) ? 0 : eM;
    isNextDay = endH < startH;
    reminderH = (endH - 1 + 24) % 24;
    reminderM = endM;
  } else if (effectiveShiftId === 'CA_1') {
    startH = 6;
    startM = 0;
    endH = 14;
    endM = 0;
    reminderH = 13;
    reminderM = 0;
  } else if (effectiveShiftId === 'CA_2') {
    startH = 14;
    startM = 0;
    endH = 22;
    endM = 0;
    reminderH = 21;
    reminderM = 0;
  } else if (effectiveShiftId === 'CA_3') {
    startH = 22;
    startM = 0;
    endH = 6;
    endM = 0;
    reminderH = 5;
    reminderM = 0;
    isNextDay = true;
  } else {
    // HANH_CHINH
    startH = 7;
    startM = 30;
    endH = 16;
    endM = 0;
    reminderH = 15;
    reminderM = 0;
  }

  const startD = new Date(baseDate);
  startD.setHours(startH, startM, 0, 0);

  const endD = new Date(baseDate);
  if (isNextDay) {
    endD.setDate(endD.getDate() + 1);
  }
  endD.setHours(endH, endM, 0, 0);

  const reminderD = new Date(endD.getTime() - 60 * 60 * 1000);

  const formatHourMin = (h: number, m: number) =>
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

  return {
    shiftId,
    shiftInfo,
    startHour: startH,
    startMinute: startM,
    endHour: endH,
    endMinute: endM,
    reminderHour: reminderH,
    reminderMinute: reminderM,
    startDateIso: startD.toISOString(),
    dueDateIso: endD.toISOString(),
    reportDeadlineIso: endD.toISOString(),
    reminderDateIso: reminderD.toISOString(),
    formattedShiftText: isOff ? `${shiftInfo.name} (${shiftInfo.timeRange || 'Chế độ nghỉ'})` : `${shiftInfo.name} (${shiftInfo.timeRange})`,
    formattedDeadlineText: `${formatHourMin(endH, endM)}${isNextDay ? ' (hôm sau)' : ''}`,
    formattedReminderText: `${formatHourMin(reminderH, reminderM)}${isNextDay ? ' (hôm sau)' : ''}`,
    isOff,
  };
}
