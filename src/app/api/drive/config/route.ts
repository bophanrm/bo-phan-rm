import { NextResponse } from 'next/server';
import { GoogleDriveService } from '@/server/googleDrive';

export async function GET() {
  try {
    const config = await GoogleDriveService.getConfig();
    // Ẩn bớt privateKey vì lý do bảo mật khi trả về UI
    const maskedPrivateKey = config.privateKey
      ? config.privateKey.substring(0, 32) + '...[ĐÃ BẢO MẬT]...'
      : '';

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        hasPrivateKey: !!config.privateKey,
        privateKeyMasked: maskedPrivateKey,
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
      clientEmail: body.clientEmail !== undefined ? body.clientEmail.trim() : current.clientEmail,
      folderId: body.folderId !== undefined ? body.folderId.trim() : current.folderId,
      scheduleTime: body.scheduleTime || current.scheduleTime,
      frequency: body.frequency || current.frequency,
    };

    // Chỉ cập nhật privateKey nếu người dùng gửi key mới thực tế (không phải chuỗi masked)
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
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
