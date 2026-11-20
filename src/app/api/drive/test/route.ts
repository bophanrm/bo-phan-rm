import { NextResponse } from 'next/server';
import { GoogleDriveService } from '@/server/googleDrive';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await GoogleDriveService.testConnection(body);
    return NextResponse.json({ ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Kiểm tra kết nối thất bại' }, { status: 400 });
  }
}
