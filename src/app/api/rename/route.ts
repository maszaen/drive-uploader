/* eslint-disable */
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { fileId, newName } = await req.json();
    
    if (!fileId || !newName) {
      return NextResponse.json({
        message: "File ID and new name are required",
      }, { status: 400 });
    }
    
    // Setup OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
    
    // Refresh token secara eksplisit
    try {
      const tokenResponse = await oauth2Client.refreshAccessToken();
      const credentials = tokenResponse.credentials;
      oauth2Client.setCredentials(credentials);
    } catch (refreshError) {
      console.error("Failed to refresh token:", refreshError);
      return NextResponse.json({
        message: "Authentication failed",
        error: "Could not refresh access token"
      }, { status: 401 });
    }
    
    // Create drive client
    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client
    });
    
    // Check if file with new name already exists in the same folder
    try {
      // Get the parent folder of the file
      const fileResponse = await drive.files.get({
        fileId: fileId,
        fields: 'parents'
      });
      
      if (!fileResponse.data.parents || fileResponse.data.parents.length === 0) {
        return NextResponse.json({
          message: "Failed to get file parent",
        }, { status: 400 });
      }
      
      const parentId = fileResponse.data.parents[0];
      
      // Check if file with same name exists
      const duplicateResponse = await drive.files.list({
        q: `name='${newName}' and '${parentId}' in parents and trashed=false`,
        fields: 'files(id, name)',
      });
      
      if (duplicateResponse.data.files && duplicateResponse.data.files.length > 0) {
        return NextResponse.json({
          message: `A file or folder with name "${newName}" already exists`,
        }, { status: 409 });
      }
      
      // Update file name
      const response = await drive.files.update({
        fileId: fileId,
        requestBody: {
          name: newName
        },
        fields: 'id,name'
      });
      
      return NextResponse.json({
        message: "File renamed successfully",
        file: response.data
      });
    } catch (error: any) {
      console.error("Error renaming file:", error);
      return NextResponse.json({
        message: "Failed to rename file",
        error: error.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Server error:", error);
    return NextResponse.json({
      message: "Server error",
      error: error.message
    }, { status: 500 });
  }
}