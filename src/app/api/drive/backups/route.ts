import { NextResponse } from 'next/server';
import { GoogleDriveService } from '@/server/googleDrive';

export async function GET() {
  try {
    const files = await GoogleDriveService.listBackups();
    return NextResponse.json({ success: true, files });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
