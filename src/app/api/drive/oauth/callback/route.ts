import { NextResponse } from 'next/server';
import { GoogleDriveService } from '@/server/googleDrive';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/?drive_error=${encodeURIComponent(error)}`, url.origin));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/?drive_error=missing_code', url.origin));
    }

    const config = await GoogleDriveService.getConfig();
    const redirectUri = `${url.origin}/api/drive/oauth/callback`;

    if (!config.oauthClientId || !config.oauthClientSecret) {
      return NextResponse.redirect(new URL('/?drive_error=missing_client_credentials', url.origin));
    }

    // Đổi code lấy Access Token & Refresh Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.oauthClientId,
        client_secret: config.oauthClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('[Google OAuth Callback Error]:', tokenData);
      return NextResponse.redirect(
        new URL(`/?drive_error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'token_error')}`, url.origin)
      );
    }

    // Lấy email của người dùng từ Google userinfo
    let userEmail = '';
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userRes.json();
      userEmail = userData.email || '';
    } catch (e) {}

    // Lưu refresh token & chuyển chế độ sang oauth
    await GoogleDriveService.saveConfig({
      authType: 'oauth',
      oauthRefreshToken: tokenData.refresh_token || config.oauthRefreshToken,
      oauthUserEmail: userEmail || config.oauthUserEmail,
      enabled: true,
    });

    return NextResponse.redirect(new URL('/?drive_connected=true', url.origin));
  } catch (err: any) {
    console.error('[Google Drive OAuth Callback Exception]:', err);
    return NextResponse.redirect(new URL(`/?drive_error=${encodeURIComponent(err?.message || 'unknown')}`, req.url));
  }
}
