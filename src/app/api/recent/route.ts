// app/api/recent/route.ts
import { NextResponse } from "next/server";
import { getRecentFiles } from "../../../lib/googleDrive";

export async function GET(req: Request) {
  try {
    // Get optional limit parameter
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    
    // Get recent files
    const files = await getRecentFiles(limit);
    
    return NextResponse.json({ 
      files,
      currentFolder: { id: 'recent', name: "Recent" },
      folderPath: [{ id: 'recent', name: "Recent" }]
    });
  } catch (error) {
    console.error("Recent files error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat mengambil file terbaru" }, { status: 500 });
  }
}