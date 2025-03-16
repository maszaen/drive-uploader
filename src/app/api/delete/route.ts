// app/api/delete/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json({ message: "File ID diperlukan" }, { status: 400 });
    }

    // Initialize Google Drive API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client
    });

    const fileIds = fileId.includes(",") ? fileId.split(",") : [fileId];

    let errorCount = 0;

    for (const id of fileIds) {
      try {
        await drive.files.delete({ fileId: id });
      } catch (error) {
        console.error(`Error deleting file ${id}:`, error);
        errorCount++;
      }
    }

    if (errorCount === fileIds.length) {
      return NextResponse.json({ message: "Gagal menghapus semua item" }, { status: 500 });
    } else if (errorCount > 0) {
      return NextResponse.json({
        message: `Berhasil menghapus ${fileIds.length - errorCount} dari ${fileIds.length} item`
      });
    } else {
      return NextResponse.json({ message: "Semua item berhasil dihapus" });
    }
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat menghapus" }, { status: 500 });
  }
}
