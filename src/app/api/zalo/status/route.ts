import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';

export async function GET() {
  try {
    let groups: any[] = [];
    if (zaloBot.status === 'CONNECTED') {
      groups = await zaloBot.getGroups();
    }

    return NextResponse.json({
      status: zaloBot.status,
      qrCode: zaloBot.qrCodeBase64,
      userInfo: zaloBot.userInfo,
      config: zaloBot.config,
      errorMessage: zaloBot.errorMessage,
      groups,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
