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
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        {
          message: "Invalid content type, expected application/json",
        },
        { status: 400 },
      );
    }

    const clonedRequest = request.clone();

    const bodyText = await request.text();

    if (!bodyText || bodyText.trim() === "") {
      return NextResponse.json(
        {
          message: "Empty request body",
        },
        { status: 400 },
      );
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      return NextResponse.json(
        {
          message: "Invalid JSON in request body",
        },
        { status: 400 },
      );
    }

    const { fileId, name } = body;

    if (!fileId) {
      return NextResponse.json(
        {
          message: "File ID is required",
        },
        { status: 400 },
      );
    }

    const permission = {
      type: "anyone",
      role: "reader",
    };

    await drive.permissions.create({
      fileId: fileId,
      requestBody: permission,
    });

    const file = await drive.files.get({
      fileId: fileId,
      fields: "id, name, shared",
    });

    return NextResponse.json({
      message: `"${name}" shared successfully`,
      file: file.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to share file",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
