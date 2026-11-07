import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const DATA_PATH = path.resolve('data/latest_backup.json');
const rawData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const workbook = new ExcelJS.Workbook();
workbook.creator = 'Nguyễn Thị Thảo Nguyên (Cấp 2 - Điều Phối)';
workbook.lastModifiedBy = 'Hệ Thống Quản Lý Bộ Phận RM';
workbook.created = new Date('2026-11-07T17:58:00+07:00');
workbook.modified = new Date();

// ==========================================
// COLOR PALETTE & STYLES (Professional Theme)
// ==========================================
const COLORS = {
  navyHeader: 'FF1E3A8A',     // Primary Dark Navy
  blueSubHeader: 'FF2563EB',  // Accent Blue
  lightBlueBg: 'FFEFF6FF',    // 50 Blue
  softGrayBg: 'FFF8FAFC',     // 50 Slate
  borderGray: 'FFE2E8F0',     // 200 Slate
  borderDark: 'FF94A3B8',     // 400 Slate
  white: 'FFFFFFFF',
  
  // Level Badge Colors
  level1Bg: 'FFFEF3C7', level1Text: 'FF92400E', // Amber
  level2Bg: 'FFDBEAFE', level2Text: 'FF1E40AF', // Blue
  level3Bg: 'FFF3E8FF', level3Text: 'FF6B21A8', // Purple
  level4Bg: 'FFD1FAE5', level4Text: 'FF065F46', // Emerald
  adminBg: 'FFF1F5F9', adminText: 'FF475569',   // Slate

  // Shift Colors
  shiftHC: 'FFDBEAFE',  // Hành chính - Xanh da trời
  shiftC1: 'FFFEF3C7',  // Ca 1 - Vàng nhạt
  shiftC2: 'FFE0E7FF',  // Ca 2 - Indigo nhạt
  shiftC3: 'FFF3E8FF',  // Ca 3 - Tím nhạt
  shiftOFF: 'FFF1F5F9', // Nghỉ - Xám nhạt
};

const BORDER_THIN = {
  top: { style: 'thin', color: { argb: COLORS.borderGray } },
  left: { style: 'thin', color: { argb: COLORS.borderGray } },
  bottom: { style: 'thin', color: { argb: COLORS.borderGray } },
  right: { style: 'thin', color: { argb: COLORS.borderGray } },
};

const BORDER_HEADER = {
  top: { style: 'thin', color: { argb: COLORS.borderDark } },
  left: { style: 'thin', color: { argb: COLORS.borderDark } },
  bottom: { style: 'medium', color: { argb: COLORS.navyHeader } },
  right: { style: 'thin', color: { argb: COLORS.borderDark } },
};

// ==========================================
// SHEET 1: TỔNG QUAN & MA TRẬN THẨM QUYỀN
// ==========================================
const ws1 = workbook.addWorksheet('Tổng Quan & Ma Trận', { views: [{ showGridLines: true }] });

ws1.columns = [
  { width: 5 },   // A
  { width: 32 },  // B: Nghiệp vụ
  { width: 22 },  // C: Cấp 1
  { width: 22 },  // D: Cấp 2
  { width: 25 },  // E: Cấp 3
  { width: 22 },  // F: Cấp 4
  { width: 20 },  // G: Quản trị viên
];

// Title & Meta
ws1.mergeCells('B2:G2');
ws1.getCell('B2').value = 'BÁO CÁO CƠ CẤU PHÂN QUYỀN & THẨM QUYỀN VẬN HÀNH';
ws1.getCell('B2').font = { name: 'Arial', size: 16, bold: true, color: { argb: COLORS.navyHeader } };
ws1.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
ws1.getRow(2).height = 32;

ws1.mergeCells('B3:G3');
ws1.getCell('B3').value = 'BỘ PHẬN RM - QUẢN LÝ BẢO TRÌ & SỬA CHỮA THIẾT BỊ';
ws1.getCell('B3').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF475569' } };
ws1.getCell('B3').alignment = { vertical: 'middle', horizontal: 'center' };
ws1.getRow(3).height = 20;

