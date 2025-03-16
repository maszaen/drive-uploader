// app/api/trash/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getTrashedFiles, restoreFromTrash } from "../../../lib/googleDrive";

export async function GET() {
  try {
    // Get trashed files
    const files = await getTrashedFiles();
    
    return NextResponse.json({ 
      files,
      currentFolder: { id: 'trash', name: "Trash" },
      folderPath: [{ id: 'trash', name: "Trash" }]
    });
  } catch (error) {
    console.error("Trash files error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat mengambil file sampah" }, { status: 500 });
  }
}

// Move to trash or restore from trash
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileId, action } = body;
    
    if (!fileId) {
      return NextResponse.json({ message: "File ID diperlukan" }, { status: 400 });
    }
    
    // Initialize Google Drive client
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
    
    if (action === "restore") {
      // Restore from trash
      await restoreFromTrash(fileId);
      return NextResponse.json({ message: "File dipulihkan dari sampah" });
    } else {
      // Move to trash
      await drive.files.update({
        fileId,
        requestBody: {
          trashed: true
        }
      });
      return NextResponse.json({ message: "File dipindahkan ke sampah" });
    }
  } catch (error) {
    console.error("Trash operation error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat operasi sampah" }, { status: 500 });
  }
}

// Empty trash (permanently delete all files in trash)
export async function DELETE() {
  try {
    // Initialize Google Drive client
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
    
    // Empty trash
    await drive.files.emptyTrash();
    
    return NextResponse.json({ message: "Sampah berhasil dikosongkan" });
  } catch (error) {
    console.error("Empty trash error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat mengosongkan sampah" }, { status: 500 });
  }
}