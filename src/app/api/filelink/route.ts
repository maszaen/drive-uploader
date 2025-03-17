
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {

    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ message: "File ID diperlukan" }, { status: 400 });
    }

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

    const fileMetadata = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, webViewLink, webContentLink"
    });

    let fileUrl = "";
    const mimeType = fileMetadata.data.mimeType || "";

    if (
      mimeType.includes('google-apps.document') || 
      mimeType.includes('google-apps.spreadsheet') || 
      mimeType.includes('google-apps.presentation')
    ) {
      fileUrl = fileMetadata.data.webViewLink || '';
    } 

    else {
      fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
    }

    return NextResponse.json({ fileUrl });
  } catch (error) {

    return NextResponse.json({ message: "Terjadi kesalahan saat mendapatkan link file" }, { status: 500 });
  }
}