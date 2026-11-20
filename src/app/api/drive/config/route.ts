import { NextResponse } from 'next/server';
import { GoogleDriveService } from '@/server/googleDrive';

export async function GET() {
  try {
    const config = await GoogleDriveService.getConfig();
    const maskedPrivateKey = config.privateKey
      ? config.privateKey.substring(0, 32) + '...[ĐÃ BẢO MẬT]...'
      : '';
    const maskedClientSecret = config.oauthClientSecret
      ? config.oauthClientSecret.substring(0, 6) + '...[ĐÃ BẢO MẬT]...'
      : '';

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        hasPrivateKey: !!config.privateKey,
        privateKeyMasked: maskedPrivateKey,
        hasClientSecret: !!config.oauthClientSecret,
        oauthClientSecretMasked: maskedClientSecret,
        isOAuthConnected: !!config.oauthRefreshToken,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const current = await GoogleDriveService.getConfig();

    const updatePayload: any = {
      enabled: body.enabled !== undefined ? !!body.enabled : current.enabled,
      authType: body.authType || current.authType || 'service_account',
      clientEmail: body.clientEmail !== undefined ? body.clientEmail.trim() : current.clientEmail,
      folderId: body.folderId !== undefined ? body.folderId.trim() : current.folderId,
      scheduleTime: body.scheduleTime || current.scheduleTime,
      frequency: body.frequency || current.frequency,
      oauthClientId: body.oauthClientId !== undefined ? body.oauthClientId.trim() : current.oauthClientId,
    };

    if (body.oauthClientSecret && !body.oauthClientSecret.includes('[ĐÃ BẢO MẬT]')) {
      updatePayload.oauthClientSecret = body.oauthClientSecret.trim();
    }

    if (body.privateKey && !body.privateKey.includes('[ĐÃ BẢO MẬT]')) {
      updatePayload.privateKey = body.privateKey.trim();
    }

    const saved = await GoogleDriveService.saveConfig(updatePayload);

    return NextResponse.json({
      success: true,
      config: {
        ...saved,
        hasPrivateKey: !!saved.privateKey,
        privateKeyMasked: saved.privateKey ? saved.privateKey.substring(0, 32) + '...[ĐÃ BẢO MẬT]...' : '',
        hasClientSecret: !!saved.oauthClientSecret,
        oauthClientSecretMasked: saved.oauthClientSecret ? saved.oauthClientSecret.substring(0, 6) + '...[ĐÃ BẢO MẬT]...' : '',
        isOAuthConnected: !!saved.oauthRefreshToken,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
