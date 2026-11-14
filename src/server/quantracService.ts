/**
 * Service cào dữ liệu và tính toán sản lượng khai thác nước giếng khoan 24h
 * Nguồn: http://songbegolf.dulieuquantrac.com
 */

export interface WellDataResult {
  wellId: number;
  wellName: string;
  startTong: number | null;
  endTong: number | null;
  volume: number;
  mucNuocLatest?: number | null;
}

export interface WellScheduleConfigItem {
  wellId: number;
  wellName: string;
  enabled: boolean;
  dinhMuc: number; // m³ định mức trong ngày
  luuLuongPerHour: number; // m³/h lưu lượng bơm trung bình
  delayMinutes: number; // phút độ trễ cộng thêm (ẩn trên thông báo)
}

export interface WellScheduleCalculationResult {
  wellId: number;
  wellName: string;
  enabled: boolean;
  startTong: number | null;
  endTong: number | null;
  daKhaiThac: number;
  dinhMuc: number;
  conLai: number;
  luuLuongPerHour: number;
  delayMinutes: number;
  soGioCanBom: number; // đơn vị giờ
  thoiGianMoLyThuyet: string; // "HH:mm:ss"
  thoiGianMoThucTe: string; // "HH:mm:ss" (đã cộng delay)
  displayTime: string; // "HH:mm" hoặc "Mở ngay" hoặc "Đã đạt định mức"
  status: 'SCHEDULED' | 'RUN_NOW' | 'QUOTA_REACHED' | 'NO_DATA';
}

export interface DailyWellScheduleSummary {
  dateStr: string;
  cutOffTimeStr: string;
  wells: WellScheduleCalculationResult[];
  generatedAt: string;
}

export const DEFAULT_WELL_SCHEDULE_CONFIGS: WellScheduleConfigItem[] = [
  { wellId: 1, wellName: 'Giếng G1', enabled: true, dinhMuc: 450, luuLuongPerHour: 72, delayMinutes: 0 },
  { wellId: 2, wellName: 'Giếng G2', enabled: true, dinhMuc: 480, luuLuongPerHour: 85, delayMinutes: 0 },
  { wellId: 3, wellName: 'Giếng G3', enabled: true, dinhMuc: 480, luuLuongPerHour: 66, delayMinutes: 0 },
  { wellId: 4, wellName: 'Giếng G4', enabled: true, dinhMuc: 480, luuLuongPerHour: 13, delayMinutes: 0 },
  { wellId: 5, wellName: 'Giếng G5', enabled: true, dinhMuc: 650, luuLuongPerHour: 79, delayMinutes: 0 },
  { wellId: 6, wellName: 'Giếng G6', enabled: false, dinhMuc: 480, luuLuongPerHour: 50, delayMinutes: 0 },
];

export interface DailyWellReportSummary {
  dateStr: string;
  startTimeStr: string;
  endTimeStr: string;
  wells: WellDataResult[];
  totalVolume: number;
  generatedAt: string;
}

export class QuantracService {
  private static BASE_URL = 'http://songbegolf.dulieuquantrac.com';
  private static EMAIL = 'songbegolf@dulieuquantrac.com';
  private static PASSWORD = '123456789';

  /**
   * Đăng nhập và lấy cookie session
   */
  private static async login(): Promise<string> {
    const loginPageResp = await fetch(`${this.BASE_URL}/statistic`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      cache: 'no-store',
    });

    const cookieHeader = loginPageResp.headers.get('set-cookie');
    const cookie = cookieHeader ? cookieHeader.split(';')[0] : '';
    const html = await loginPageResp.text();

