// app/api/create-folder/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { folderName, parentFolderId } = body;

    if (!folderName) {
      return NextResponse.json({ message: "Nama folder diperlukan" }, { status: 400 });
    }

    // Jika tidak ada parentFolderId, gunakan "root" (folder utama di Google Drive)
    const targetFolderId = parentFolderId || "root";

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

    // Create the folder
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [targetFolderId]
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id, name"
    });

    return NextResponse.json({ 
      message: "Folder berhasil dibuat", 
      folder: folder.data 
    });
  } catch (error) {
    console.error("Create folder error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat membuat folder" }, { status: 500 });
  }
}
