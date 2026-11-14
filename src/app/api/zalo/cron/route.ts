import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';

// Endpoint này được gọi tự động định kỳ bởi Vercel Cron hoặc GitHub Actions
// để kích hoạt bot kiểm tra và gửi tin nhắn theo lịch kể cả khi không có ai mở website
export async function GET(req: Request) {
  try {
    // 1. Luôn nạp lại phiên và cấu hình mới nhất từ Supabase
    await zaloBot.loadSavedSession();

    // 2. Kích hoạt kiểm tra và gửi tin theo lịch
    await zaloBot.checkAndTriggerWellReport();
    await zaloBot.checkAndTriggerWellSchedule();
    await zaloBot.checkAndTriggerShiftReminders();

    const now = new Date();
    const vnTime = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(now);

    return NextResponse.json({
      success: true,
      timestamp: vnTime,
      botStatus: zaloBot.status,
      user: zaloBot.userInfo?.name || null,
      wellReport: {
        enabled: zaloBot.config.wellReport?.enabled,
        time: zaloBot.config.wellReport?.time,
        lastSentDate: zaloBot.config.wellReport?.lastSentDate,
        targetGroupId: zaloBot.config.wellReport?.targetGroupId,
      },
      wellSchedule: {
        enabled: zaloBot.config.wellSchedule?.enabled,
        time: zaloBot.config.wellSchedule?.time,
        lastSentDate: zaloBot.config.wellSchedule?.lastSentDate,
        targetGroupId: zaloBot.config.wellSchedule?.targetGroupId,
      },
    });
  } catch (error: any) {
    console.error('[ZaloBot Cron Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
