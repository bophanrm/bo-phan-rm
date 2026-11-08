import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';

export async function POST() {
  try {
    const res = await zaloBot.startQRLogin();
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
