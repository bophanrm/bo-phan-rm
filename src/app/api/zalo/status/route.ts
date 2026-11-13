import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';

export async function GET() {
  try {
    // Nếu chưa ở trạng thái CONNECTED (ví dụ server vừa khởi động lại), tự động tải phiên đã lưu từ Supabase / File
    if (zaloBot.status !== 'CONNECTED' && zaloBot.status !== 'GENERATING_QR' && zaloBot.status !== 'QR_READY' && zaloBot.status !== 'SCANNED') {
      await zaloBot.loadSavedSession();
    }

    let groups: any[] = [];
    let friends: any[] = [];
    if (zaloBot.status === 'CONNECTED') {
      groups = await zaloBot.getGroups();
      friends = await zaloBot.getFriendsList();
    }

    return NextResponse.json({
      status: zaloBot.status,
      qrCode: zaloBot.qrCodeBase64,
      userInfo: zaloBot.userInfo,
      config: zaloBot.config,
      errorMessage: zaloBot.errorMessage,
      groups,
      friends,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
