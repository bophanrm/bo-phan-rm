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
   * @param dateStr Định dạng YYYY-MM-DD
   */
  public static async get24hWellData(dateStr?: string): Promise<DailyWellReportSummary> {
    // Mặc định lấy ngày hôm nay theo giờ Việt Nam
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
  public static formatZaloMessage(report: DailyWellReportSummary): string {
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

    const wellLines = report.wells
      .map((w) => {
        if (w.volume > 0) {
          return `🔹 ${w.wellName}: ${w.volume.toLocaleString('vi-VN')} m³`;
        }
        return `🔹 ${w.wellName}: 0 m³ (Không khai thác)`;
      })
      .join('\n');

    return `💧 [BỘ PHẬN RM] BÁO CÁO KHAI THÁC NƯỚC GIẾNG (24H)
━━━━━━━━━━━━━━━━━━━━
📅 Ngày: ${displayDate} (Từ ${report.startTimeStr.split(' ')[1] || '00:00'} đến ${report.endTimeStr.split(' ')[1] || '24:00'})

${wellLines}
━━━━━━━━━━━━━━━━━━━━
📊 TỔNG KHAI THÁC: ${report.totalVolume.toLocaleString('vi-VN')} m³
⏱️ Cập nhật: ${updateTimeStr}`;
  }
}
