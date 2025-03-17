
import { google } from "googleapis";
import { NextResponse } from "next/server";

const activeOperations = new Map();

export async function POST(req: Request) {
  try {

    const body = await req.json();
    const { fileId, destinationFolderId, operationId } = body;

    if (!fileId) {
      return NextResponse.json({ message: 'File ID diperlukan' }, { status: 400 });
    }

    const operationKey = operationId || `${fileId}-${Date.now()}`;
    if (activeOperations.has(operationKey)) {

      return NextResponse.json({ 
        message: 'Operasi sedang berjalan', 
        duplicate: true 
      });
    }

    activeOperations.set(operationKey, new Date());

    try {

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      const drive = google.drive({
        version: 'v3',
        auth: oauth2Client
      });

      const fileResponse = await drive.files.get({
        fileId: fileId,
        fields: 'name,mimeType'
      });

      const fileName = fileResponse.data.name;

      const requestBody: any = {
        name: `Copy of ${fileName}`
      };

      if (destinationFolderId && 
          destinationFolderId !== '' && 
          destinationFolderId !== 'null' && 
          destinationFolderId !== 'undefined') {
        requestBody.parents = [destinationFolderId];

      } else {

      }

      const response = await drive.files.copy({
        fileId: fileId,
        requestBody: requestBody,
        fields: 'id,name,mimeType,size,modifiedTime,parents'
      });

;

      return NextResponse.json({ 
        message: 'File berhasil disalin',
        file: response.data,
        operationId: operationKey
      });
    } finally {

      setTimeout(() => {
        activeOperations.delete(operationKey);
      }, 5000);
    }

  } catch (error) {

    return NextResponse.json({ 
      message: 'Gagal menyalin file', 
      error: (error as Error).message 
    }, { status: 500 });
  }
}