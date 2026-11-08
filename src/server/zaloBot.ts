import { Zalo, ThreadType, LoginQRCallbackEventType } from 'zca-js';
import fs from 'node:fs';
import path from 'node:path';

// File lưu phiên đăng nhập Zalo Bot trên máy chủ
const SESSION_FILE_PATH = path.join(process.cwd(), '.zalo-session.json');

export interface ZaloBotConfig {
  groupId: string | null;
  groupName?: string | null;
  notifyOnNewTask: boolean;
  notifyDailyShiftReminder: boolean;
  notifyProjectDeadline: boolean;
}

export interface ZaloGroupInfo {
  id: string;
  name: string;
  totalMember?: number;
  avatar?: string;
}

interface ZaloSessionData {
  cookie: any;
  imei: string;
  userAgent: string;
  userInfo?: {
    id: string;
    name: string;
    avatar?: string;
  };
  config?: ZaloBotConfig;
}

class ZaloBotService {
  private zalo: any = null;
  private api: any = null;
  public status: 'DISCONNECTED' | 'GENERATING_QR' | 'QR_READY' | 'SCANNED' | 'CONNECTED' | 'ERROR' = 'DISCONNECTED';
  public qrCodeBase64: string | null = null;
  public qrExpiresAt: number | null = null;
  public errorMessage: string | null = null;
  public userInfo: { id: string; name: string; avatar?: string } | null = null;
  public config: ZaloBotConfig = {
    groupId: null,
    groupName: null,
    notifyOnNewTask: true,
    notifyDailyShiftReminder: true,
    notifyProjectDeadline: true,
  };

  private loginPromise: Promise<any> | null = null;
  private qrAbortController: AbortController | null = null;

  constructor() {
    this.loadSavedSession();
  }

  // Tải cấu hình và phiên đã lưu từ trước
  public loadSavedSession() {
    try {
      if (fs.existsSync(SESSION_FILE_PATH)) {
        const raw = fs.readFileSync(SESSION_FILE_PATH, 'utf-8');
        const data: ZaloSessionData = JSON.parse(raw);
        if (data && data.cookie && data.imei) {
          if (data.userInfo) this.userInfo = data.userInfo;
          if (data.config) this.config = { ...this.config, ...data.config };
          // Thử khôi phục phiên ngầm
          this.reconnect(data).catch((err) => {
            console.error('[ZaloBot] Failed to auto reconnect with saved session:', err.message);
          });
        }
      }
    } catch (err: any) {
      console.warn('[ZaloBot] Cannot read saved session:', err.message);
    }
  }

  // Lưu phiên và cấu hình vào file
  private saveSession(credentials: { cookie: any; imei: string; userAgent: string }) {
    try {
      const data: ZaloSessionData = {
        cookie: credentials.cookie,
        imei: credentials.imei,
        userAgent: credentials.userAgent,
        userInfo: this.userInfo || undefined,
        config: this.config,
      };
      fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      console.log('[ZaloBot] Saved session successfully to', SESSION_FILE_PATH);
    } catch (err: any) {
      console.error('[ZaloBot] Failed to save session:', err.message);
    }
  }

