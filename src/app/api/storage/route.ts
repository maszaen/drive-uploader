
import { NextResponse } from "next/server";
import { getDriveStorageQuota } from "../../../lib/googleDrive";

export async function GET() {
  try {

    const quota = await getDriveStorageQuota();

    return NextResponse.json({ quota });
  } catch (error) {

    return NextResponse.json({ message: "Terjadi kesalahan saat mengambil informasi penyimpanan" }, { status: 500 });
  }
}