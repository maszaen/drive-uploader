// app/api/storage/route.ts
import { NextResponse } from "next/server";
import { getDriveStorageQuota } from "../../../lib/googleDrive";

export async function GET() {
  try {
    // Get drive storage quota
    const quota = await getDriveStorageQuota();
    
    return NextResponse.json({ quota });
  } catch (error) {
    console.error("Storage quota error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat mengambil informasi penyimpanan" }, { status: 500 });
  }
}