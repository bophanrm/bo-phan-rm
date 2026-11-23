import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';
import { supabase } from '@/lib/supabase';

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

    let effectiveStatus = zaloBot.status;
    let effectiveQrCode = zaloBot.qrCodeBase64;
    let effectiveErrorMessage = zaloBot.errorMessage;

    // Kiểm tra trạng thái QR từ Supabase để đồng bộ giữa các lambda serverless
    if (effectiveStatus !== 'CONNECTED') {
      try {
        const { data: qrRow } = await supabase
          .from('app_sync_store')
          .select('value')
          .eq('key', 'zalo_qr_state')
          .maybeSingle();

        if (qrRow?.value) {
          const qrState = qrRow.value;
          if (qrState.status === 'QR_READY' && qrState.expiresAt && Date.now() < qrState.expiresAt) {
            effectiveStatus = 'QR_READY';
            effectiveQrCode = qrState.qrCode;
          } else if (qrState.status === 'SCANNED' && qrState.updatedAt && Date.now() - qrState.updatedAt < 60000) {
            effectiveStatus = 'SCANNED';
          }
        }
      } catch (e) {}
    }

    let groups: any[] = [];
    let friends: any[] = [];
    if (effectiveStatus === 'CONNECTED') {
      groups = await zaloBot.getGroups();
      friends = await zaloBot.getFriendsList();
    }

    return NextResponse.json({
      status: effectiveStatus,
      qrCode: effectiveQrCode,
      userInfo: zaloBot.userInfo,
      config: zaloBot.config,
      errorMessage: effectiveErrorMessage,
      groups,
      friends,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
