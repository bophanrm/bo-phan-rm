import { NextResponse } from 'next/server';
import { GoogleDriveService } from '@/server/googleDrive';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const origin = searchParams.get('origin') || new URL(req.url).origin;

    const config = await GoogleDriveService.getConfig();
    const clientId = searchParams.get('clientId') || config.oauthClientId;

    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'Chưa có Google OAuth Client ID. Vui lòng nhập Client ID trước khi liên kết.',
      }, { status: 400 });
    }

    const redirectUri = `${origin}/api/drive/oauth/callback`;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    return NextResponse.json({
      success: true,
      authUrl,
      redirectUri,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
