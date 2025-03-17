
import { NextResponse } from "next/server";
import { getSharedFiles } from "../../../lib/googleDrive";

export async function GET() {
  try {

    const files = await getSharedFiles();

    return NextResponse.json({ 
      files,
      currentFolder: { id: 'shared', name: "Shared with me" },
      folderPath: [{ id: 'shared', name: "Shared with me" }]
    });
  } catch (error) {

    return NextResponse.json({ message: "Terjadi kesalahan saat mengambil file yang dibagikan" }, { status: 500 });
  }
}