import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';
import { QuantracService } from '@/server/quantracService';

// GET: Tính toán lịch mở giếng để xem trước (Preview)
export async function GET(req: Request) {
  try {
    await zaloBot.ensureConnected();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;
    const customWellsRaw = searchParams.get('wells');

    let wellConfigs = zaloBot.config.wellSchedule?.wells;
    if (customWellsRaw) {
      try {
        wellConfigs = JSON.parse(customWellsRaw);
      } catch (e) {
        // ignore
      }
    }

    const data = await QuantracService.calculateWellSchedule(wellConfigs, date);
    const previewMessage = QuantracService.formatWellScheduleMessage(data);

    return NextResponse.json({ success: true, data, previewMessage });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Gửi thử hoặc gửi chủ động Lịch mở giếng vào Zalo
export async function POST(req: Request) {
  try {
    await zaloBot.ensureConnected();
    const body = await req.json().catch(() => ({}));
    const { targetType, targetUserId, targetGroupId, wells, date } = body;

    const wellConfigs = wells || zaloBot.config.wellSchedule?.wells;
    const data = await QuantracService.calculateWellSchedule(wellConfigs, date);
    const message = QuantracService.formatWellScheduleMessage(data);

    const results: { user?: any; group?: any } = {};

    // 1. Gửi qua Zalo cá nhân
    const shouldSendToUser =
      targetType === 'USER' || targetType === 'BOTH' || (!targetType && zaloBot.config.wellSchedule?.sendToUser);
    const userIdToSend = targetUserId || zaloBot.config.wellSchedule?.targetUserId;

    if (shouldSendToUser && userIdToSend) {
      results.user = await zaloBot.sendDirectMessage(userIdToSend, message);
    }

    // 2. Gửi vào Nhóm Zalo
    const shouldSendToGroup =
      targetType === 'GROUP' || targetType === 'BOTH' || (!targetType && zaloBot.config.wellSchedule?.sendToGroup);
    const groupIdToSend = targetGroupId || zaloBot.config.wellSchedule?.targetGroupId;

    if (shouldSendToGroup && groupIdToSend) {
      results.group = await zaloBot.sendGroupMessage(groupIdToSend, message);
    }

    if (!shouldSendToUser && !shouldSendToGroup) {
      return NextResponse.json(
        { success: false, error: 'Chưa chọn tài khoản cá nhân hoặc nhóm Zalo nào để nhận lịch mở giếng!' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã gửi lịch mở giếng thành công!',
      data,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
