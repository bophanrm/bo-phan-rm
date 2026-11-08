import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';

export async function POST(req: Request) {
  try {
    const { groupId, message } = await req.json();
    const targetGroupId = groupId || zaloBot.config.groupId;

    if (!targetGroupId) {
      return NextResponse.json(
        { success: false, error: 'Chưa cấu hình hoặc chọn nhóm Zalo để gửi tin!' },
        { status: 400 }
      );
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
