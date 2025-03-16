// app/api/upload/route.ts (Versi untuk Vercel)
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { createFolderIfNotExist } from "../../../lib/googleDrive";

export async function POST(req: Request) {
  try {
    // Ambil file data dari request
    const formData = await req.formData();
    
    // Dapatkan folder ID target
    const folderId = formData.get('folderId') as string || 'root';
    const uploadMode = formData.get('uploadMode') as string || 'file';
    
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
    
    const uploadResults = [];
    
    // Ambil semua file dari formData
    const files = formData.getAll('files');
    const relativePaths = uploadMode === 'folder' 
      ? formData.getAll('relativePaths').map(p => p.toString()) 
      : [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as File;
      let parentId = folderId;
      
      // Jika folder upload, buat struktur folder yang diperlukan
      if (uploadMode === 'folder' && i < relativePaths.length) {
        const relativePath = relativePaths[i];
        const pathParts = relativePath.split('/').slice(0, -1); // Hapus nama file
        
        for (const part of pathParts) {
          if (part) {
            parentId = await createFolderIfNotExist(part, parentId);
          }
        }
      }
      
      // Upload file langsung ke Google Drive
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const fileMetadata = {
        name: file.name,
        parents: [parentId]
      };
      
      const media = {
        mimeType: file.type,
        body: buffer
      };
      
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id,name'
      });
      
      uploadResults.push(response.data);
    }
    
    return NextResponse.json({ 
      message: "Upload berhasil", 
      results: uploadResults 
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat upload" }, { status: 500 });
  }
}