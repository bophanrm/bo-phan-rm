import { Zalo, ThreadType, LoginQRCallbackEventType } from 'zca-js';
import fs from 'node:fs';
import path from 'node:path';
import { supabase } from '@/lib/supabase';
import { QuantracService, WellScheduleConfigItem, DEFAULT_WELL_SCHEDULE_CONFIGS } from './quantracService';

// File lưu phiên đăng nhập Zalo Bot trên máy chủ
const SESSION_FILE_PATH = path.join(process.cwd(), '.zalo-session.json');

export interface ZaloWellReportConfig {
  enabled: boolean;
  time: string; // Giờ gửi định kỳ mỗi ngày, vd: "00:05", "07:00"
  sendToUser: boolean; // Gửi đến Zalo cá nhân
  targetUserId: string | null; // ID Zalo cá nhân
  targetUserName?: string | null; // Tên hiển thị người nhận
  sendToGroup: boolean; // Gửi vào nhóm Zalo
  targetGroupId: string | null; // ID nhóm nhận
  targetGroupName?: string | null; // Tên nhóm nhận
  lastSentDate?: string | null; // Ngày đã gửi gần nhất (YYYY-MM-DD)
}

export interface ZaloWellScheduleConfig {
  enabled: boolean;
  time: string; // Giờ gửi tự động mỗi ngày, vd: "18:30"
  sendToUser: boolean; // Gửi đến Zalo cá nhân
  targetUserId: string | null; // ID Zalo cá nhân
  targetUserName?: string | null; // Tên hiển thị người nhận
  sendToGroup: boolean; // Gửi vào nhóm Zalo
  targetGroupId: string | null; // ID nhóm nhận
  targetGroupName?: string | null; // Tên nhóm nhận
  lastSentDate?: string | null; // Ngày đã gửi gần nhất (YYYY-MM-DD)
  wells: WellScheduleConfigItem[]; // Bảng thông số định mức, lưu lượng và độ trễ từng giếng
}

