/* eslint-disable */
import { google } from "googleapis";
import { NextResponse } from "next/server";
import path from "path";
import { Readable } from "stream";

// Fungsi untuk membuat folder dengan nama unik
async function createUniqueFolder(folderName: string, parentId: string, drive: any): Promise<string> {
  try {
    // Cek apakah folder dengan nama ini sudah ada
    const response = await drive.files.list({
      q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    });

    // Jika folder sudah ada, buat folder dengan nama baru
    if (response.data.files && response.data.files.length > 0) {
      // Generate nama unik dengan menambahkan (1), (2), dll.
      let newFolderName = folderName;
      let counter = 1;
      
      while (true) {
        newFolderName = `${folderName} (${counter})`;
        
        const checkResponse = await drive.files.list({
          q: `name='${newFolderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name)'
        });
        
        if (!checkResponse.data.files || checkResponse.data.files.length === 0) {
          break;
        }
        
        counter++;
      }
      
      folderName = newFolderName;
    }

    // Buat folder baru dengan nama yang sudah dipastikan unik
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });

    return folder.data.id;
  } catch (error) {
    console.error(`Error creating folder ${folderName}:`, error);
    throw error;
  }
}

// Check if a file already exists
async function checkFileExists(fileName: string, parentId: string, drive: any): Promise<{ exists: boolean, fileId?: string }> {
  try {
    const response = await drive.files.list({
      q: `name='${fileName}' and '${parentId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)'
    });

    if (response.data.files && response.data.files.length > 0) {
      return { exists: true, fileId: response.data.files[0].id };
    }

    return { exists: false };
  } catch (error) {
    console.error(`Error checking file existence ${fileName}:`, error);
    return { exists: false };
  }
}

// Fungsi untuk mengkonversi buffer menjadi stream
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable();
  readable._read = () => {}; // _read is required but you can noop it
  readable.push(buffer);
  readable.push(null);
  return readable;
}

export async function POST(req: Request) {
  try {
    console.log("=== UPLOAD API START ===");
    
    const formData = await req.formData();
    const folderId = (formData.get('folderId') as string) || 'root';
    const uploadMode = (formData.get('uploadMode') as string) || 'file';
    const replaceExisting = (formData.get('replaceExisting') as string) === 'true';
    
    console.log(`Upload mode: ${uploadMode}, target folder: ${folderId}, replace: ${replaceExisting}`);
    
    const files = formData.getAll('files').filter(file => file instanceof File) as File[];
    const relativePaths = formData.getAll('relativePaths').map(p => p.toString());
    
    console.log(`Found ${files.length} files`);
    
    if (files.length === 0) {
      return NextResponse.json({
        message: "No files found",
        totalFiles: 0,
        uploadedFiles: 0
      });
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
      console.log("Token refreshed successfully");
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
    
    const results = [];
    const folderCache = new Map(); // Cache folder IDs
    
    // First, create a mapping of folder structures
    const folderStructures = new Map();
    if (uploadMode === 'folder') {
      for (const relativePath of relativePaths) {
        if (!relativePath) continue;
        
        const dirPath = path.dirname(relativePath);
        if (dirPath && dirPath !== '.') {
          // Create a list of unique folder paths
          const pathParts = dirPath.split('/').filter(p => p.trim().length > 0);
          let currentPath = '';
          
          for (const part of pathParts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            
            if (!folderStructures.has(currentPath)) {
              folderStructures.set(currentPath, {
                name: part,
                parent: currentPath.split('/').slice(0, -1).join('/') || null,
                children: []
              });
            }
          }
        }
      }
    }
    
    // Create folders with unique names
    const rootFolderIds = new Map(); // Map to track root folder IDs
    
    if (uploadMode === 'folder' && folderStructures.size > 0) {
      // Sort folder paths by depth (shortest first)
      const sortedPaths = Array.from(folderStructures.keys()).sort((a, b) => {
        return a.split('/').length - b.split('/').length;
      });
      
      // Create folders from root to leaf
      for (const folderPath of sortedPaths) {
        const folderInfo = folderStructures.get(folderPath);
        let parentId = folderId;
        
        if (folderInfo.parent) {
          parentId = folderCache.get(folderInfo.parent) || folderId;
        }
        
        // Create folder with unique name
        const newFolderId = await createUniqueFolder(folderInfo.name, parentId, drive);
        folderCache.set(folderPath, newFolderId);
        
        // If this is a root level folder, add to rootFolderIds
        if (!folderInfo.parent) {
          rootFolderIds.set(folderInfo.name, newFolderId);
        }
      }
    }
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = relativePaths[i] || '';
      
      try {
        console.log(`Processing file: ${file.name}, path: ${relativePath}`);
        
        // Menentukan folder target
        let targetFolderId = folderId;
        let fileName = file.name;
        
        if (uploadMode === 'folder' && relativePath) {
          // Get proper filename from the path
          fileName = path.basename(relativePath);
          
          // Get folder path
          const dirPath = path.dirname(relativePath);
          
          if (dirPath && dirPath !== '.') {
            // Use the cached folder ID from our previously created structure
            targetFolderId = folderCache.get(dirPath);
            
            if (!targetFolderId) {
              // If no cached folder ID (shouldn't happen if structure is correct)
              console.log(`Folder path not found: ${dirPath}, using default folder`);
              // If it's a root level folder, get the first path component
              const rootFolder = relativePath.split('/')[0];
              targetFolderId = rootFolderIds.get(rootFolder) || folderId;
            }
          }
        }
        
        // Check if file already exists
        const fileExists = await checkFileExists(fileName, targetFolderId, drive);
        
        // Convert to buffer and create stream
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileStream = bufferToStream(buffer);
        
        if (fileExists.exists && replaceExisting) {
          // Replace existing file
          console.log(`Replacing existing file: ${fileName} (${fileExists.fileId})`);
          
          const res = await drive.files.update({
            fileId: fileExists.fileId as string,
            media: {
              mimeType: file.type || 'application/octet-stream',
              body: fileStream
            },
            fields: 'id,name'
          });
          
          results.push({
            id: res.data.id,
            name: fileName,
            path: relativePath,
            action: 'replaced',
            success: true
          });
        } else {
          // Upload as new file
          console.log(`Uploading file: ${fileName} to folder: ${targetFolderId}`);
          
          const res = await drive.files.create({
            requestBody: {
              name: fileName,
              parents: [targetFolderId]
            },
            media: {
              mimeType: file.type || 'application/octet-stream',
              body: fileStream
            },
            fields: 'id,name',
          });
          
          results.push({
            id: res.data.id,
            name: fileName,
            path: relativePath,
            action: fileExists.exists ? 'created_duplicate' : 'created',
            success: true
          });
        }
      } catch (error: any) {
        console.error(`Failed to upload ${file.name}:`, error.message);
        
        results.push({
          name: file.name,
          path: relativePath,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const replacedCount = results.filter(r => r.action === 'replaced').length;
    const newCount = results.filter(r => r.action === 'created').length;
    const duplicateCount = results.filter(r => r.action === 'created_duplicate').length;
    
    console.log(`=== UPLOAD API COMPLETE: ${successCount}/${files.length} files processed ===`);
    console.log(`=== ${replacedCount} replaced, ${newCount} new, ${duplicateCount} duplicates ===`);
    
    return NextResponse.json({
      message: `Successfully processed ${successCount} of ${files.length} files`,
      totalFiles: files.length,
      uploadedFiles: successCount,
      replacedFiles: replacedCount,
      newFiles: newCount,
      duplicateFiles: duplicateCount,
      results: results
    });
    
  } catch (error: any) {
    console.error("Server error:", error);
    return NextResponse.json({
      message: "Upload failed",
      error: error.message
    }, { status: 500 });
  }
}