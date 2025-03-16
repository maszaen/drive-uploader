// app/api/delete/route.ts
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { isDescendantOfBase } from "../../../lib/googleDrive";

export async function POST(req: Request) {
  try {
    const baseFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!baseFolderId) {
      return NextResponse.json({ message: "Google Drive folder ID tidak dikonfigurasi" }, { status: 500 });
    }

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

    // Handle batch delete or single delete
    if (fileId.includes(',')) {
      // Batch delete (multiple file IDs separated by commas)
      const fileIds = fileId.split(',');
      let errorCount = 0;
      
      for (const id of fileIds) {
        try {
          // Verify this file/folder is within our base folder for security
          const isDescendant = await isDescendantOfBase(id, baseFolderId);
          if (!isDescendant && id !== baseFolderId) {
            console.warn(`Skipping delete for file ${id} - not a descendant of base folder`);
            errorCount++;
            continue;
          }
          
          // Delete the file/folder
          await drive.files.delete({
            fileId: id
          });
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
    } else {
      // Single file delete
      // Verify this file/folder is within our base folder for security
      const isDescendant = await isDescendantOfBase(fileId, baseFolderId);
      if (!isDescendant && fileId !== baseFolderId) {
        return NextResponse.json({ message: "Tidak diizinkan menghapus file ini" }, { status: 403 });
      }

      // Delete the file/folder
      await drive.files.delete({
        fileId: fileId
      });

      return NextResponse.json({ message: "Item berhasil dihapus" });
    }
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat menghapus" }, { status: 500 });
  }
}