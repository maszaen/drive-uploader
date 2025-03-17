/* eslint-disable */
import { NextResponse } from "next/server";
import { getStarredFiles, toggleStarred } from "../../../lib/googleDrive";

export async function GET() {
  try {

    const files = await getStarredFiles();

    return NextResponse.json({ 
      files,
      currentFolder: { id: 'starred', name: "Starred" },
      folderPath: [{ id: 'starred', name: "Starred" }]
    });
  } catch (error) {

    return NextResponse.json({ message: "Terjadi kesalahan saat mengambil file berbintang" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileId, starred } = body;

    if (!fileId) {
      return NextResponse.json({ message: "File ID diperlukan" }, { status: 400 });
    }

    await toggleStarred(fileId, starred);

    return NextResponse.json({ 
      message: starred ? "File ditandai berbintang" : "Tanda bintang dihapus",
      success: true
    });
  } catch (error) {

    return NextResponse.json({ message: "Terjadi kesalahan saat mengubah status bintang" }, { status: 500 });
  }
}