// app/api/filelink/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // Get the file ID from query parameters
    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');
    
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

    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, webViewLink, webContentLink"
    });
    
    // Determine the appropriate URL
    let fileUrl = "";
    const mimeType = fileMetadata.data.mimeType || "";
    
    // Google Docs, Sheets, Slides dll gunakan webViewLink
    if (
      mimeType.includes('google-apps.document') || 
      mimeType.includes('google-apps.spreadsheet') || 
      mimeType.includes('google-apps.presentation')
    ) {
      fileUrl = fileMetadata.data.webViewLink || '';
    } 
    // Untuk file lainnya, gunakan format URL preview
    else {
      fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
    }

    return NextResponse.json({ fileUrl });
  } catch (error) {
    console.error("File link error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat mendapatkan link file" }, { status: 500 });
  }
}