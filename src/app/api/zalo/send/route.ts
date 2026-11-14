import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';

export async function POST(req: Request) {
  try {
    const { groupId, message, type } = await req.json();
    const targetGroupId = groupId || zaloBot.config.groupId;

    if (!targetGroupId) {
      return NextResponse.json(
        { success: false, error: 'Chưa cấu hình hoặc chọn nhóm Zalo để gửi tin!' },
        { status: 400 }
      );
    }

    // Nếu không phải tin nhắn TEST thì phải tuân thủ triệt để cài đặt BẬT/TẮT của người dùng
    if (type !== 'TEST') {
      // 1. Kiểm tra Công Tắc Tổng (Master Switch)
      if (zaloBot.config.enabled === false) {
        console.log('[ZaloBot] ĐÃ CHẶN GỬI TIN: Toàn bộ tính năng gửi tin Zalo đang TẮT (enabled = false)');
        return NextResponse.json({ success: true, skipped: true, reason: 'Bot Zalo đang tạm tắt' });
      }

      // 2. Kiểm tra theo từng loại thông báo
      if (type === 'NEW_TASK' && zaloBot.config.notifyOnNewTask === false) {
        console.log('[ZaloBot] ĐÃ CHẶN GỬI TIN: Đã tắt thông báo việc mới (notifyOnNewTask = false)');
        return NextResponse.json({ success: true, skipped: true, reason: 'Thông báo việc mới đang tắt' });
      }

      if (type === 'DAILY_REMINDER' && zaloBot.config.notifyDailyShiftReminder === false) {
        console.log('[ZaloBot] ĐÃ CHẶN GỬI TIN: Đã tắt nhắc nhở ca trực trước hết ca 60 phút (notifyDailyShiftReminder = false)');
        return NextResponse.json({ success: true, skipped: true, reason: 'Nhắc nhở ca trực đang tắt' });
      }

      if (type === 'PROJECT_REMINDER' && zaloBot.config.notifyProjectDeadline === false) {
        console.log('[ZaloBot] ĐÃ CHẶN GỬI TIN: Đã tắt nhắc hạn dự án dài hạn (notifyProjectDeadline = false)');
        return NextResponse.json({ success: true, skipped: true, reason: 'Nhắc nhở dự án đang tắt' });
      }
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nội dung tin nhắn không hợp lệ!' },
        { status: 400 }
      );
    }

    const result = await zaloBot.sendGroupMessage(targetGroupId, message);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