ws1.mergeCells('B4:G4');
ws1.getCell('B4').value = 'Thời điểm xuất báo cáo: 07/11/2026 • Người lập: Nguyễn Thị Thảo Nguyên (Cấp 2 - Điều Phối) • Người duyệt: BQL RM';
ws1.getCell('B4').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
ws1.getCell('B4').alignment = { vertical: 'middle', horizontal: 'center' };
ws1.getRow(4).height = 20;

// Header Row (Row 6)
const matrixHeaders = [
  '',
  'Nghiệp Vụ / Quyền Hạn',
  'Cấp 1: Ban Quản Lý\n(Trưởng phòng/PGĐ)',
  'Cấp 2: Điều Phối\n(Thư ký/Điều hành)',
  'Cấp 3: Giám Sát\n(Tổ Trưởng Hiện Trường)',
  'Cấp 4: Nhân Viên\n(Kỹ Thuật Viên)',
  'Quản Trị Viên\n(Kỹ Thuật Hệ Thống)',
];
const hRow = ws1.getRow(6);
hRow.values = matrixHeaders;
hRow.height = 36;

for (let col = 2; col <= 7; col++) {
  const cell = hRow.getCell(col);
  cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = BORDER_HEADER;
}

const matrixData = [
  ['Giao Dự Án / Kế Hoạch Dài Hạn', 'Toàn quyền giao mọi cấp', 'Không có quyền', 'Không có quyền', 'Không có quyền', 'Không can thiệp nghiệp vụ'],
  ['Giao Việc Hằng Ngày', 'Toàn quyền giao mọi cấp', 'Giao cho Cấp 3 và Cấp 4', 'Giao cho Cấp 3 và Cấp 4', 'Không có quyền', 'Không can thiệp nghiệp vụ'],
  ['Tạo Việc Mật Ban Quản Lý (Private)', 'Toàn quyền (Chỉ C1 thấy)', 'Không thấy / Không tạo', 'Không thấy / Không tạo', 'Không thấy / Không tạo', 'Không thấy'],
  ['Phạm Vi Xem Công Việc', 'Xem toàn bộ hệ thống', 'Xem toàn bộ hệ thống', 'Thấy việc của mình, của Tổ & việc ngày C4', 'CHỈ THẤY VIỆC GIAO CHO MÌNH', 'Chỉ xem phục vụ kỹ thuật'],
  ['Phê Duyệt Nghiệm Thu Báo Cáo', 'Toàn quyền duyệt toàn bộ', 'Duyệt việc ngày & việc mình giao', 'Chỉ duyệt việc mình giao (Cấm duyệt chéo)', 'Không có quyền duyệt', 'Không tham gia duyệt việc'],
  ['Quy Tắc Tự Duyệt Việc Của Mình', 'CẤM TUYỆT ĐỐI', 'CẤM TUYỆT ĐỐI', 'CẤM TUYỆT ĐỐI', 'CẤM TUYỆT ĐỐI', 'Không áp dụng'],
  ['Lên Lịch & Sắp Xếp Ca Làm Việc', 'Kiểm tra & Phê duyệt', 'ĐỘC QUYỀN LÊN LỊCH', 'Chỉ xem lịch làm việc', 'Chỉ xem lịch làm việc', 'Sao lưu kỹ thuật'],
  ['Xuất Báo Cáo Excel Nghiệp Vụ', 'Duyệt trực tiếp trên app', 'ĐỘC QUYỀN XUẤT EXCEL', 'Không có chức năng', 'Không có chức năng', 'Không có chức năng'],
  ['Kênh Nhắn Tin Kỹ Thuật (Chat)', 'Xem & Giám sát tất cả các tổ', 'Xem & Điều phối các tổ', 'CHỈ THẤY NỘI BỘ TỔ CỦA MÌNH', 'CHỈ THẤY NỘI BỘ TỔ CỦA MÌNH', 'Không tham gia'],
  ['Quản Lý Nhân Sự & Phân Quyền', 'Toàn quyền quản lý', 'Không có quyền', 'Không có quyền', 'Không có quyền', 'Toàn quyền cấu hình user'],
];

