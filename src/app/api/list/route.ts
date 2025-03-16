// app/api/list/route.ts
import { NextResponse } from "next/server";
import { getFolderDetails, getFolderPath, listFilesInFolder } from "../../../lib/googleDrive";

export async function GET(req: Request) {
  try {
    // Get the folder ID from query parameters
    const url = new URL(req.url);
    const folderId = url.searchParams.get('folderId');
    
    // If no folderId is provided, we'll list the root of Google Drive
    // Instead of using a specific folder as the base
    const files = await listFilesInFolder(folderId || 'root');
    
    // Get current folder details
    const currentFolder = folderId ? 
      await getFolderDetails(folderId) : 
      { id: 'root', name: "My Drive" };
    
    // Get folder path for navigation breadcrumbs
    // Pass null as the second parameter to get the full path up to the root
    const folderPath = folderId ? 
      await getFolderPath(folderId, null) : 
      [{ id: 'root', name: "My Drive" }];
    
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