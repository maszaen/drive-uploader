// app/api/list/route.ts
import { NextResponse } from "next/server";
import { getFolderDetails, getFolderPath, listFilesInFolder } from "../../../lib/googleDrive";

export async function GET(req: Request) {
  const baseFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!baseFolderId) {
    return NextResponse.json({ message: "Google Drive folder ID tidak dikonfigurasi" }, { status: 500 });
  }

  try {
    // Get the folder ID and password from query parameters
    const url = new URL(req.url);
    const folderId = url.searchParams.get('folderId') || baseFolderId;
    const password = url.searchParams.get('password') || '';
    
    // Verify password
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json({ message: "Invalid password" }, { status: 401 });
    }
    
    // List files in the specified folder
    const files = await listFilesInFolder(folderId);
    
    // Get current folder details
    const currentFolder = folderId !== baseFolderId 
      ? await getFolderDetails(folderId)
      : { id: baseFolderId, name: "Root" };
    
    // Get folder path for navigation breadcrumbs
    const folderPath = folderId !== baseFolderId
      ? await getFolderPath(folderId, baseFolderId)
      : [{ id: baseFolderId, name: "Root" }];
    
    return NextResponse.json({ 
      files,
      currentFolder,
      folderPath
    });
  } catch (error) {
    console.error("List files error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat mengambil data" }, { status: 500 });
  }
}