/* eslint-disable */
import { NextResponse } from "next/server";
import { getFolderDetails, getFolderPath, listFilesInFolder } from "../../../lib/googleDrive";

export async function GET(req: Request) {
  try {

    const url = new URL(req.url);
    const folderId = url.searchParams.get('folderId');

    const files = await listFilesInFolder(folderId || 'root');

    const currentFolder = folderId ? 
      await getFolderDetails(folderId) : 
      { id: 'root', name: "My Drive" };

    const folderPath = folderId ? 
      await getFolderPath(folderId, null) : 
      [{ id: 'root', name: "My Drive" }];

    return NextResponse.json({ 
      files,
      currentFolder,
      folderPath
    });
  } catch (error) {

    return NextResponse.json({ message: "Terjadi kesalahan saat mengambil data" }, { status: 500 });
  }
}