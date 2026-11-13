import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';
import { QuantracService } from '@/server/quantracService';

// GET: Lấy số liệu 24h mới nhất để xem trước
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;
    const data = await QuantracService.get24hWellData(date);
    const previewMessage = QuantracService.formatZaloMessage(data, zaloBot.config.wellSchedule?.wells);
    return NextResponse.json({ success: true, data, previewMessage });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Gửi báo cáo giếng ngay lập tức (Test hoặc gửi chủ động)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { targetType, targetUserId, targetGroupId, date } = body;

    const data = await QuantracService.get24hWellData(date);
    const message = QuantracService.formatZaloMessage(data, zaloBot.config.wellSchedule?.wells);

    const results: { user?: any; group?: any } = {};

    // 1. Gửi qua Zalo cá nhân
    const shouldSendToUser = targetType === 'USER' || targetType === 'BOTH' || (!targetType && zaloBot.config.wellReport?.sendToUser);
    const userIdToSend = targetUserId || zaloBot.config.wellReport?.targetUserId;

    if (shouldSendToUser && userIdToSend) {
      results.user = await zaloBot.sendDirectMessage(userIdToSend, message);
    }

    // 2. Gửi vào Nhóm Zalo
    const shouldSendToGroup = targetType === 'GROUP' || targetType === 'BOTH' || (!targetType && zaloBot.config.wellReport?.sendToGroup);
    const groupIdToSend = targetGroupId || zaloBot.config.wellReport?.targetGroupId;

    if (shouldSendToGroup && groupIdToSend) {
      results.group = await zaloBot.sendGroupMessage(groupIdToSend, message);
    }

    if (!shouldSendToUser && !shouldSendToGroup) {
      return NextResponse.json(
        { success: false, error: 'Chưa chọn tài khoản cá nhân hoặc nhóm Zalo nào để gửi tin!' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã gửi báo cáo giếng thành công!',
      data,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