matrixData.forEach((row, idx) => {
  const rowNum = 7 + idx;
  const r = ws1.getRow(rowNum);
  r.values = ['', ...row];
  r.height = 28;

  for (let col = 2; col <= 7; col++) {
    const cell = r.getCell(col);
    cell.font = { name: 'Arial', size: 9 };
    cell.border = BORDER_THIN;
    cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'left' : 'center', wrapText: true };

    if (idx % 2 === 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.softGrayBg } };
    }

    // Highlight key values
    const text = String(cell.value);
    if (text.includes('Toàn quyền') || text.includes('ĐỘC QUYỀN')) {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF15803D' } }; // Dark green
    } else if (text.includes('CẤM TUYỆT ĐỐI') || text.includes('Không có quyền') || text.includes('Không thấy')) {
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF64748B' } };
    } else if (text.includes('CHỈ THẤY')) {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB45309' } }; // Amber
    }
  }
});

// Summary block below matrix
const summaryStart = 18;
ws1.mergeCells(`B${summaryStart}:G${summaryStart}`);
ws1.getCell(`B${summaryStart}`).value = 'CÁC NGUYÊN TẮC BẢO MẬT & ĐIỀU HÀNH BẮT BUỘC TRÊN HỆ THỐNG:';
ws1.getCell(`B${summaryStart}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.navyHeader } };
ws1.getRow(summaryStart).height = 24;

const principles = [
  '1. Nguyên tắc Không Tự Duyệt: Bất kỳ ai (kể cả Ban Quản Lý Cấp 1) khi được giao thực hiện một công việc thì BẮT BUỘC phải do cấp trên hoặc đồng cấp khác nghiệm thu.',
  '2. Nguyên tắc Chặn Duyệt Chéo Cấp 3: Giám sát nào giao việc thì Giám sát đó duyệt. Giám sát khác cùng Cấp 3 không có quyền duyệt thay (trừ khi có chỉ định phối hợp).',
  '3. Nguyên tắc Cách Ly Kênh Tổ: Nhân viên tổ nào chỉ thấy và chỉ nhắn tin trong nội bộ tổ đó. Chỉ có Cấp 1 & Cấp 2 mới có quyền xem các tổ để điều phối.',
  '4. Nguyên tắc Công Việc Mật BQL: Khi bật chế độ "Chỉ Ban Quản Lý", công việc chỉ hiển thị trên máy của Anh Xa và Anh Vũ, hoàn toàn ẩn với các cấp khác.',
  '5. Nguyên tắc Điều Phối Ca & Xuất File: Chị Thảo Nguyên (Cấp 2) là đầu mối độc quyền xếp lịch trực và trích xuất báo cáo Excel gửi Ban Giám Đốc/Nhân Sự.',
];

principles.forEach((p, idx) => {
  const rNum = summaryStart + 1 + idx;
  ws1.mergeCells(`B${rNum}:G${rNum}`);
  const c = ws1.getCell(`B${rNum}`);
  c.value = p;
  c.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF334155' } };
  c.alignment = { vertical: 'middle', horizontal: 'left' };
  ws1.getRow(rNum).height = 20;
});


// ==========================================
// SHEET 2: DANH SÁCH NHÂN SỰ 4 CẤP (19 NGƯỜI)
// ==========================================
const ws2 = workbook.addWorksheet('Danh Sách Nhân Sự 4 Cấp', { views: [{ showGridLines: true }] });

ws2.columns = [
  { width: 4 },   // A
  { width: 8 },   // B: STT
  { width: 12 },  // C: Mã NV
  { width: 28 },  // D: Họ và Tên
  { width: 22 },  // E: Cấp Bậc
  { width: 22 },  // F: Chức Vụ Hệ Thống
  { width: 22 },  // G: Tổ / Đội Trực Thuộc
  { width: 16 },  // H: Số Điện Thoại
  { width: 16 },  // I: Giao Dự Án
  { width: 16 },  // J: Giao Việc Ngày
  { width: 16 },  // K: Duyệt Báo Cáo
  { width: 16 },  // L: Xếp Lịch Ca
];

// Title
ws2.mergeCells('B2:L2');
ws2.getCell('B2').value = 'DANH SÁCH 19 NHÂN SỰ & PHÂN CẤP THẨM QUYỀN HỆ THỐNG RM';
ws2.getCell('B2').font = { name: 'Arial', size: 15, bold: true, color: { argb: COLORS.navyHeader } };
ws2.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
ws2.getRow(2).height = 30;

ws2.mergeCells('B3:L3');
ws2.getCell('B3').value = 'Cập nhật theo dữ liệu chính thức Backup 2026-11-07 • Đồng bộ Supabase Cloud Realtime';
ws2.getCell('B3').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };
ws2.getCell('B3').alignment = { vertical: 'middle', horizontal: 'center' };
ws2.getRow(3).height = 18;

// Headers (Row 5)
const staffHeaders = [
  '',
  'STT',
  'Mã NV',
  'Họ Và Tên',
  'Cấp Bậc Nhân Sự',
  'Chức Vụ Hệ Thống',
  'Tổ / Đội Trực Thuộc',
  'Số Điện Thoại',
  'Giao Dự Án',
  'Giao Việc Ngày',
  'Duyệt Báo Cáo',
  'Xếp Lịch Ca',
];
const sRow = ws2.getRow(5);
sRow.values = staffHeaders;
sRow.height = 30;

for (let col = 2; col <= 12; col++) {
  const cell = sRow.getCell(col);
  cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLORS.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = BORDER_HEADER;
}

// Sort users by hierarchy
const getRank = (u) => {
  if (u.role === 'ADMIN') return 0;
  if (u.level === 'LEVEL_1_MANAGER') return 1;
  if (u.level === 'LEVEL_2_SECRETARY') return 2;
  if (u.level === 'LEVEL_3_LEAD') return 3;
  return 4;
};

const sortedUsers = [...rawData.users].sort((a, b) => getRank(a) - getRank(b));

sortedUsers.forEach((u, idx) => {
  const rowNum = 6 + idx;
  const r = ws2.getRow(rowNum);

  // Find team
  const userTeam = rawData.teams.find((t) => t.memberIds.includes(u.id));
  const teamName = userTeam ? userTeam.name : (u.level === 'LEVEL_1_MANAGER' ? 'Ban Quản Lý' : u.level === 'LEVEL_2_SECRETARY' ? 'Bộ Phận Điều Phối' : 'Ban Quản Trị');

  // Format Level Title
  let levelTitle = '';
  let roleTitle = '';
  let badgeBg = COLORS.white;
  let badgeText = 'FF000000';

  if (u.role === 'ADMIN') {
    levelTitle = 'Quản Trị Viên';
    roleTitle = 'Vận Hành Kỹ Thuật';
    badgeBg = COLORS.adminBg; badgeText = COLORS.adminText;
  } else if (u.level === 'LEVEL_1_MANAGER') {
    levelTitle = 'Cấp 1: Ban Quản Lý';
    roleTitle = u.name.includes('Hoàng Vũ') ? 'Trưởng Phòng RM' : 'Phó Giám Đốc / Quản Lý';
    badgeBg = COLORS.level1Bg; badgeText = COLORS.level1Text;
  } else if (u.level === 'LEVEL_2_SECRETARY') {
    levelTitle = 'Cấp 2: Điều Phối';
    roleTitle = 'Nhân Viên Điều Phối';
    badgeBg = COLORS.level2Bg; badgeText = COLORS.level2Text;
  } else if (u.level === 'LEVEL_3_LEAD') {
    levelTitle = 'Cấp 3: Giám Sát';
    roleTitle = 'Tổ Trưởng / Giám Sát Hiện Trường';
    badgeBg = COLORS.level3Bg; badgeText = COLORS.level3Text;
  } else {
    levelTitle = 'Cấp 4: Nhân Viên';
    roleTitle = 'Kỹ Thuật Viên Vận Hành';
    badgeBg = COLORS.level4Bg; badgeText = COLORS.level4Text;
  }

  const canAssignProject = u.level === 'LEVEL_1_MANAGER' ? ' Có quyền' : '—';
  const canAssignDaily = (u.level === 'LEVEL_1_MANAGER' || u.level === 'LEVEL_2_SECRETARY' || u.level === 'LEVEL_3_LEAD') ? ' Có quyền' : '—';
  const canReview = u.level === 'LEVEL_1_MANAGER' ? ' Toàn quyền' : u.level === 'LEVEL_2_SECRETARY' ? ' Việc Ngày/Giao' : u.level === 'LEVEL_3_LEAD' ? ' Việc Tổ Giao' : '—';
  const canSchedule = u.level === 'LEVEL_2_SECRETARY' ? ' Độc quyền' : u.level === 'LEVEL_1_MANAGER' ? ' Phê duyệt' : '—';

  r.values = [
    '',
    idx + 1,
    u.employeeId || 'ADMIN',
    u.name,
    levelTitle,
    roleTitle,
    teamName,
    u.phone || '—',
    canAssignProject,
    canAssignDaily,
    canReview,
    canSchedule,
  ];
  r.height = 26;

  for (let col = 2; col <= 12; col++) {
    const cell = r.getCell(col);
    cell.font = { name: 'Arial', size: 9 };
    cell.border = BORDER_THIN;
    cell.alignment = { vertical: 'middle', horizontal: col === 4 || col === 7 ? 'left' : 'center' };

    // Format level column with badge color
    if (col === 5) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: badgeBg } };
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: badgeText } };
    }
  }
});


// ==========================================
// SHEET 3: CƠ CẤU 3 TỔ ĐỘI & THÀNH VIÊN
// ==========================================
const ws3 = workbook.addWorksheet('Cơ Cấu 3 Tổ Đội', { views: [{ showGridLines: true }] });

ws3.columns = [
  { width: 4 },   // A
  { width: 8 },   // B: STT
  { width: 14 },  // C: Mã NV
  { width: 28 },  // D: Họ và Tên
  { width: 20 },  // E: Cấp Bậc
  { width: 24 },  // F: Vai Trò Trong Tổ
  { width: 18 },  // G: Số Điện Thoại
  { width: 38 },  // H: Trách Nhiệm Chính
];

ws3.mergeCells('B2:H2');
ws3.getCell('B2').value = 'CƠ CẤU 3 TỔ ĐỘI CHUYÊN TRÁCH BỘ PHẬN RM';
ws3.getCell('B2').font = { name: 'Arial', size: 15, bold: true, color: { argb: COLORS.navyHeader } };
ws3.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
ws3.getRow(2).height = 30;

let teamRowCursor = 4;

rawData.teams.forEach((team) => {
  // Team Section Header
  ws3.mergeCells(`B${teamRowCursor}:H${teamRowCursor}`);
  const tHeader = ws3.getCell(`B${teamRowCursor}`);
  tHeader.value = `${team.name.toUpperCase()} (${team.memberIds.length} THÀNH VIÊN) — ${team.description || ''}`;
  tHeader.font = { name: 'Arial', size: 11, bold: true, color: { argb: COLORS.white } };
  tHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blueSubHeader } };
  tHeader.alignment = { vertical: 'middle', horizontal: 'left' };
  ws3.getRow(teamRowCursor).height = 28;
  teamRowCursor++;

  // Sub Header
  const subHeaders = ['', 'STT', 'Mã NV', 'Họ Và Tên', 'Cấp Bậc', 'Vai Trò Trong Tổ', 'Số Điện Thoại', 'Trách Nhiệm Chính'];
  const subHRow = ws3.getRow(teamRowCursor);
  subHRow.values = subHeaders;
  subHRow.height = 24;

  for (let c = 2; c <= 8; c++) {
    const cell = subHRow.getCell(c);
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E293B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlueBg } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = BORDER_THIN;
  }
  teamRowCursor++;

  // Members
  const members = team.memberIds.map((mid) => rawData.users.find((u) => u.id === mid)).filter(Boolean);
  // Sort leads first, then staff
  members.sort((a, b) => (a.level === 'LEVEL_3_LEAD' ? -1 : 1));

  members.forEach((m, mIdx) => {
    const mRow = ws3.getRow(teamRowCursor);
    const isLead = m.level === 'LEVEL_3_LEAD';
    const roleInTeam = isLead ? 'Giám Sát / Tổ Trưởng' : 'Kỹ Thuật Viên';
    const responsibility = isLead
      ? 'Chỉ đạo thi công hiện trường, phân công việc ngày, kiểm tra chất lượng'
      : 'Thực hiện sửa chữa, bảo trì thiết bị và nộp báo cáo kết quả kèm ảnh';

    mRow.values = [
      '',
      mIdx + 1,
      m.employeeId,
      m.name,
      isLead ? 'Cấp 3: Giám Sát' : 'Cấp 4: Nhân Viên',
      roleInTeam,
      m.phone || '—',
      responsibility,
    ];
    mRow.height = 24;

    for (let c = 2; c <= 8; c++) {
      const cell = mRow.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.border = BORDER_THIN;
      cell.alignment = { vertical: 'middle', horizontal: c === 4 || c === 8 ? 'left' : 'center' };

      if (isLead && c === 6) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.level3Text } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.level3Bg } };
      }
    }
    teamRowCursor++;
  });

  teamRowCursor += 2; // Spacing between teams
});


// ==========================================
// SHEET 4: BẢNG PHÂN CÔNG LỊCH TRỰC CA (TUẦN)
// ==========================================
const ws4 = workbook.addWorksheet('Bảng Phân Công Lịch Ca', { views: [{ showGridLines: true }] });

// Generate current week dates (from Monday 2026-11-02 to Sunday 2026-11-08)
const weekMonday = new Date('2026-11-02T00:00:00+07:00');
const weekDays = [];
const dayNamesVi = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
for (let i = 0; i < 7; i++) {
  const d = new Date(weekMonday);
  d.setDate(weekMonday.getDate() + i);
  const dateStr = d.toISOString().split('T')[0];
  const dateFmt = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  weekDays.push({ dateStr, label: `${dayNamesVi[i]}\n(${dateFmt})` });
}

ws4.columns = [
  { width: 4 },   // A
  { width: 6 },   // B: STT
  { width: 10 },  // C: Mã NV
  { width: 26 },  // D: Họ và Tên
  { width: 22 },  // E: Cấp Bậc / Tổ
  { width: 18 },  // F: Thứ Hai
  { width: 18 },  // G: Thứ Ba
  { width: 18 },  // H: Thứ Tư
  { width: 18 },  // I: Thứ Năm
  { width: 18 },  // J: Thứ Sáu
  { width: 18 },  // K: Thứ Bảy
  { width: 18 },  // L: Chủ Nhật
];

ws4.mergeCells('B2:L2');
ws4.getCell('B2').value = 'BẢNG PHÂN CÔNG LỊCH LÀM VIỆC & TRỰC CA TUẦN BỘ PHẬN RM';
ws4.getCell('B2').font = { name: 'Arial', size: 15, bold: true, color: { argb: COLORS.navyHeader } };
ws4.getCell('B2').alignment = { vertical: 'middle', horizontal: 'center' };
ws4.getRow(2).height = 28;

ws4.mergeCells('B3:L3');
ws4.getCell('B3').value = 'Tuần từ 02/11/2026 đến 08/11/2026 • Áp dụng đầy đủ 18 nhân sự từ Cấp 1 đến Cấp 4';
ws4.getCell('B3').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
ws4.getCell('B3').alignment = { vertical: 'middle', horizontal: 'center' };
ws4.getRow(3).height = 20;

// Shift Legend
ws4.mergeCells('B4:L4');
ws4.getCell('B4').value = 'Quy chuẩn ca: [Hành Chính: 7h30-16h00]  •  [Ca 1: 06h00-14h00]  •  [Ca 2: 14h00-22h00]  •  [Ca 3: 22h00-06h00 (Trực đêm)]  •  [Nghỉ Ca]';
ws4.getCell('B4').font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1E40AF' } };
ws4.getCell('B4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.lightBlueBg } };
ws4.getCell('B4').alignment = { vertical: 'middle', horizontal: 'center' };
ws4.getRow(4).height = 22;

const schedHeaders = ['', 'STT', 'Mã NV', 'Họ Và Tên', 'Cấp Bậc & Đơn Vị', ...weekDays.map((d) => d.label)];
const schedHRow = ws4.getRow(6);
schedHRow.values = schedHeaders;
schedHRow.height = 34;

for (let c = 2; c <= 12; c++) {
  const cell = schedHRow.getCell(c);
  cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: COLORS.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.navyHeader } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = BORDER_HEADER;
}

const activeStaff = sortedUsers.filter((u) => u.role !== 'ADMIN');

activeStaff.forEach((user, idx) => {
  const rowNum = 7 + idx;
  const r = ws4.getRow(rowNum);
  const uTeam = rawData.teams.find((t) => t.memberIds.includes(user.id));
  const orgDesc = uTeam ? uTeam.name : (user.level === 'LEVEL_1_MANAGER' ? 'Ban Quản Lý' : 'Bộ Phận Điều Phối');

  const rowValues = [
    '',
    idx + 1,
    user.employeeId,
    user.name,
    orgDesc,
  ];

  weekDays.forEach((wd) => {
    const shift = rawData.shifts.find((s) => s.userId === user.id && s.date === wd.dateStr);
    if (!shift) {
      rowValues.push('Nghỉ Ca');
    } else {
      let shiftLabel = 'Nghỉ Ca';
      if (shift.shiftId === 'HANH_CHINH') shiftLabel = 'Hành Chính\n(7h30-16h)';
      else if (shift.shiftId === 'CA_1') shiftLabel = 'Ca 1\n(6h-14h)';
      else if (shift.shiftId === 'CA_2') shiftLabel = 'Ca 2\n(14h-22h)';
      else if (shift.shiftId === 'CA_3') shiftLabel = 'Ca 3\n(22h-6h)';
      rowValues.push(shiftLabel);
    }
  });

  r.values = rowValues;
  r.height = 30;

  for (let c = 2; c <= 12; c++) {
    const cell = r.getCell(c);
    cell.font = { name: 'Arial', size: 9 };
    cell.border = BORDER_THIN;
    cell.alignment = { vertical: 'middle', horizontal: c <= 5 ? 'left' : 'center', wrapText: true };
    if (c === 2 || c === 3) cell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Color shift cells
    if (c >= 6) {
      const val = String(cell.value);
      if (val.includes('Hành Chính')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.shiftHC } };
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF1E40AF' } };
      } else if (val.includes('Ca 1')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.shiftC1 } };
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF92400E' } };
      } else if (val.includes('Ca 2')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.shiftC2 } };
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF3730A3' } };
      } else if (val.includes('Ca 3')) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.shiftC3 } };
        cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FF6B21A8' } };
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.shiftOFF } };
        cell.font = { name: 'Arial', size: 8.5, color: { argb: 'FF94A3B8' } };
      }
    }
  }
});

// Output file paths
const REPORTS_DIR = path.resolve('public/reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

const fileName = 'Bao_Cao_Phan_Quyen_Va_Nhan_Su_Bo_Phan_RM_2026-11-07.xlsx';
const targetPath = path.join(REPORTS_DIR, fileName);

await workbook.xlsx.writeFile(targetPath);
console.log(`[SUCCESS] Excel Report generated at: ${targetPath}`);