export interface ZaloBotConfig {
  enabled: boolean;
  groupId: string | null;
  groupName?: string | null;
  notifyOnNewTask: boolean;
  notifyDailyShiftReminder: boolean;
  notifyProjectDeadline: boolean;
  wellReport?: ZaloWellReportConfig;
  wellSchedule?: ZaloWellScheduleConfig;
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
    enabled: true,
    groupId: null,
    groupName: null,
    notifyOnNewTask: true,
    notifyDailyShiftReminder: true,
    notifyProjectDeadline: true,
    wellReport: {
      enabled: false,
      time: '00:05',
      sendToUser: true,
      targetUserId: null,
      targetUserName: null,
      sendToGroup: false,
      targetGroupId: null,
      targetGroupName: null,
      lastSentDate: null,
    },
    wellSchedule: {
      enabled: false,
      time: '18:30',
      sendToUser: true,
      targetUserId: null,
      targetUserName: null,
      sendToGroup: false,
      targetGroupId: null,
      targetGroupName: null,
      lastSentDate: null,
      wells: DEFAULT_WELL_SCHEDULE_CONFIGS,
    },
  };

  private loginPromise: Promise<any> | null = null;
  private qrAbortController: AbortController | null = null;
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadSavedSession();
    // Bật bộ lập lịch kiểm tra gửi báo cáo giếng & lịch mở giếng ngầm định kỳ
    this.schedulerInterval = setInterval(() => {
      this.checkAndTriggerWellReport();
      this.checkAndTriggerWellSchedule();
    }, 30000);
  }

  // Tải cấu hình và phiên đã lưu từ trước (Hỗ trợ cả File cục bộ và Supabase Cloud)
  public async loadSavedSession() {
    try {
      // 1. Luôn tải CẤU HÌNH MỚI NHẤT từ Supabase (key = 'zalo_config') trước tiên!
      try {
        const { data: configRow } = await supabase
          .from('app_sync_store')
          .select('value')
          .eq('key', 'zalo_config')
          .maybeSingle();

        if (configRow?.value) {
          this.config = { ...this.config, ...configRow.value };
          console.log('[ZaloBot] Loaded latest config from Supabase zalo_config:', {
            wellReportEnabled: this.config.wellReport?.enabled,
            wellScheduleEnabled: this.config.wellSchedule?.enabled,
          });
        }
      } catch (e: any) {
        console.warn('[ZaloBot] Cannot load zalo_config from Supabase:', e.message);
      }

      // 2. Tải phiên đăng nhập (Cookie, IMEI, UserInfo) từ file hoặc Supabase zalo_session
      let data: ZaloSessionData | null = null;
      if (fs.existsSync(SESSION_FILE_PATH)) {
        try {
          const raw = fs.readFileSync(SESSION_FILE_PATH, 'utf-8');
          data = JSON.parse(raw);
        } catch (e) {
          // ignore
        }
      }

      if (!data || !data.cookie || !data.imei) {
        const { data: cloudRow } = await supabase
          .from('app_sync_store')
          .select('value')
          .eq('key', 'zalo_session')
          .maybeSingle();

        if (cloudRow?.value) {
          data = cloudRow.value;
          try {
            fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
          } catch (e) {
            // ignore
          }
        }
      }

      if (data && data.cookie && data.imei) {
        if (data.userInfo) this.userInfo = data.userInfo;
        // Khôi phục phiên ngầm
        await this.reconnect(data);
      }
    } catch (err: any) {
      console.warn('[ZaloBot] Cannot read saved session:', err.message);
    }
  }

  // Tải nhanh cấu hình mới nhất từ Supabase mà không cần reconnect lại Zalo
  public async loadLatestConfigOnly() {
    try {
      const { data: configRow } = await supabase
        .from('app_sync_store')
        .select('value')
        .eq('key', 'zalo_config')
        .maybeSingle();

      if (configRow?.value) {
        this.config = { ...this.config, ...configRow.value };
      }
    } catch (e: any) {
      console.warn('[ZaloBot] Error in loadLatestConfigOnly:', e.message);
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
        try {
          const raw = fs.readFileSync(SESSION_FILE_PATH, 'utf-8');
          const data = JSON.parse(raw);
          data.config = this.config;
          fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
        } catch (e) {}
      }

      // 1. Lưu vào bảng app_sync_store với key = zalo_config
      await supabase.from('app_sync_store').upsert({
        key: 'zalo_config',
        value: this.config,
        updated_at: new Date().toISOString(),
      });

      // 2. Đồng bộ lại vào zalo_session trên Supabase
      const { data: sessionRow } = await supabase
        .from('app_sync_store')
        .select('value')
        .eq('key', 'zalo_session')
        .maybeSingle();

      if (sessionRow?.value) {
        const sessionData = sessionRow.value;
        sessionData.config = this.config;
        await supabase.from('app_sync_store').upsert({
          key: 'zalo_session',
          value: sessionData,
          updated_at: new Date().toISOString(),
        });
      }

      console.log('[ZaloBot] Config successfully synced to Supabase zalo_config & zalo_session');
    } catch (e: any) {
      console.error('[ZaloBot] Error updating config in Supabase:', e.message);
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

      try {
        const acc = await api.fetchAccountInfo();
        const profile = acc?.profile || acc?.data;
        if (profile) {
          this.userInfo = {
            id: String(profile.userId || profile.uid || '478612719720194465'),
            name: profile.displayName || profile.name || 'Nguyên Nguyễn',
            avatar: profile.avatar,
          };
        }
      } catch (e) {
        if (!this.userInfo) {
          this.userInfo = {
            id: '478612719720194465',
            name: 'Nguyên Nguyễn',
          };
        }
      }

      // Tự động gán nhóm NDCM nếu chưa có nhóm
      if (!this.config.groupId) {
        this.config.groupId = '1433362129226216673';
        this.config.groupName = 'NDCM';
      }

      console.log('[ZaloBot] Reconnected successfully to Zalo account:', this.userInfo?.name);
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

      // Luôn đảm bảo nhóm NDCM có trong danh sách
      if (!groupIds.includes('1433362129226216673')) {
        groupIds.unshift('1433362129226216673');
      }

      console.log(`[ZaloBot] Extracted ${groupIds.length} group IDs:`, groupIds);

      // Lấy chi tiết thông tin các nhóm bằng getGroupInfo
      try {
        const infoRes = await this.api.getGroupInfo(groupIds);
        console.log('[ZaloBot] getGroupInfo raw response keys:', infoRes ? Object.keys(infoRes) : null);
        const gridInfoMap = infoRes?.gridInfoMap || {};

        return groupIds.map((gid) => {
          const info = gridInfoMap[gid];
          const isNDCM = gid === '1433362129226216673';
          return {
            id: String(gid),
            name: info?.name || (isNDCM ? 'NDCM' : `Nhóm ${gid}`),
            totalMember: info?.totalMember || (isNDCM ? 21 : (Array.isArray(info?.memberIds) ? info.memberIds.length : undefined)),
            avatar: info?.avt,
          };
        });
      } catch (errInfo: any) {
        console.warn('[ZaloBot] getGroupInfo failed, falling back to ID list:', errInfo.message);
        return groupIds.map((gid) => ({
          id: String(gid),
          name: gid === '1433362129226216673' ? 'NDCM' : `Nhóm ${gid}`,
          totalMember: gid === '1433362129226216673' ? 21 : undefined,
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

  // Gửi tin nhắn cá nhân (1:1 chat)
  public async sendDirectMessage(userId: string, messageText: string): Promise<{ success: boolean; error?: string }> {
    if (this.status !== 'CONNECTED' || !this.api) {
      return { success: false, error: 'Zalo Bot chưa được kết nối' };
    }

    try {
      await this.api.sendMessage(
        { msg: messageText },
        userId,
        ThreadType.User
      );
      console.log(`[ZaloBot] Sent direct message to user ${userId} successfully!`);
      return { success: true };
    } catch (err: any) {
      console.error('[ZaloBot] Error sending direct message:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Lấy danh sách bạn bè / danh bạ Zalo
  public async getFriendsList(): Promise<{ id: string; name: string; avatar?: string }[]> {
    if (this.status !== 'CONNECTED' || !this.api) return [];
    try {
      const friends = await this.api.getAllFriends();
      if (!Array.isArray(friends)) return [];
      return friends.map((f: any) => ({
        id: String(f.userId || f.id),
        name: f.displayName || f.zaloName || f.name || 'Người dùng Zalo',
        avatar: f.avatar || f.avatarUrl || f.avt || undefined,
      }));
    } catch (err: any) {
      console.error('[ZaloBot] Failed to get friends list:', err.message);
      return [];
    }
  }

  // Bộ lập lịch ngầm kiểm tra và gửi báo cáo giếng đúng giờ
  public async checkAndTriggerWellReport() {
    try {
      if (this.status !== 'CONNECTED' || !this.api) return;
      if (!this.config.wellReport?.enabled) return;

      const now = new Date();
      const vnTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);
      const todayVnStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);

      const targetTime = this.config.wellReport.time || '07:00';
      const shouldTrigger = vnTime >= targetTime && this.config.wellReport.lastSentDate !== todayVnStr;

      if (shouldTrigger) {
        console.log(`[ZaloBot] Đến giờ tự động gửi báo cáo giếng (${vnTime} >= ${targetTime}) ngày ${todayVnStr}!`);
        this.config.wellReport.lastSentDate = todayVnStr;
        await this.updateConfig({ wellReport: this.config.wellReport });

        // Crawl số liệu 24h
        const report = await QuantracService.get24hWellData(todayVnStr);
        const msg = QuantracService.formatZaloMessage(report, this.config.wellSchedule?.wells);

        // Gửi Zalo cá nhân nếu bật
        if (this.config.wellReport.sendToUser && this.config.wellReport.targetUserId) {
          await this.sendDirectMessage(this.config.wellReport.targetUserId, msg);
        }

        // Gửi Nhóm Zalo nếu bật
        if (this.config.wellReport.sendToGroup && this.config.wellReport.targetGroupId) {
          await this.sendGroupMessage(this.config.wellReport.targetGroupId, msg);
        }
      }
    } catch (err: any) {
      console.error('[ZaloBot] Error in checkAndTriggerWellReport:', err.message);
    }
  }

  // Bộ lập lịch ngầm kiểm tra và gửi LỊCH MỞ GIẾNG tự động theo bảng tính
  public async checkAndTriggerWellSchedule() {
    try {
      if (this.status !== 'CONNECTED' || !this.api) return;
      if (!this.config.wellSchedule?.enabled) return;

      const now = new Date();
      const vnTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);
      const todayVnStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);

      const targetTime = this.config.wellSchedule.time || '18:30';
      const shouldTrigger = vnTime >= targetTime && this.config.wellSchedule.lastSentDate !== todayVnStr;

      if (shouldTrigger) {
        console.log(`[ZaloBot] Đến giờ tự động gửi LỊCH MỞ GIẾNG (${vnTime} >= ${targetTime}) ngày ${todayVnStr}!`);
        this.config.wellSchedule.lastSentDate = todayVnStr;
        await this.updateConfig({ wellSchedule: this.config.wellSchedule });

        // Tính toán lịch mở giếng dựa trên số liệu hiện tại & cấu hình của Admin
        const schedule = await QuantracService.calculateWellSchedule(
          this.config.wellSchedule.wells,
          todayVnStr
        );
        const msg = QuantracService.formatWellScheduleMessage(schedule);

        // Gửi Zalo cá nhân nếu bật
        if (this.config.wellSchedule.sendToUser && this.config.wellSchedule.targetUserId) {
          await this.sendDirectMessage(this.config.wellSchedule.targetUserId, msg);
        }

        // Gửi Nhóm Zalo nếu bật
        if (this.config.wellSchedule.sendToGroup && this.config.wellSchedule.targetGroupId) {
          await this.sendGroupMessage(this.config.wellSchedule.targetGroupId, msg);
        }
      }
    } catch (err: any) {
      console.error('[ZaloBot] Error in checkAndTriggerWellSchedule:', err.message);
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
