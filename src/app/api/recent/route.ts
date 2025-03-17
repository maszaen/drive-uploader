/* eslint-disable */
import { NextResponse } from "next/server";
import { getRecentFiles } from "../../../lib/googleDrive";

export async function GET(req: Request) {
  try {

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const files = await getRecentFiles(limit);

    return NextResponse.json({ 
      files,
      currentFolder: { id: 'recent', name: "Recent" },
      folderPath: [{ id: 'recent', name: "Recent" }]
    });
  } catch (error) {

    return NextResponse.json({ message: "Terjadi kesalahan saat mengambil file terbaru" }, { status: 500 });
  }
}