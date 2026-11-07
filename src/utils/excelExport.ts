import ExcelJS from 'exceljs';
import { Task, User, WorkShiftAssignment, TeamGroup, SHIFTS_CONFIG, ShiftId } from '@/types';
import { getPersonalName } from '@/utils/nameHelper';

// Helper to convert Image URL to base64 buffer for Excel embedding
async function urlToBase64(url: string): Promise<{ base64: string; extension: 'jpeg' | 'png' } | null> {
  try {
    if (url.startsWith('data:image/')) {
      const parts = url.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const extension = mime.includes('png') ? 'png' : 'jpeg';
      return { base64: parts[1], extension };
    }

    // Remote URL
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const extension = blob.type.includes('png') ? 'png' : 'jpeg';

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result && result.includes(',')) {
          resolve({ base64: result.split(',')[1], extension });
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Error fetching image for excel:', e);
    return null;
  }
}

interface ExportExcelOptions {
  tasks: Task[];
  users: User[];
  date?: Date;
  exportedByName?: string;
  managerName?: string;
}

export async function exportDailyTasksToExcel({
  tasks,
  users,
  date = new Date(),
  exportedByName = 'Nguyên (Nhân Viên Điều Phối)',
  managerName = 'Vũ (Trưởng phòng)',
}: ExportExcelOptions): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = exportedByName;
  workbook.lastModifiedBy = exportedByName;
  workbook.created = date;
  workbook.modified = date;

  const dateFormatted = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

  const dateShort = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date).replace(/\//g, '_');

  const worksheet = workbook.addWorksheet('Báo Cáo Ngày', {
    views: [{ showGridLines: true }],
  });

  // Set column widths
  worksheet.columns = [
    { key: 'stt', width: 6 }, // A
    { key: 'slot', width: 14 }, // B
    { key: 'title', width: 32 }, // C
    { key: 'desc', width: 38 }, // D
    { key: 'assignee', width: 26 }, // E
    { key: 'creator', width: 24 }, // F
    { key: 'status', width: 18 }, // G
    { key: 'deadline', width: 12 }, // H
    { key: 'submittedAt', width: 14 }, // I
    { key: 'summary', width: 36 }, // J
    { key: 'feedback', width: 28 }, // K
    { key: 'image', width: 30 }, // L
  ];

  // Title rows
  // Row 1: Company header
  worksheet.mergeCells('A1:L1');
  const row1 = worksheet.getCell('A1');
  row1.value = 'CÔNG TY TNHH KỸ THUẬT & DỊCH VỤ VIỄN THÔNG';
  row1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
  row1.alignment = { vertical: 'middle', horizontal: 'left' };

  // Row 2: Main Title
  worksheet.mergeCells('A2:L2');
  const row2 = worksheet.getCell('A2');
  row2.value = 'BÁO CÁO CÔNG VIỆC HẰNG NGÀY & KẾT QUẢ NGHIỆM THU';
  row2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
  row2.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 30;

  // Row 3: Date & Details
  worksheet.mergeCells('A3:L3');
  const row3 = worksheet.getCell('A3');
  row3.value = `Ngày thực hiện: ${dateFormatted}  •  Người tổng hợp: ${exportedByName}  •  Lãnh đạo phụ trách: ${managerName}`;
  row3.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF334155' } };
  row3.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(3).height = 20;

  // Row 4: Summary KPIs
  const completedCount = tasks.filter((t) => t.status === 'APPROVED').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'TODO').length;
  const submittedCount = tasks.filter((t) => t.status === 'SUBMITTED').length;

  worksheet.mergeCells('A4:L4');
  const row4 = worksheet.getCell('A4');
  row4.value = `Tổng số công việc: ${tasks.length}   |   Đã hoàn thành: ${completedCount}   |   Chờ duyệt: ${submittedCount}   |   Đang thực hiện: ${inProgressCount}   |   Tỷ lệ hoàn thành: ${tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0}%`;
  row4.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F766E' } };
  row4.alignment = { vertical: 'middle', horizontal: 'center' };
  row4.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0FDFA' },
  };
  worksheet.getRow(4).height = 22;

  // Row 5: Blank separator
  worksheet.getRow(5).height = 10;

  // Row 6: Table Header
  const headers = [
    'STT',
    'Khung Giờ',
    'Tên Công Việc',
    'Nội Dung & Yêu Cầu',
    'Người / Tổ Thực Hiện',
    'Người Giao Việc',
    'Trạng Thái',
    'Hạn Nộp',
    'Giờ Nộp',
    'Kết Quả & Ghi Chú',
    'Ý Kiến Phê Duyệt',
    'HÌNH ẢNH NGHIỆM THU',
  ];

  const headerRow = worksheet.getRow(6);
  headerRow.values = headers;
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Dark Blue
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  let currentRowIdx = 7;

  // Insert Task rows
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const latestReport = task.reports && task.reports.length > 0 ? task.reports[task.reports.length - 1] : null;

    const timeSlotLabel =
      task.isDaily
        ? 'Toàn ca (7h30 - 16h)'
        : task.timeSlot === 'MORNING'
        ? 'Buổi Sáng'
        : task.timeSlot === 'AFTERNOON'
        ? 'Buổi Chiều'
        : task.timeSlot === 'FULL_DAY'
        ? 'Cả Ngày'
        : 'Theo kế hoạch';

    const statusLabel =
      task.status === 'APPROVED'
        ? '✓ ĐÃ HOÀN THÀNH'
        : task.status === 'SUBMITTED'
        ? '⏳ CHỜ DUYỆT'
        : task.status === 'IN_PROGRESS'
        ? '⚡ ĐANG LÀM'
        : task.status === 'REJECTED'
        ? '⚠️ CẦN SỬA'
        : 'MỚI GIAO';

    const deadlineTime = task.reportDeadline
      ? new Date(task.reportDeadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '--:--';

    const submittedTime = latestReport
      ? new Date(latestReport.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : '--:--';

    const assigneeText = task.teamName || task.assignedToNames.map((n) => getPersonalName(n)).join(', ');

    const row = worksheet.getRow(currentRowIdx);
    row.values = [
      i + 1,
      timeSlotLabel,
      task.title,
      task.description,
      assigneeText,
      getPersonalName(task.createdByName, true),
      statusLabel,
      deadlineTime,
      submittedTime,
      latestReport?.summary || '(Chưa nộp kết quả)',
      latestReport?.managerFeedback || (task.status === 'APPROVED' ? 'Đạt yêu cầu nghiệm thu' : ''),
      '', // Image cell (Col 12 / L)
    ];

    // Standard row height (if has image, increase to 85)
    const hasImage = latestReport?.attachments && latestReport.attachments.length > 0;
    row.height = hasImage ? 85 : 45;

    // Cell styling
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Center STT, Slot, Status, Times
      if ([1, 2, 7, 8, 9, 12].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }

      // Status color highlights
      if (colNumber === 7) {
        cell.font = { name: 'Arial', size: 9, bold: true };
        if (task.status === 'APPROVED') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light green
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF166534' } };
        } else if (task.status === 'SUBMITTED') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }; // Light purple
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF6B21A8' } };
        } else if (task.status === 'IN_PROGRESS') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }; // Light blue
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E40AF' } };
        }
      }
    });

    // Embed Image into Column L if available
    if (hasImage && latestReport.attachments[0]?.url) {
      const imgData = await urlToBase64(latestReport.attachments[0].url);
      if (imgData) {
        const imageId = workbook.addImage({
          base64: imgData.base64,
          extension: imgData.extension,
        });

        worksheet.addImage(imageId, {
          tl: { col: 11.15, row: currentRowIdx - 0.9 },
          ext: { width: 140, height: 95 },
        });
      }
    }

    currentRowIdx++;
  }

  // Footer signature section
  currentRowIdx += 2;
  worksheet.mergeCells(`B${currentRowIdx}:E${currentRowIdx}`);
  const signLeftHeader = worksheet.getCell(`B${currentRowIdx}`);
  signLeftHeader.value = 'NGƯỜI LẬP BÁO CÁO (NHÂN VIÊN ĐIỀU PHỐI)';
  signLeftHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  signLeftHeader.alignment = { horizontal: 'center' };

  worksheet.mergeCells(`I${currentRowIdx}:L${currentRowIdx}`);
  const signRightHeader = worksheet.getCell(`I${currentRowIdx}`);
  signRightHeader.value = 'TRƯỞNG PHÒNG / LÃNH ĐẠO PHÊ DUYỆT';
  signRightHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  signRightHeader.alignment = { horizontal: 'center' };

  currentRowIdx++;
  worksheet.mergeCells(`B${currentRowIdx}:E${currentRowIdx}`);
  const signLeftSub = worksheet.getCell(`B${currentRowIdx}`);
  signLeftSub.value = '(Ký, ghi rõ họ tên)';
  signLeftSub.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  signLeftSub.alignment = { horizontal: 'center' };

  worksheet.mergeCells(`I${currentRowIdx}:L${currentRowIdx}`);
  const signRightSub = worksheet.getCell(`I${currentRowIdx}`);
  signRightSub.value = '(Ký duyệt nghiệm thu)';
  signRightSub.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  signRightSub.alignment = { horizontal: 'center' };

  currentRowIdx += 4;
  worksheet.mergeCells(`B${currentRowIdx}:E${currentRowIdx}`);
  const signLeftName = worksheet.getCell(`B${currentRowIdx}`);
  signLeftName.value = getPersonalName(exportedByName, true);
  signLeftName.font = { name: 'Arial', size: 10, bold: true };
  signLeftName.alignment = { horizontal: 'center' };

  worksheet.mergeCells(`I${currentRowIdx}:L${currentRowIdx}`);
  const signRightName = worksheet.getCell(`I${currentRowIdx}`);
  signRightName.value = managerName.split('/').map((n) => getPersonalName(n.trim(), true)).join(' / ');
  signRightName.font = { name: 'Arial', size: 10, bold: true };
  signRightName.alignment = { horizontal: 'center' };

  // Write buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `BaoCao_CongViec_HangNgay_${dateShort}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Xuất Bảng Phân Ca Làm Việc Tuần cho cả Team ra file Excel
 */
