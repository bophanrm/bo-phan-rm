import { NextResponse } from 'next/server';
import { GoogleDriveService } from '@/server/googleDrive';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await GoogleDriveService.executeBackup({
      customConfig: body.config,
      snapshotData: body.snapshotData,
      initiatedBy: body.initiatedBy || 'Quản trị viên thao tác trực tiếp',
    });

    return NextResponse.json({
      ...result,
      message: `Đã sao lưu thành công file "${result.backupFile.name}" lên Google Drive!`,
    });
  } catch (error: any) {
    console.error('[API /api/drive/sync error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Sao lưu lên Google Drive thất bại',
      },
      { status: 500 }
    );
  }
}
