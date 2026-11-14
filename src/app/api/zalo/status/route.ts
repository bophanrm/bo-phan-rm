import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';

export async function GET() {
  try {
    // Đảm bảo bot đã tải phiên và cấu hình mới nhất từ Supabase
    if (zaloBot.status !== 'CONNECTED' && zaloBot.status !== 'GENERATING_QR' && zaloBot.status !== 'QR_READY' && zaloBot.status !== 'SCANNED') {
      await zaloBot.loadSavedSession();
    } else {
      // Nếu đã CONNECTED, cập nhật cấu hình mới nhất từ Supabase zalo_config
      await zaloBot.loadLatestConfigOnly();
    }

    // Tự động kiểm tra lịch gửi bù nếu hôm nay đã đến giờ mà chưa gửi (phòng trường hợp serverless vừa thức dậy)
    zaloBot.checkAndTriggerWellReport().catch((e) => console.warn('Error in background wellReport check:', e));
    zaloBot.checkAndTriggerWellSchedule().catch((e) => console.warn('Error in background wellSchedule check:', e));

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
