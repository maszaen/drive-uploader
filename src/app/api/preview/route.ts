/* eslint-disable */
import { google } from "googleapis";
import { NextResponse } from "next/server";

interface PreviewContent {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  webViewLink?: string | null;
  previewUrl?: string | null;
  thumbnailUrl?: string | null;
  textContent?: string | null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json(
        { message: "File ID diperlukan" },
        { status: 400 },
      );
    }

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

    const fileMetadata = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, webViewLink, thumbnailLink, webContentLink",
    });

    const previewData: PreviewContent = {};

    if (fileMetadata.data.id) previewData.id = fileMetadata.data.id;
    if (fileMetadata.data.name) previewData.name = fileMetadata.data.name;
    if (fileMetadata.data.mimeType)
      previewData.mimeType = fileMetadata.data.mimeType;
    if (fileMetadata.data.webViewLink)
      previewData.webViewLink = fileMetadata.data.webViewLink;

    if (
      fileMetadata.data.mimeType?.includes("google-apps.document") ||
      fileMetadata.data.mimeType?.includes("google-apps.spreadsheet") ||
      fileMetadata.data.mimeType?.includes("google-apps.presentation")
    ) {
      if (fileMetadata.data.webViewLink) {
        previewData.previewUrl = fileMetadata.data.webViewLink;
      }
    } else if (
      fileMetadata.data.mimeType?.includes("image") ||
      fileMetadata.data.mimeType?.includes("pdf")
    ) {
      if (fileMetadata.data.webContentLink) {
        previewData.previewUrl = fileMetadata.data.webContentLink;
      } else {
        previewData.previewUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    } else if (fileMetadata.data.thumbnailLink) {
      previewData.thumbnailUrl = fileMetadata.data.thumbnailLink;
    }

    if (
      fileMetadata.data.mimeType?.includes("text") ||
      fileMetadata.data.mimeType?.includes("json") ||
      fileMetadata.data.mimeType?.includes("javascript") ||
      fileMetadata.data.mimeType?.includes("css") ||
      fileMetadata.data.mimeType?.includes("html")
    ) {
      try {
        const response = await drive.files.get(
          {
            fileId,
            alt: "media",
          },
          { responseType: "text" },
        );

        if (response.data) {
          previewData.textContent =
            typeof response.data === "string"
              ? response.data
              : JSON.stringify(response.data);
        }
      } catch (error) {
        // Silently catch the error
        // console.error(error);
      }
    }

    return NextResponse.json(previewData);
  } catch (error) {
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mendapatkan preview file" },
      { status: 500 },
    );
  }
}
