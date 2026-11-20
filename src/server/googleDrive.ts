import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export interface GoogleDriveConfig {
  enabled: boolean;
  clientEmail: string;
  privateKey: string;
  folderId: string;
  folderName?: string;
  scheduleTime: string; // HH:mm, mặc định "00:00"
  frequency: 'daily' | '12h' | 'manual';
  lastBackupTime?: string;
  lastBackupFileId?: string;
  lastBackupFileName?: string;
  lastBackupStatus?: 'success' | 'error' | 'idle';
  lastBackupError?: string;
}

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  webViewLink?: string;
}

// Bộ nhớ đệm token
let cachedToken: { token: string; expiresAt: number } | null = null;

export class GoogleDriveService {
  // Lấy cấu hình Drive từ Supabase hoặc biến môi trường
  public static async getConfig(): Promise<GoogleDriveConfig> {
    try {
      const { data } = await supabase
        .from('app_sync_store')
        .select('value')
        .eq('key', 'google_drive_config')
        .maybeSingle();

      if (data?.value) {
        return {
          enabled: !!data.value.enabled,
          clientEmail: data.value.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
          privateKey: data.value.privateKey || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
          folderId: data.value.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID || '',
          folderName: data.value.folderName || '',
          scheduleTime: data.value.scheduleTime || '00:00',
          frequency: data.value.frequency || 'daily',
          lastBackupTime: data.value.lastBackupTime,
          lastBackupFileId: data.value.lastBackupFileId,
          lastBackupFileName: data.value.lastBackupFileName,
          lastBackupStatus: data.value.lastBackupStatus || 'idle',
          lastBackupError: data.value.lastBackupError,
        };
      }
    } catch (e: any) {
      console.warn('[GoogleDrive] Lỗi đọc config từ Supabase:', e?.message);
    }

    // Fallback từ env
    return {
      enabled: false,
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
      folderName: '',
      scheduleTime: '00:00',
      frequency: 'daily',
      lastBackupStatus: 'idle',
    };
  }

  // Lưu cấu hình Drive vào Supabase
  public static async saveConfig(config: Partial<GoogleDriveConfig>): Promise<GoogleDriveConfig> {
    const current = await this.getConfig();
    const merged: GoogleDriveConfig = {
      ...current,
      ...config,
    };

    // Xóa cache token nếu email hoặc privateKey thay đổi
    if (config.clientEmail || config.privateKey) {
      cachedToken = null;
    }

    try {
      await supabase.from('app_sync_store').upsert({
        key: 'google_drive_config',
        value: merged,
        updated_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.error('[GoogleDrive] Lỗi lưu config vào Supabase:', e?.message);
      throw new Error(`Không thể lưu cấu hình Google Drive: ${e?.message}`);
    }

    return merged;
  }

  // Chuẩn hóa Private Key (xử lý escape \n khi lưu dạng string)
  private static formatPrivateKey(rawKey: string): string {
    let key = rawKey.trim();
    if (key.startsWith('"') && key.endsWith('"')) {
      key = key.slice(1, -1);
    }
    return key.replace(/\\n/g, '\n');
  }

  // Tạo JWT Bearer Assertion ký bằng RSA-SHA256
  private static createSignedJwt(clientEmail: string, privateKey: string): string {
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const base64UrlEncode = (strOrObj: string | object) => {
      const buf = typeof strOrObj === 'string' ? Buffer.from(strOrObj, 'utf-8') : Buffer.from(JSON.stringify(strOrObj), 'utf-8');
      return buf
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    };

    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payload);
    const signInput = `${encodedHeader}.${encodedPayload}`;

    const formattedKey = this.formatPrivateKey(privateKey);
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signInput);
    const signature = signer
      .sign(formattedKey, 'base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${signInput}.${signature}`;
  }

  // Lấy Access Token từ Google OAuth2
  public static async getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAt > now + 60000) {
      return cachedToken.token;
    }

    if (!clientEmail || !privateKey) {
      throw new Error('Thiếu Service Account Client Email hoặc Private Key của Google.');
    }

