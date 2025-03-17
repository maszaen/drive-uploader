
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
    const { fileId, destinationFolderId } = body;

    if (!fileId || !destinationFolderId) {
      return NextResponse.json({ message: "File ID dan Folder tujuan diperlukan" }, { status: 400 });
    }

    const isFileDescendant = await isDescendantOfBase(fileId, baseFolderId);
    const isDestinationDescendant = await isDescendantOfBase(destinationFolderId, baseFolderId);

    if ((!isFileDescendant && fileId !== baseFolderId) || 
        (!isDestinationDescendant && destinationFolderId !== baseFolderId)) {
      return NextResponse.json({ message: "Operasi tidak diizinkan" }, { status: 403 });
    }

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

    const file = await drive.files.get({
      fileId: fileId,
      fields: 'parents'
    });

    await drive.files.update({
      fileId: fileId,
      removeParents: file.data.parents?.join(','),
      addParents: destinationFolderId,
      fields: 'id, parents'
    });

    return NextResponse.json({ message: "Item berhasil dipindahkan" });
  } catch (error) {

    return NextResponse.json({ message: "Terjadi kesalahan saat memindahkan" }, { status: 500 });
  }
}