    const tokenMatch = html.match(/name="is_dtool_form"\s+value="([^"]+)"/);
    if (!tokenMatch) {
      throw new Error('Không tìm thấy token CSRF trên trang đăng nhập quan trắc.');
    }
    const token = tokenMatch[1];

    const payload = new URLSearchParams({
      'fields[login_email]': this.EMAIL,
      'fields[login_password]': this.PASSWORD,
      filelogin: '1',
      link2back: `${this.BASE_URL}/quan-ly/msg-flogin`,
      linkcomback: this.BASE_URL,
      linkacclock: `${this.BASE_URL}/quan-ly/msg-acclock`,
      forcelinkcomback: `${this.BASE_URL}/`,
      is_dtool_form: token,
    });

    const loginResp = await fetch(`${this.BASE_URL}/eadmin/selogin/ispc-1/dang-nhap.html`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
        Referer: `${this.BASE_URL}/statistic`,
      },
      body: payload.toString(),
      redirect: 'manual',
    });

    const newCookie = loginResp.headers.get('set-cookie')?.split(';')[0];
    return newCookie || cookie;
  }

  /**
   * Truy vấn số liệu ngày và tính toán sản lượng 24h
   * Chu kỳ 24h hoàn chỉnh: Từ 00:00 ngày targetDate đến 00:00 ngày tiếp theo (targetDate + 1)
   * @param dateStr Định dạng YYYY-MM-DD (mặc định là ngày hôm qua để lấy trọn vẹn 24h)
   */
  public static async get24hWellData(dateStr?: string): Promise<DailyWellReportSummary> {
    // Mặc định lấy ngày hôm qua theo giờ Việt Nam để chốt trọn vẹn 24h (từ 0h hôm qua đến 0h hôm nay)
    let targetDate = dateStr;
    if (!targetDate) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
      targetDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(yesterday);
    }

    // Tính ngày tiếp theo (targetDate + 1) để lấy mốc chốt 00:00 của đêm tiếp theo
    const [y, m, d] = targetDate.split('-').map(Number);
    const tDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const nextDate = new Date(tDate.getTime() + 24 * 3600 * 1000);
    const nextYear = nextDate.getUTCFullYear();
    const nextMonth = String(nextDate.getUTCMonth() + 1).padStart(2, '0');
    const nextDay = String(nextDate.getUTCDate()).padStart(2, '0');
    const nextDateStr = `${nextYear}-${nextMonth}-${nextDay}`;

    const cookie = await this.login();

    const qPayload = new URLSearchParams();
    qPayload.append('chonthoigian', '120');
    qPayload.append('date_start', targetDate);
    qPayload.append('date_end', nextDateStr);
    qPayload.append('view_data', '1');
    for (const g of ['golf-g1-', 'golf-g2-', 'golf-g3-', 'golf-g4-', 'golf-g5-', 'golf-g6-']) {
      for (const p of ['LUULUONG', 'TONGLUULUONG', 'MUCNUOC']) {
        qPayload.append(g + '[]', p);
      }
    }
    for (const s of ['0', '1', '2']) {
      qPayload.append('dn-status[]', s);
    }

    const statResp = await fetch(`${this.BASE_URL}/statistic`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
        Referer: `${this.BASE_URL}/statistic`,
      },
      body: qPayload.toString(),
      cache: 'no-store',
    });

    const html = await statResp.text();
    const tableMatch = html.match(/<table class="tblThongke[^"]*"[\s\S]*?<\/table>/);
    if (!tableMatch) {
      throw new Error('Không tìm thấy bảng dữ liệu quan trắc cho ngày ' + targetDate);
    }

    const rows = tableMatch[0].match(/<tr[\s\S]*?<\/tr>/g) || [];
    const records: { timeStr: string; wells: Record<number, { luu_luong: number | null; tong_luu_luong: number | null; muc_nuoc: number | null }> }[] = [];

    for (const r of rows.slice(1)) {
      const cells = (r.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g) || []).map((c) =>
        c.replace(/<[^>]+>/g, '').trim().replace(/&nbsp;/g, '')
      );
      if (cells.length < 25) continue;

      const timeStr = cells[0];
      const wells: Record<number, { luu_luong: number | null; tong_luu_luong: number | null; muc_nuoc: number | null }> = {};

      for (let w = 1; w <= 6; w++) {
        const idx = 1 + (w - 1) * 4;
        const parseVal = (v: string) => {
          if (!v || v === '-') return null;
          const n = parseFloat(v.replace(/,/g, ''));
          return isNaN(n) ? null : n;
        };

        wells[w] = {
          luu_luong: parseVal(cells[idx]),
          tong_luu_luong: parseVal(cells[idx + 1]),
          muc_nuoc: parseVal(cells[idx + 2]),
        };
      }
      records.push({ timeStr, wells });
    }

    if (records.length === 0) {
      throw new Error(`Ngày ${targetDate} chưa có bản ghi dữ liệu quan trắc nào.`);
    }

    // Bản ghi bắt đầu: Bản ghi đầu tiên của ngày targetDate (thường là 00:00 của ngày targetDate)
    const first = records[0];

    // Bản ghi kết thúc: Đúng mốc 00:00 của ngày tiếp theo (chu kỳ trọn vẹn 24h)
    const nextDayMidnightPrefix = `${nextDay}/${nextMonth}/${nextYear} 00:00`;
    let last = records.find((r) => r.timeStr.startsWith(nextDayMidnightPrefix));

    if (!last) {
      // Nếu không có mốc đúng 00:00, tìm bản ghi đầu tiên của ngày tiếp theo
      const nextDayPrefix = `${nextDay}/${nextMonth}/${nextYear}`;
      last = records.find((r) => r.timeStr.startsWith(nextDayPrefix));
    }

    if (!last) {
      // Nếu ngày tiếp theo chưa có bản ghi nào, lấy bản ghi cuối cùng của targetDate
      last = records[records.length - 1];
    }

    let grandTotal = 0;
    const wellsResult: WellDataResult[] = [];

    for (let w = 1; w <= 6; w++) {
      const startVal = first.wells[w]?.tong_luu_luong ?? null;
      const endVal = last.wells[w]?.tong_luu_luong ?? null;
      const mucNuoc = last.wells[w]?.muc_nuoc ?? null;

      let vol = 0;
      if (startVal !== null && endVal !== null && endVal >= startVal) {
        vol = Math.round((endVal - startVal) * 100) / 100;
      }
      grandTotal += vol;

      wellsResult.push({
        wellId: w,
        wellName: `Giếng G${w}`,
        startTong: startVal,
        endTong: endVal,
        volume: vol,
        mucNuocLatest: mucNuoc,
      });
    }

    return {
      dateStr: targetDate,
      startTimeStr: first.timeStr,
      endTimeStr: last.timeStr,
      wells: wellsResult,
      totalVolume: Math.round(grandTotal * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Định dạng tin nhắn gửi qua Zalo
   */
  public static formatZaloMessage(
    report: DailyWellReportSummary,
    wellConfigs?: WellScheduleConfigItem[]
  ): string {
    const [y, m, d] = report.dateStr.split('-');
    const displayDate = `${d}/${m}/${y}`;

    const now = new Date();
    const updateTimeStr = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);

    const defaultDinhMucMap: Record<number, number> = {
      1: 450,
      2: 480,
      3: 480,
      4: 480,
      5: 650,
      6: 480,
    };

    const configs = wellConfigs && wellConfigs.length > 0 ? wellConfigs : DEFAULT_WELL_SCHEDULE_CONFIGS;
    const quotaMap: Record<number, number> = { ...defaultDinhMucMap };
    for (const conf of configs) {
      if (conf.wellId && conf.dinhMuc) {
        quotaMap[conf.wellId] = conf.dinhMuc;
      }
    }

    const wellLines = report.wells
      .map((w) => {
        const dinhMuc = quotaMap[w.wellId] || 480;
        return `🔹 ${w.wellName}: ${w.volume.toLocaleString('vi-VN')} m³ / Định mức: ${dinhMuc.toLocaleString('vi-VN')} m³`;
      })
      .join('\n');

    const startParts = report.startTimeStr.split(' ');
    const endParts = report.endTimeStr.split(' ');
    const startClock = startParts[1] || '00:00';
    const startDate = startParts[0] || displayDate;
    const endClock = endParts[1] || '00:00';
    const endDate = endParts[0] || displayDate;

    const timeRangeText =
      startDate === endDate
        ? `Từ ${startClock} đến ${endClock}`
        : `Từ ${startClock} ngày ${startDate.slice(0, 5)} đến ${endClock} ngày ${endDate.slice(0, 5)}`;

    return `💧 [BỘ PHẬN RM] BÁO CÁO KHAI THÁC NƯỚC GIẾNG (24H)
━━━━━━━━━━━━━━━━━━━━
📅 Ngày: ${displayDate} (${timeRangeText})

${wellLines}
━━━━━━━━━━━━━━━━━━━━
📊 TỔNG KHAI THÁC: ${report.totalVolume.toLocaleString('vi-VN')} m³
⏱️ Cập nhật: ${updateTimeStr}`;
  }

  /**
   * Tính toán lịch mở giếng tự động dựa trên bảng tính và số liệu cào trực tiếp
   */
  public static async calculateWellSchedule(
    wellConfigs?: WellScheduleConfigItem[],
    dateStr?: string
  ): Promise<DailyWellScheduleSummary> {
    const configs = wellConfigs && wellConfigs.length > 0 ? wellConfigs : DEFAULT_WELL_SCHEDULE_CONFIGS;
    const targetDate = dateStr || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

    const cookie = await this.login();

    const qPayload = new URLSearchParams();
    qPayload.append('chonthoigian', '120');
    qPayload.append('date_start', targetDate);
    qPayload.append('date_end', targetDate);
    qPayload.append('view_data', '1');
    for (const g of ['golf-g1-', 'golf-g2-', 'golf-g3-', 'golf-g4-', 'golf-g5-', 'golf-g6-']) {
      for (const p of ['LUULUONG', 'TONGLUULUONG', 'MUCNUOC']) {
        qPayload.append(g + '[]', p);
      }
    }
    for (const s of ['0', '1', '2']) {
      qPayload.append('dn-status[]', s);
    }

    const statResp = await fetch(`${this.BASE_URL}/statistic`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
        Referer: `${this.BASE_URL}/statistic`,
      },
      body: qPayload.toString(),
      cache: 'no-store',
    });

    const html = await statResp.text();
    const tableMatch = html.match(/<table class="tblThongke[^"]*"[\s\S]*?<\/table>/);
    if (!tableMatch) {
      throw new Error('Không tìm thấy bảng dữ liệu quan trắc cho ngày ' + targetDate);
    }

    const rows = tableMatch[0].match(/<tr[\s\S]*?<\/tr>/g) || [];
    const records: { timeStr: string; wells: Record<number, { luu_luong: number | null; tong_luu_luong: number | null; muc_nuoc: number | null }> }[] = [];

    for (const r of rows.slice(1)) {
      const cells = (r.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g) || []).map((c) =>
        c.replace(/<[^>]+>/g, '').trim().replace(/&nbsp;/g, '')
      );
      if (cells.length < 25) continue;

      const timeStr = cells[0];
      const wells: Record<number, { luu_luong: number | null; tong_luu_luong: number | null; muc_nuoc: number | null }> = {};

      for (let w = 1; w <= 6; w++) {
        const idx = 1 + (w - 1) * 4;
        const parseVal = (v: string) => {
          if (!v || v === '-') return null;
          const n = parseFloat(v.replace(/,/g, ''));
          return isNaN(n) ? null : n;
        };

        wells[w] = {
          luu_luong: parseVal(cells[idx]),
          tong_luu_luong: parseVal(cells[idx + 1]),
          muc_nuoc: parseVal(cells[idx + 2]),
        };
      }
      records.push({ timeStr, wells });
    }

    if (records.length === 0) {
      throw new Error(`Ngày ${targetDate} chưa có bản ghi dữ liệu quan trắc nào.`);
    }

    const first = records[0];
    const last = records[records.length - 1];
    const cutOffTime = last.timeStr.split(' ')[1] || '18:00';
    const [cHour, cMin] = cutOffTime.split(':').map((v) => parseInt(v, 10) || 0);
    const cutOffHourFraction = cHour + cMin / 60;

    const toTimeString = (h: number): string => {
      let val = h;
      while (val < 0) val += 24;
      while (val >= 24) val -= 24;
      const totalSec = Math.round(val * 3600);
      const hours = Math.floor(totalSec / 3600) % 24;
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const toDisplayTime = (h: number): string => {
      let val = h;
      while (val < 0) val += 24;
      while (val >= 24) val -= 24;
      const totalSec = Math.round(val * 3600);
      const hours = Math.floor(totalSec / 3600) % 24;
      const minutes = Math.floor((totalSec % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const results: WellScheduleCalculationResult[] = [];

    for (const conf of configs) {
      const wId = conf.wellId;
      const startVal = first.wells[wId]?.tong_luu_luong ?? null;
      const endVal = last.wells[wId]?.tong_luu_luong ?? null;

      let daKhaiThac = 0;
      if (startVal !== null && endVal !== null && endVal >= startVal) {
        daKhaiThac = Math.round((endVal - startVal) * 100) / 100;
      }

      const dinhMuc = conf.dinhMuc;
      const flowRate = conf.luuLuongPerHour > 0 ? conf.luuLuongPerHour : 70;
      const delayMin = conf.delayMinutes || 0;
      const conLai = Math.max(0, Math.round((dinhMuc - daKhaiThac) * 100) / 100);

      if (!conf.enabled) {
        results.push({
          wellId: wId,
          wellName: conf.wellName,
          enabled: false,
          startTong: startVal,
          endTong: endVal,
          daKhaiThac,
          dinhMuc,
          conLai,
          luuLuongPerHour: flowRate,
          delayMinutes: delayMin,
          soGioCanBom: 0,
          thoiGianMoLyThuyet: '--',
          thoiGianMoThucTe: '--',
          displayTime: 'Đang tắt cấu hình',
          status: 'NO_DATA',
        });
        continue;
      }

      if (conLai <= 0) {
        results.push({
          wellId: wId,
          wellName: conf.wellName,
          enabled: true,
          startTong: startVal,
          endTong: endVal,
          daKhaiThac,
          dinhMuc,
          conLai: 0,
          luuLuongPerHour: flowRate,
          delayMinutes: delayMin,
          soGioCanBom: 0,
          thoiGianMoLyThuyet: '--',
          thoiGianMoThucTe: '--',
          displayTime: 'Đã đạt định mức (Không cần mở)',
          status: 'QUOTA_REACHED',
        });
        continue;
      }

      const soGioCanBom = Math.round((conLai / flowRate) * 100) / 100;
      const lyThuyetHours = 24.0 - (conLai / flowRate);
      const thucTeHours = lyThuyetHours + (delayMin / 60.0);

      const strLyThuyet = toTimeString(lyThuyetHours);
      const strThucTe = toTimeString(thucTeHours);
      const shortThucTe = toDisplayTime(thucTeHours);

      let status: 'SCHEDULED' | 'RUN_NOW' = 'SCHEDULED';
      let displayTime = shortThucTe;

      // Nếu số giờ cần bơm quá lớn (>24h) hoặc giờ mở tính toán sớm hơn thời điểm chốt số liệu hiện tại
      if (soGioCanBom >= 24 || (lyThuyetHours < cutOffHourFraction && lyThuyetHours >= 0)) {
        status = 'RUN_NOW';
        displayTime = `Mở ngay (${shortThucTe})`;
      }

      results.push({
        wellId: wId,
        wellName: conf.wellName,
        enabled: true,
        startTong: startVal,
        endTong: endVal,
        daKhaiThac,
        dinhMuc,
        conLai,
        luuLuongPerHour: flowRate,
        delayMinutes: delayMin,
        soGioCanBom,
        thoiGianMoLyThuyet: strLyThuyet,
        thoiGianMoThucTe: strThucTe,
        displayTime,
        status,
      });
    }

    return {
      dateStr: targetDate,
      cutOffTimeStr: cutOffTime,
      wells: results,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Định dạng tin nhắn gửi lịch mở giếng qua Zalo (Tuyệt đối KHÔNG hiển thị số phút độ trễ)
   */
  public static formatWellScheduleMessage(schedule: DailyWellScheduleSummary): string {
    const [y, m, d] = schedule.dateStr.split('-');
    const displayDate = `${d}/${m}/${y}`;

    const now = new Date();
    const updateTimeStr = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);

    const activeWells = schedule.wells.filter((w) => w.enabled);

    const lines = activeWells
      .map((w) => {
        if (w.status === 'QUOTA_REACHED') {
          return `🔹 ${w.wellName}: Đã đạt định mức (Không cần mở)\n   • Đã khai thác: ${w.daKhaiThac.toLocaleString('vi-VN')} m³ / Định mức: ${w.dinhMuc.toLocaleString('vi-VN')} m³`;
        }
        if (w.status === 'RUN_NOW') {
          return `🔹 ${w.wellName}: Cần mở ngay\n   • Đã khai thác: ${w.daKhaiThac.toLocaleString('vi-VN')} m³ / Định mức: ${w.dinhMuc.toLocaleString('vi-VN')} m³\n   • Còn lại: ${w.conLai.toLocaleString('vi-VN')} m³ (~${w.soGioCanBom} giờ)`;
        }
        return `🔹 ${w.wellName}: Thời gian mở giếng lúc ${w.displayTime}\n   • Đã khai thác: ${w.daKhaiThac.toLocaleString('vi-VN')} m³ / Định mức: ${w.dinhMuc.toLocaleString('vi-VN')} m³\n   • Còn lại: ${w.conLai.toLocaleString('vi-VN')} m³`;
      })
      .join('\n\n');

    return `⏰ [BỘ PHẬN RM] LỊCH MỞ GIẾNG TỰ ĐỘNG
━━━━━━━━━━━━━━━━━━━━
📅 Ngày: ${displayDate} (Chốt số liệu quan trắc lúc ${schedule.cutOffTimeStr})

${lines}
━━━━━━━━━━━━━━━━━━━━
📌 Đề nghị nhân viên ca trực theo dõi và vận hành giếng theo đúng lịch trên.
⏱️ Hệ thống tính toán tự động lúc ${updateTimeStr}`;
  }
}
