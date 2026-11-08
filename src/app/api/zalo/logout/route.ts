import { NextResponse } from 'next/server';
import { zaloBot } from '@/server/zaloBot';

export async function POST() {
  try {
    zaloBot.logout();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