    const jwt = this.createSignedJwt(clientEmail, privateKey);

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errDetail = data.error_description || data.error || 'Xác thực Google Service Account thất bại';
      console.error('[GoogleDrive Token Error]:', data);
      throw new Error(`Lỗi xác thực Google: ${errDetail}`);
    }

    cachedToken = {
      token: data.access_token,
      expiresAt: now + (data.expires_in ? data.expires_in * 1000 : 3600000),
    };

    return data.access_token;
  }

  // Kiểm tra kết nối và quyền hạn truy cập thư mục Google Drive
  public static async testConnection(customConfig?: Partial<GoogleDriveConfig>): Promise<{
    success: boolean;
    folderName?: string;
    folderId?: string;
    accountEmail: string;
    message: string;
  }> {
    const config = { ...(await this.getConfig()), ...customConfig };

    if (!config.clientEmail || !config.privateKey) {
      throw new Error('Vui lòng cung cấp Client Email và Private Key của Service Account.');
    }

    const token = await this.getAccessToken(config.clientEmail, config.privateKey);

    // Nếu có Folder ID, kiểm tra folder có tồn tại và Service Account có quyền xem/ghi không
    let targetFolderId = config.folderId ? config.folderId.trim() : '';
    // Nếu người dùng dán nguyên link URL thư mục Drive (https://drive.google.com/drive/folders/XXXXX)
    if (targetFolderId.includes('/folders/')) {
      const match = targetFolderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) targetFolderId = match[1];
    }

    let folderName = 'Google Drive (Root / Mặc định)';

    if (targetFolderId) {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${targetFolderId}?fields=id,name,mimeType,capabilities`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const folderData = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(
            `Không tìm thấy thư mục (ID: ${targetFolderId}). Hãy chắc chắn bạn đã CHIA SẺ (Share) thư mục này cho email Service Account "${config.clientEmail}" với quyền Người chỉnh sửa (Editor).`
          );
        }
        throw new Error(folderData.error?.message || 'Không thể truy cập thư mục Google Drive được chỉ định.');
      }

      if (folderData.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error(`ID "${targetFolderId}" không phải là một Thư mục (Folder) trên Google Drive.`);
      }

      folderName = folderData.name || 'Thư mục Drive';
    }

    return {
      success: true,
      folderName,
      folderId: targetFolderId,
      accountEmail: config.clientEmail,
      message: `Kết nối thành công tới Google Drive! Service Account: ${config.clientEmail} - Thư mục: ${folderName}`,
    };
  }

  // Upload file lên Google Drive bằng multipart upload
  public static async uploadFile(
    token: string,
    options: {
      fileName: string;
      content: string;
      mimeType: string;
      folderId?: string;
    }
  ): Promise<GoogleDriveBackupFile> {
    const boundary = `-------BoPhanRM_DriveBoundary_${Date.now()}`;
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    let cleanFolderId = options.folderId ? options.folderId.trim() : '';
    if (cleanFolderId.includes('/folders/')) {
      const match = cleanFolderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) cleanFolderId = match[1];
    }

    const metadata: any = {
      name: options.fileName,
      mimeType: options.mimeType,
      description: 'Bản sao lưu dữ liệu tự động hệ thống Quản lý Nhiệm vụ Bộ phận RM',
    };

    if (cleanFolderId) {
      metadata.parents = [cleanFolderId];
    }

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${options.mimeType}\r\n\r\n` +
      options.content +
      closeDelimiter;

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    const file = await res.json();
    if (!res.ok) {
      console.error('[GoogleDrive Upload Error]:', file);
      throw new Error(file.error?.message || 'Lỗi tải file lên Google Drive.');
    }

    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      createdTime: file.createdTime,
      webViewLink: file.webViewLink,
    };
  }

  // Lấy danh sách các file backup gần nhất trong thư mục
  public static async listBackups(customConfig?: Partial<GoogleDriveConfig>): Promise<GoogleDriveBackupFile[]> {
    const config = { ...(await this.getConfig()), ...customConfig };
    if (!config.clientEmail || !config.privateKey) return [];

    let cleanFolderId = config.folderId ? config.folderId.trim() : '';
    if (cleanFolderId.includes('/folders/')) {
      const match = cleanFolderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) cleanFolderId = match[1];
    }

    try {
      const token = await this.getAccessToken(config.clientEmail, config.privateKey);

      let query = `trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
      if (cleanFolderId) {
        query += ` and '${cleanFolderId}' in parents`;
      }

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query
        )}&fields=files(id,name,mimeType,size,createdTime,webViewLink)&orderBy=createdTime desc&pageSize=15`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) {
        console.warn('[GoogleDrive List Error]:', data);
        return [];
      }

      return data.files || [];
    } catch (e: any) {
      console.warn('[GoogleDrive] Lỗi lấy danh sách file:', e?.message);
      return [];
    }
  }

  // Thực hiện sao lưu dữ liệu toàn diện lên Google Drive
  public static async executeBackup(options?: {
    customConfig?: Partial<GoogleDriveConfig>;
    snapshotData?: any;
    initiatedBy?: string;
  }): Promise<{
    success: boolean;
    backupFile: GoogleDriveBackupFile;
    timestamp: string;
    totalTasks: number;
  }> {
    const config = { ...(await this.getConfig()), ...options?.customConfig };

    if (!config.clientEmail || !config.privateKey) {
      throw new Error('Chưa cấu hình tài khoản Service Account Google Drive.');
    }

    const token = await this.getAccessToken(config.clientEmail, config.privateKey);

    // Thu thập dữ liệu sao lưu
    let backupPayload: any = options?.snapshotData;
    if (!backupPayload) {
      // Đọc toàn bộ snapshot từ Supabase app_sync_store
      const { data: rows } = await supabase
        .from('app_sync_store')
        .select('key, value')
        .in('key', ['tasks', 'users', 'teams', 'shifts', 'shifts_config', 'approvals', 'notifs', 'messages']);

      const tasks = rows?.find((r) => r.key === 'tasks')?.value || [];
      const users = rows?.find((r) => r.key === 'users')?.value || [];
      const teams = rows?.find((r) => r.key === 'teams')?.value || [];
      const shifts = rows?.find((r) => r.key === 'shifts')?.value || [];
      const shiftsConfig = rows?.find((r) => r.key === 'shifts_config')?.value || null;
      const approvals = rows?.find((r) => r.key === 'approvals')?.value || [];
      const notifications = rows?.find((r) => r.key === 'notifs')?.value || [];
      const messages = rows?.find((r) => r.key === 'messages')?.value || [];

      backupPayload = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        system: 'Hệ thống Quản lý Nhiệm vụ Bộ phận RM',
        source: 'Supabase Cloud Realtime Store',
        initiatedBy: options?.initiatedBy || 'Hệ thống tự động',
        totalTasks: Array.isArray(tasks) ? tasks.length : 0,
        users,
        teams,
        shifts,
        shiftsConfig,
        tasks,
        approvals,
        notifications,
        messages,
      };
    } else {
      backupPayload.exportedAt = new Date().toISOString();
      backupPayload.source = 'Client State Snapshot';
      backupPayload.initiatedBy = options?.initiatedBy || 'Quản trị viên thao tác';
    }

    const now = new Date();
    const vnTimeStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
    const timeFormatted = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const fileName = `BoPhanRM_Backup_${vnTimeStr}_${timeFormatted}.json`;

    const fileContent = JSON.stringify(backupPayload, null, 2);

    const backupFile = await this.uploadFile(token, {
      fileName,
      content: fileContent,
      mimeType: 'application/json',
      folderId: config.folderId,
    });

    // Cập nhật trạng thái sao lưu mới nhất vào config
    await this.saveConfig({
      lastBackupTime: new Date().toISOString(),
      lastBackupFileId: backupFile.id,
      lastBackupFileName: backupFile.name,
      lastBackupStatus: 'success',
      lastBackupError: undefined,
    });

    return {
      success: true,
      backupFile,
      timestamp: new Date().toISOString(),
      totalTasks: backupPayload.totalTasks || (Array.isArray(backupPayload.tasks) ? backupPayload.tasks.length : 0),
    };
  }

  // Tự động kiểm tra và chạy sao lưu định kỳ (chạy trong cron /api/zalo/cron)
  public static async checkAndTriggerAutoBackup(): Promise<boolean> {
    const config = await this.getConfig();
    if (!config.enabled || !config.clientEmail || !config.privateKey) {
      return false;
    }

    const now = new Date();
    const todayVnStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
    const vnTime = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(now);

    const [curHour, curMin] = vnTime.split(':').map(Number);
    const [targetHour, targetMin] = (config.scheduleTime || '00:00').split(':').map(Number);

    const currentMinutes = curHour * 60 + curMin;
    const targetMinutes = targetHour * 60 + targetMin;
    const diffMinutes = currentMinutes - targetMinutes;

    // Chỉ thực hiện nếu trong khoảng thời gian từ giờ hẹn tới +30 phút
    if (diffMinutes < 0 || diffMinutes > 30) {
      return false;
    }

    // Khóa nguyên tử chống sao lưu trùng lặp khi nhiều server chạy song song
    const lockKey = `lock_drive_backup_${todayVnStr}`;
    const { error: lockError } = await supabase.from('app_sync_store').insert({
      key: lockKey,
      value: { lockedAt: new Date().toISOString(), serverTime: vnTime },
    });

    if (lockError) {
      // Đã có phiên khác sao lưu hôm nay
      return false;
    }

    try {
      console.log(`[GoogleDrive] Bắt đầu tự động sao lưu dữ liệu ngày ${todayVnStr} lúc ${vnTime}...`);
      await this.executeBackup({ initiatedBy: `Cron định kỳ (${config.scheduleTime})` });
      console.log(`[GoogleDrive] Đã hoàn tất tự động sao lưu dữ liệu ngày ${todayVnStr}!`);
      return true;
    } catch (err: any) {
      console.error('[GoogleDrive] Lỗi tự động sao lưu:', err?.message);
      await this.saveConfig({
        lastBackupStatus: 'error',
        lastBackupError: err?.message,
      });
      return false;
    }
  }
}
