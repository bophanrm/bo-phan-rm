import { Zalo, ThreadType, LoginQRCallbackEventType } from 'zca-js';
import fs from 'node:fs';
import path from 'node:path';
import { supabase } from '@/lib/supabase';

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

  // Tải cấu hình và phiên đã lưu từ trước (Hỗ trợ cả File cục bộ và Supabase Cloud)
  public async loadSavedSession() {
    try {
      let data: ZaloSessionData | null = null;

      // 1. Kiểm tra file cục bộ trước
      if (fs.existsSync(SESSION_FILE_PATH)) {
        const raw = fs.readFileSync(SESSION_FILE_PATH, 'utf-8');
        data = JSON.parse(raw);
      }

      // 2. Nếu file không có hoặc trên cloud serverless, kiểm tra Supabase
      if (!data) {
        const { data: cloudRow } = await supabase
          .from('app_sync_store')
          .select('value')
          .eq('key', 'zalo_session')
          .maybeSingle();

        if (cloudRow?.value) {
          data = cloudRow.value;
          // Ghi lại ra file nếu môi trường cho phép
          try {
            fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
          } catch (e) {
            // ignore
          }
        }
      }

      if (data && data.cookie && data.imei) {
        if (data.userInfo) this.userInfo = data.userInfo;
        if (data.config) this.config = { ...this.config, ...data.config };
        // Khôi phục phiên ngầm
        await this.reconnect(data);
      }
    } catch (err: any) {
      console.warn('[ZaloBot] Cannot read saved session:', err.message);
    }
  }

  // Lưu phiên và cấu hình vào file & Supabase Cloud
  private async saveSession(credentials: { cookie: any; imei: string; userAgent: string }) {
    try {
      const data: ZaloSessionData = {
        cookie: credentials.cookie,
        imei: credentials.imei,
        userAgent: credentials.userAgent,
        userInfo: this.userInfo || undefined,
        config: this.config,
      };

      try {
        fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      } catch (e) {
        // ignore
      }

      // Đồng bộ lên Supabase Cloud
      await supabase.from('app_sync_store').upsert({
        key: 'zalo_session',
        value: data,
        updated_at: new Date().toISOString(),
      });

      console.log('[ZaloBot] Saved session successfully to file & cloud');
    } catch (err: any) {
      console.error('[ZaloBot] Failed to save session:', err.message);
    }
  }

  // Giải mã link nhóm Zalo (ví dụ https://zalo.me/g/qxgadv733) thành ID nhóm thực tế
  public async resolveGroupLink(linkOrCode: string): Promise<{ groupId: string; name?: string } | null> {
    if (!this.api) return null;
    try {
      const fullLink = linkOrCode.startsWith('http') ? linkOrCode : `https://zalo.me/g/${linkOrCode}`;
      console.log('[ZaloBot] Resolving group link:', fullLink);
      const res = await this.api.getGroupLinkInfo({ link: fullLink });
      console.log('[ZaloBot] getGroupLinkInfo result:', JSON.stringify(res));
      if (res && res.groupId) {
        return {
          groupId: String(res.groupId),
          name: res.name || undefined,
        };
      }
    } catch (e: any) {
      console.error('[ZaloBot] Failed to resolve group link:', e.message);
    }
    return null;
  }

  // Cập nhật cấu hình (Nhóm Zalo, các nút bật/tắt)
  public async updateConfig(newConfig: Partial<ZaloBotConfig>) {
    if (newConfig.groupId && (newConfig.groupId.includes('zalo.me') || !/^\d+$/.test(newConfig.groupId))) {
      const resolved = await this.resolveGroupLink(newConfig.groupId);
      if (resolved) {
        newConfig.groupId = resolved.groupId;
        if (resolved.name) {
          newConfig.groupName = resolved.name;
        }
      }
    }

    this.config = { ...this.config, ...newConfig };
    try {
      if (fs.existsSync(SESSION_FILE_PATH)) {
        const raw = fs.readFileSync(SESSION_FILE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        data.config = this.config;
        fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      }
      await supabase.from('app_sync_store').upsert({
        key: 'zalo_config',
        value: this.config,
        updated_at: new Date().toISOString(),
      });
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
      console.log('[ZaloBot] getAllGroups raw response:', JSON.stringify(res));

      let groupIds: string[] = [];
      if (res) {
        if (Array.isArray(res.gridList)) {
          groupIds = res.gridList;
        } else if (res.gridVerMap && typeof res.gridVerMap === 'object') {
          groupIds = Object.keys(res.gridVerMap);
        } else if (Array.isArray(res)) {
          groupIds = res;
        }
      }

      console.log(`[ZaloBot] Extracted ${groupIds.length} group IDs:`, groupIds);

      if (groupIds.length === 0) {
        return [];
      }

      // Lấy chi tiết thông tin các nhóm bằng getGroupInfo
      try {
        const infoRes = await this.api.getGroupInfo(groupIds);
        console.log('[ZaloBot] getGroupInfo raw response keys:', infoRes ? Object.keys(infoRes) : null);
        const gridInfoMap = infoRes?.gridInfoMap || {};

        return groupIds.map((gid) => {
          const info = gridInfoMap[gid];
          return {
            id: String(gid),
            name: info?.name || `Nhóm ${gid}`,
            totalMember: info?.totalMember || (Array.isArray(info?.memberIds) ? info.memberIds.length : undefined),
            avatar: info?.avt,
          };
        });
      } catch (errInfo: any) {
        console.warn('[ZaloBot] getGroupInfo failed, falling back to ID list:', errInfo.message);
        return groupIds.map((gid) => ({
          id: String(gid),
          name: `Nhóm ${gid}`,
        }));
      }
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