export async function exportShiftScheduleToExcel({
  weekMonday,
  teams,
  users,
  shifts,
  exportedByName = 'Nguyên (Nhân Viên Điều Phối)',
  managerName = 'Vũ (Trưởng phòng)',
}: {
  weekMonday: Date;
  teams: TeamGroup[];
  users: User[];
  shifts: WorkShiftAssignment[];
  exportedByName?: string;
  managerName?: string;
}): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = exportedByName;
  workbook.lastModifiedBy = exportedByName;
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Lịch Làm Việc Tuần', {
    views: [{ showGridLines: true }],
  });

  // Generate 7 days
  const days: { date: Date; dateStr: string; label: string }[] = [];
  const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekMonday);
    d.setDate(weekMonday.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dateFormatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    days.push({
      date: d,
      dateStr,
      label: `${dayNames[i]} (${dateFormatted})`,
    });
  }

  const startFormatted = `${weekMonday.getDate().toString().padStart(2, '0')}/${(weekMonday.getMonth() + 1).toString().padStart(2, '0')}/${weekMonday.getFullYear()}`;
  const endSunday = new Date(weekMonday);
  endSunday.setDate(weekMonday.getDate() + 6);
  const endFormatted = `${endSunday.getDate().toString().padStart(2, '0')}/${(endSunday.getMonth() + 1).toString().padStart(2, '0')}/${endSunday.getFullYear()}`;

  // Title
  worksheet.mergeCells('A1:J1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'BẢNG PHÂN CÔNG LỊCH LÀM VIỆC & TRỰC CA TOÀN BỘ NHÂN SỰ';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  // Subtitle
  worksheet.mergeCells('A2:J2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `Tuần: Từ ngày ${startFormatted} đến ngày ${endFormatted} • Lập bởi: ${getPersonalName(exportedByName, true)}`;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  // Shift Legend Row
  worksheet.mergeCells('A3:J3');
  const legendCell = worksheet.getCell('A3');
  legendCell.value = 'Quy chuẩn ca: [Ca Hành Chính: 7h30 - 16h]  •  [Ca 1: 6h - 14h]  •  [Ca 2: 14h - 22h]  •  [Ca 3: 22h - 6h (Trực đêm)]';
  legendCell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E40AF' } };
  legendCell.alignment = { horizontal: 'center', vertical: 'middle' };
  legendCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  worksheet.getRow(3).height = 22;

  // Headers (Row 5)
  const headers = ['STT', 'Họ Và Tên', 'Tổ / Đội', ...days.map((d) => d.label)];
  const headerRow = worksheet.getRow(5);
  headerRow.values = headers;
  headerRow.height = 26;

  worksheet.columns = [
    { key: 'stt', width: 6 },
    { key: 'name', width: 22 },
    { key: 'team', width: 26 },
    { key: 'd0', width: 18 },
    { key: 'd1', width: 18 },
    { key: 'd2', width: 18 },
    { key: 'd3', width: 18 },
    { key: 'd4', width: 18 },
    { key: 'd5', width: 18 },
    { key: 'd6', width: 18 },
  ];

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  const getLevelPriority = (u: User) => {
    if (u.level === 'LEVEL_1_MANAGER' || u.role === 'MANAGER') return 1;
    if (u.level === 'LEVEL_2_SECRETARY' || u.role === 'SECRETARY') return 2;
    if (u.level === 'LEVEL_3_LEAD') return 3;
    if (u.level === 'LEVEL_4_STAFF' || u.role === 'STAFF') return 4;
    return 5;
  };

  const staffUsers = users
    .filter((u) => u.role !== 'ADMIN')
    .sort((a, b) => getLevelPriority(a) - getLevelPriority(b));
  let rowIdx = 6;

  staffUsers.forEach((user, idx) => {
    const userTeam = teams.find((t) => t.memberIds.includes(user.id));
    const teamName = userTeam ? userTeam.name : user.department;

    const rowData: any = [
      idx + 1,
      getPersonalName(user.name, true),
      teamName,
    ];

    days.forEach((d) => {
      const shift = shifts.find((s) => s.userId === user.id && s.date === d.dateStr);
      if (shift) {
        const conf = SHIFTS_CONFIG[shift.shiftId];
        const halfText = shift.isHalfDay ? ' [Nghỉ 1/2 Ca]' : '';
        rowData.push(conf ? `${conf.name}${halfText}\n(${conf.timeRange})` : 'Nghỉ');
      } else {
        rowData.push('Nghỉ Ca');
      }
    });

    const row = worksheet.getRow(rowIdx);
    row.values = rowData;
    row.height = 30;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: colNumber <= 3 ? 'left' : 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (colNumber === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };

      // Highlight shift cell colors
      if (colNumber >= 4) {
        const val = String(cell.value || '');
        if (val.includes('Hành Chính')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }; // Light blue
        } else if (val.includes('Ca 1')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Amber
        } else if (val.includes('Ca 2')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }; // Indigo
        } else if (val.includes('Ca 3')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }; // Purple night
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF581C87' } };
        } else if (val.includes('Nghỉ')) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          cell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
        }
      }
    });

    rowIdx++;
  });

  // Footer Signatures
  rowIdx += 2;
  worksheet.mergeCells(`B${rowIdx}:D${rowIdx}`);
  const signLeftHeader = worksheet.getCell(`B${rowIdx}`);
  signLeftHeader.value = 'NGƯỜI LẬP LỊCH (NHÂN VIÊN ĐIỀU PHỐI)';
  signLeftHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  signLeftHeader.alignment = { horizontal: 'center' };

  worksheet.mergeCells(`G${rowIdx}:I${rowIdx}`);
  const signRightHeader = worksheet.getCell(`G${rowIdx}`);
  signRightHeader.value = 'LÃNH ĐẠO / TRƯỞNG PHÒNG PHÊ DUYỆT';
  signRightHeader.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  signRightHeader.alignment = { horizontal: 'center' };

  rowIdx++;
  worksheet.mergeCells(`B${rowIdx}:D${rowIdx}`);
  const signLeftSub = worksheet.getCell(`B${rowIdx}`);
  signLeftSub.value = '(Ký, ghi rõ họ tên)';
  signLeftSub.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  signLeftSub.alignment = { horizontal: 'center' };

  worksheet.mergeCells(`G${rowIdx}:I${rowIdx}`);
  const signRightSub = worksheet.getCell(`G${rowIdx}`);
  signRightSub.value = '(Ký duyệt)';
  signRightSub.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
  signRightSub.alignment = { horizontal: 'center' };

  rowIdx += 4;
  worksheet.mergeCells(`B${rowIdx}:D${rowIdx}`);
  const signLeftName = worksheet.getCell(`B${rowIdx}`);
  signLeftName.value = getPersonalName(exportedByName, true);
  signLeftName.font = { name: 'Arial', size: 10, bold: true };
  signLeftName.alignment = { horizontal: 'center' };

  worksheet.mergeCells(`G${rowIdx}:I${rowIdx}`);
  const signRightName = worksheet.getCell(`G${rowIdx}`);
  signRightName.value = getPersonalName(managerName, true);
  signRightName.font = { name: 'Arial', size: 10, bold: true };
  signRightName.alignment = { horizontal: 'center' };

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Bang_Phan_Ca_Tuan_${startFormatted.replace(/\//g, '-')}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