  // Cập nhật cấu hình (Nhóm Zalo, các nút bật/tắt)
  public updateConfig(newConfig: Partial<ZaloBotConfig>) {
    this.config = { ...this.config, ...newConfig };
    try {
      if (fs.existsSync(SESSION_FILE_PATH)) {
        const raw = fs.readFileSync(SESSION_FILE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        data.config = this.config;
        fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      }
    } catch (e) {
      // ignore
    }
  }

  // Khôi phục kết nối từ cookie đã lưu
  public async reconnect(data: ZaloSessionData) {
    try {
      this.zalo = new Zalo();
      const api = await this.zalo.login({
        cookie: data.cookie,
        imei: data.imei,
        userAgent: data.userAgent,
      });
      this.api = api;
      this.status = 'CONNECTED';
      this.errorMessage = null;
      console.log('[ZaloBot] Reconnected successfully to Zalo account!');
      return true;
    } catch (err: any) {
      console.warn('[ZaloBot] Reconnect failed, need new QR scan:', err.message);
      this.status = 'DISCONNECTED';
      return false;
    }
  }

  // Bắt đầu tạo mã QR để người dùng quét
  public async startQRLogin() {
    if (this.status === 'GENERATING_QR' || this.status === 'QR_READY') {
      return { status: this.status, qrCode: this.qrCodeBase64 };
    }

    this.status = 'GENERATING_QR';
    this.qrCodeBase64 = null;
    this.errorMessage = null;
    this.zalo = new Zalo();

    this.loginPromise = (async () => {
      try {
        const api = await this.zalo.loginQR(
          {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
          },
          (event: any) => {
            if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
              this.status = 'QR_READY';
              // Base64 image
              this.qrCodeBase64 = event.data.image.startsWith('data:image')
                ? event.data.image
                : `data:image/png;base64,${event.data.image}`;
              this.qrExpiresAt = Date.now() + 90000;
              console.log('[ZaloBot] QR Code generated successfully.');
            } else if (event.type === LoginQRCallbackEventType.QRCodeScanned) {
              this.status = 'SCANNED';
              console.log('[ZaloBot] QR Code has been scanned by user!');
            } else if (event.type === LoginQRCallbackEventType.QRCodeExpired) {
              this.status = 'DISCONNECTED';
              this.qrCodeBase64 = null;
              this.errorMessage = 'Mã QR đã hết hạn, vui lòng bấm thử lại.';
              console.log('[ZaloBot] QR Code expired.');
            } else if (event.type === LoginQRCallbackEventType.QRCodeDeclined) {
              this.status = 'DISCONNECTED';
              this.qrCodeBase64 = null;
              this.errorMessage = 'Đăng nhập bị từ chối trên điện thoại.';
              console.log('[ZaloBot] QR Code declined.');
            } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
              this.saveSession(event.data);
            }
          }
        );

        this.api = api;
        this.status = 'CONNECTED';
        this.qrCodeBase64 = null;
        this.errorMessage = null;

        // Lấy thông tin tài khoản vừa đăng nhập
        try {
          const accountInfo = await api.fetchAccountInfo();
          if (accountInfo && accountInfo.data) {
            this.userInfo = {
              id: accountInfo.data.userId || accountInfo.data.uid,
              name: accountInfo.data.name || accountInfo.data.displayName || 'Tài khoản Zalo',
              avatar: accountInfo.data.avatar,
            };
          }
        } catch (e) {
          this.userInfo = {
            id: 'zalo-user',
            name: 'Zalo Bot Cấp 2',
          };
        }

        // Cập nhật lại file với userInfo
        if (fs.existsSync(SESSION_FILE_PATH)) {
          const raw = fs.readFileSync(SESSION_FILE_PATH, 'utf-8');
          const data = JSON.parse(raw);
          data.userInfo = this.userInfo;
          fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
        }

        console.log('[ZaloBot] Login completely successful! User:', this.userInfo?.name);
      } catch (err: any) {
        console.error('[ZaloBot] Login error:', err.message);
        this.status = 'ERROR';
        this.errorMessage = err.message || 'Lỗi kết nối Zalo';
      }
    })();

    return { status: this.status, qrCode: this.qrCodeBase64 };
  }

  // Lấy danh sách nhóm Zalo mà tài khoản đang tham gia
  public async getGroups(): Promise<ZaloGroupInfo[]> {
    if (this.status !== 'CONNECTED' || !this.api) {
      return [];
    }

    try {
      const res = await this.api.getAllGroups();
      if (!res || !res.gridList) {
        return [];
      }

      // res.gridList là danh sách các group
      const groups: ZaloGroupInfo[] = [];
      const gridList = res.gridList || [];
      const groupInfoMap = res.groupInfoMap || {};

      for (const gid of gridList) {
        const info = groupInfoMap[gid];
        if (info) {
          groups.push({
            id: gid,
            name: info.name || `Nhóm ${gid}`,
            totalMember: info.totalMember,
            avatar: info.avt,
          });
        } else {
          groups.push({
            id: gid,
            name: `Nhóm ${gid}`,
          });
        }
      }

      return groups;
    } catch (err: any) {
      console.error('[ZaloBot] Failed to get groups:', err.message);
      return [];
    }
  }

  // Gửi tin nhắn vào nhóm
  public async sendGroupMessage(groupId: string, messageText: string): Promise<{ success: boolean; error?: string }> {
    if (this.status !== 'CONNECTED' || !this.api) {
      return { success: false, error: 'Zalo Bot chưa được kết nối' };
    }

    try {
      await this.api.sendMessage(
        {
          msg: messageText,
        },
        groupId,
        ThreadType.Group
      );
      console.log(`[ZaloBot] Sent message to group ${groupId} successfully!`);
      return { success: true };
    } catch (err: any) {
      console.error('[ZaloBot] Error sending message:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Đăng xuất và xóa phiên
  public logout() {
    this.status = 'DISCONNECTED';
    this.api = null;
    this.userInfo = null;
    this.qrCodeBase64 = null;
    try {
      if (fs.existsSync(SESSION_FILE_PATH)) {
        fs.unlinkSync(SESSION_FILE_PATH);
      }
    } catch (e) {
      // ignore
    }
    console.log('[ZaloBot] Logged out successfully');
  }
}

// Global Singleton Instance để giữ nguyên trạng thái kết nối trên máy chủ Next.js
const globalForZalo = global as unknown as { zaloBotInstance?: ZaloBotService };
export const zaloBot = globalForZalo.zaloBotInstance ?? new ZaloBotService();
if (process.env.NODE_ENV !== 'production') {
  globalForZalo.zaloBotInstance = zaloBot;
}
