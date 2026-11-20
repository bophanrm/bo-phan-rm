import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export interface GoogleDriveConfig {
  enabled: boolean;
  authType: 'service_account' | 'oauth';
  // Service Account
  clientEmail: string;
  privateKey: string;
  // OAuth 2.0 (dành cho Gmail cá nhân 15GB)
  oauthClientId?: string;
  oauthClientSecret?: string;
  oauthRefreshToken?: string;
  oauthUserEmail?: string;
  // Thư mục & Lịch
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
let cachedToken: { token: string; expiresAt: number; authKey: string } | null = null;

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
          authType: data.value.authType || 'service_account',
          clientEmail: data.value.clientEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
          privateKey: data.value.privateKey || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
          oauthClientId: data.value.oauthClientId || process.env.GOOGLE_OAUTH_CLIENT_ID || '',
          oauthClientSecret: data.value.oauthClientSecret || process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
          oauthRefreshToken: data.value.oauthRefreshToken || '',
          oauthUserEmail: data.value.oauthUserEmail || '',
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
      authType: 'service_account',
      clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
      privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '',
      oauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      oauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      oauthRefreshToken: '',
      oauthUserEmail: '',
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

    // Xóa cache token
    cachedToken = null;

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

  // Tạo JWT Bearer Assertion ký bằng RSA-SHA256 cho Service Account
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

  // Lấy Access Token từ Google OAuth2 hoặc Service Account
  public static async getAccessToken(configOverride?: Partial<GoogleDriveConfig>): Promise<{ token: string; authType: 'service_account' | 'oauth' }> {
    const config = { ...(await this.getConfig()), ...configOverride };
    const now = Date.now();
    const currentAuthKey = config.authType === 'oauth' ? (config.oauthRefreshToken || '') : (config.clientEmail || '');

    if (cachedToken && cachedToken.expiresAt > now + 60000 && cachedToken.authKey === currentAuthKey) {
      return { token: cachedToken.token, authType: config.authType };
    }

    // 1. NẾU DÙNG OAUTH 2.0 (Gmail cá nhân 15GB)
    if (config.authType === 'oauth') {
      if (!config.oauthRefreshToken) {
        throw new Error('Chưa liên kết tài khoản Google cá nhân. Vui lòng bấm "Đăng nhập Google" để cấp quyền.');
      }
      if (!config.oauthClientId || !config.oauthClientSecret) {
        throw new Error('Thiếu OAuth Client ID hoặc Client Secret từ Google Cloud.');
      }

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.oauthClientId,
          client_secret: config.oauthClientSecret,
          refresh_token: config.oauthRefreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error_description || data.error || 'Không thể làm mới Access Token từ Google OAuth 2.0');
      }

      cachedToken = {
        token: data.access_token,
        expiresAt: now + (data.expires_in ? data.expires_in * 1000 : 3600000),
        authKey: currentAuthKey,
      };

      return { token: data.access_token, authType: 'oauth' };
    }

    // 2. NẾU DÙNG SERVICE ACCOUNT (Shared Drive / Bộ nhớ dùng chung)
    if (!config.clientEmail || !config.privateKey) {
      throw new Error('Thiếu Service Account Client Email hoặc Private Key của Google.');
    }

    const jwt = this.createSignedJwt(config.clientEmail, config.privateKey);

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
      authKey: currentAuthKey,
    };

    return { token: data.access_token, authType: 'service_account' };
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
    const { token, authType } = await this.getAccessToken(config);

    let targetFolderId = config.folderId ? config.folderId.trim() : '';
    if (targetFolderId.includes('/folders/')) {
      const match = targetFolderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) targetFolderId = match[1];
    }

    let folderName = 'Google Drive (Root / Thư mục gốc)';

    if (targetFolderId) {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${targetFolderId}?supportsAllDrives=true&fields=id,name,mimeType,capabilities`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const folderData = await res.json();
      if (!res.ok) {
        // Tự động tạo thư mục "Sao Lưu Bộ Phận RM" nếu thư mục cũ không truy cập được
        try {
          const createFolderRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: 'Sao Lưu Bộ Phận RM',
                mimeType: 'application/vnd.google-apps.folder',
              }),
            }
          );
          const newFolder = await createFolderRes.json();
          if (newFolder.id) {
            targetFolderId = newFolder.id;
            folderName = 'Sao Lưu Bộ Phận RM (Khởi tạo sẵn)';
            await this.saveConfig({ folderId: targetFolderId, folderName });
          } else {
            throw new Error(
              `Không tìm thấy thư mục (ID: ${targetFolderId}). Hãy chắc chắn thư mục này đã được chia sẻ quyền Người chỉnh sửa (Editor).`
            );
          }
        } catch (e: any) {
          throw new Error(e?.message || 'Không thể truy cập hoặc khởi tạo thư mục Google Drive.');
        }
      } else {
        folderName = folderData.name || 'Thư mục Drive';
      }
    } else {
      // Nếu chưa nhập Folder ID, tự động tạo thư mục "Sao Lưu Bộ Phận RM"
      try {
        const createFolderRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'Sao Lưu Bộ Phận RM',
              mimeType: 'application/vnd.google-apps.folder',
            }),
          }
        );
        const newFolder = await createFolderRes.json();
        if (newFolder.id) {
          targetFolderId = newFolder.id;
          folderName = 'Sao Lưu Bộ Phận RM';
          await this.saveConfig({ folderId: targetFolderId, folderName });
        }
      } catch (e) {}
    }

    const emailDisplay = authType === 'oauth'
      ? (config.oauthUserEmail || 'Tài khoản Google cá nhân (OAuth)')
      : config.clientEmail;

    return {
      success: true,
      folderName,
      folderId: targetFolderId,
      accountEmail: emailDisplay,
      message: `Kết nối thành công tới Google Drive! Tài khoản: ${emailDisplay} - Thư mục: ${folderName}`,
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
      authType?: 'service_account' | 'oauth';
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

    // supportsAllDrives=true để hỗ trợ cả Shared Drive
    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,size,createdTime,webViewLink,webContentLink',
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
      const rawErrMsg = file.error?.message || '';

      if (rawErrMsg.includes('storage quota') || rawErrMsg.includes('storageQuotaExceeded')) {
        throw new Error(
          'Lỗi dung lượng: Google không cấp dung lượng cho Service Account trên Drive cá nhân (@gmail.com). ' +
          'GIẢI PHÁP: (1) Nếu dùng Gmail cá nhân, bạn hãy chuyển sang mục "Liên kết tài khoản Google (OAuth 2.0)" để dùng 15GB miễn phí; ' +
          'HOẶC (2) Nếu dùng Google Workspace, hãy tạo thư mục bên trong "Bộ nhớ dùng chung" (Shared Drive) và thêm Service Account vào.'
        );
      }

      throw new Error(rawErrMsg || 'Lỗi tải file lên Google Drive.');
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

    let cleanFolderId = config.folderId ? config.folderId.trim() : '';
    if (cleanFolderId.includes('/folders/')) {
      const match = cleanFolderId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) cleanFolderId = match[1];
    }

    try {
      const { token } = await this.getAccessToken(config);

      let query = `trashed = false and mimeType != 'application/vnd.google-apps.folder'`;
      if (cleanFolderId) {
        query += ` and '${cleanFolderId}' in parents`;
      }

      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&includeItemsFromAllDrives=true&q=${encodeURIComponent(
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
    const { token, authType } = await this.getAccessToken(config);

    // Thu thập dữ liệu sao lưu
    let backupPayload: any = options?.snapshotData;
    if (!backupPayload) {
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
      authType,
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
    if (!config.enabled) return false;

    if (config.authType === 'service_account' && (!config.clientEmail || !config.privateKey)) {
      return false;
    }
    if (config.authType === 'oauth' && !config.oauthRefreshToken) {
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

    // Khóa nguyên tử chống sao lưu trùng lặp
    const lockKey = `lock_drive_backup_${todayVnStr}`;
    const { error: lockError } = await supabase.from('app_sync_store').insert({
      key: lockKey,
      value: { lockedAt: new Date().toISOString(), serverTime: vnTime },
    });

    if (lockError) {
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
