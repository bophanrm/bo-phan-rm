import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await zaloBot.updateConfig(body);
    return NextResponse.json({ success: true, config: zaloBot.config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
