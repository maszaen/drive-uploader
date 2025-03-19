/* eslint-disable */
import { google } from "googleapis";
import { NextResponse } from "next/server";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json(
        { message: "File ID is required" },
        { status: 400 },
      );
    }

    const permissions = await drive.permissions.list({
      fileId: fileId,
      fields: "permissions(id,type,role)",
    });

    if (permissions.data.permissions) {
      for (const permission of permissions.data.permissions) {
        if (permission.type === "anyone" && permission.id) {
          await drive.permissions.delete({
            fileId: fileId,
            permissionId: permission.id,
          });
        }
      }
    }

    return NextResponse.json({
      message: "Sharing stopped successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to stop sharing",
      },
      { status: 500 },
    );
  }
}
