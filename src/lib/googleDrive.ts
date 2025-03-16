// lib/googleDrive.ts
import fs from "fs";
import { google } from "googleapis";

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

export async function uploadFile(file: any, parentFolderId: string) {
  const fileMetadata = {
    name: file.originalFilename,
    parents: [parentFolderId]
  };

  const media = {
    mimeType: file.mimetype,
    body: fs.createReadStream(file.filepath)
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id"
  });

  return response.data;
}

export async function createFolderIfNotExist(folderName: string, parentFolderId: string): Promise<string> {
  // Cek apakah folder sudah ada
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)"
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  } else {
    // Buat folder baru
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId]
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id"
    });

    return folder.data.id!;
  }
}

export async function listFilesInFolder(folderId: string) {
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType, size, modifiedTime)",
      orderBy: "folder,name"
    });
    return res.data.files;
  } catch (error) {
    console.error('Error listing files in folder:', error);
    throw error;
  }
}

async function getAuth() {
  return oauth2Client;
}

export async function getFolderDetails(folderId: string) {
  try {
    const auth = await getAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, parents'
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting folder details:', error);
    throw error;
  }
}

export async function isDescendantOfBase(
  folderId: string, 
  baseFolderId: string, 
  visitedFolders = new Set<string>()
): Promise<boolean> {
  try {
    // Base case: folder is the base folder
    if (folderId === baseFolderId) return true;
    
    // Stop jika kita sudah mengunjungi folder ini (mencegah infinite loop)
    if (visitedFolders.has(folderId)) return false;
    
    // Tandai folder ini sebagai sudah dikunjungi
    visitedFolders.add(folderId);
    
    const folder = await getFolderDetails(folderId);
    
    // Jika tidak memiliki parent, berarti bukan turunan
    if (!folder.parents || folder.parents.length === 0) return false;
    
    // Jika parent adalah folder dasar, return true
    if (folder.parents.includes(baseFolderId)) return true;
    
    // Cek secara rekursif parent dari folder ini
    for (const parentId of folder.parents) {
      const isDescendant = await isDescendantOfBase(
        parentId, 
        baseFolderId,
        visitedFolders // Pass the same Set to avoid checking the same folder twice
      );
      if (isDescendant) return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking folder ancestry:', error);
    return false;
  }
}

export async function getFolderPath(
  folderId: string, 
  baseFolderId: string | null = null, 
  visitedFolders = new Set<string>()
): Promise<{ id: string, name: string }[]> {
  try {
    const path: { id: string, name: string }[] = [];
    
    // Stop jika kita sudah mengunjungi folder ini (mencegah infinite loop)
    if (visitedFolders.has(folderId)) return path;
    
    // Tandai folder ini sebagai sudah dikunjungi
    visitedFolders.add(folderId);
    
    let currentId = folderId;
    
    // Loop sampai mencapai folder dasar atau root
    while (currentId && (baseFolderId === null || currentId !== baseFolderId)) {
      const folder = await getFolderDetails(currentId);
      if (folder.id && folder.name) {
        path.unshift({ id: folder.id, name: folder.name });
      }
      
      // Jika tidak ada parent atau lebih dari satu, hentikan
      if (!folder.parents || folder.parents.length === 0) break;
      
      currentId = folder.parents[0];
      
      // Cek circular reference
      if (visitedFolders.has(currentId)) break;
      visitedFolders.add(currentId);
    }
    
    // Tambahkan folder dasar ke path jika di-supply
    if (baseFolderId) {
      const baseFolder = await getFolderDetails(baseFolderId);
      if (baseFolder.id && baseFolder.name) {
        path.unshift({ id: baseFolder.id, name: baseFolder.name });
      }
    }
    
    return path;
  } catch (error) {
    console.error('Error getting folder path:', error);
    return [];
  }
}

// New functions for sidebar functionality

// Get recently modified files
export async function getRecentFiles(maxResults = 50) {
  try {
    const response = await drive.files.list({
      orderBy: "modifiedTime desc",
      pageSize: maxResults,
      fields: "files(id, name, mimeType, size, modifiedTime, parents)",
      q: "trashed = false"
    });
    
    return response.data.files || [];
  } catch (error) {
    console.error("Error getting recent files:", error);
    throw error;
  }
}

// Get starred/important files
export async function getStarredFiles() {
  try {
    const response = await drive.files.list({
      q: "starred = true and trashed = false",
      fields: "files(id, name, mimeType, size, modifiedTime, parents, starred)",
      pageSize: 100
    });
    
    return response.data.files || [];
  } catch (error) {
    console.error("Error getting starred files:", error);
    throw error;
  }
}

// Toggle starred status
export async function toggleStarred(fileId: string, starred: boolean) {
  try {
    await drive.files.update({
      fileId,
      requestBody: {
        starred
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error updating star status:", error);
    throw error;
  }
}

// Get trashed files
export async function getTrashedFiles() {
  try {
    const response = await drive.files.list({
      q: "trashed = true",
      fields: "files(id, name, mimeType, size, modifiedTime, parents)",
      pageSize: 100
    });
    
    return response.data.files || [];
  } catch (error) {
    console.error("Error getting trashed files:", error);
    throw error;
  }
}

// Restore file from trash
export async function restoreFromTrash(fileId: string) {
  try {
    await drive.files.update({
      fileId,
      requestBody: {
        trashed: false
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error restoring from trash:", error);
    throw error;
  }
}

// Get files shared with me
export async function getSharedFiles() {
  try {
    const response = await drive.files.list({
      q: "sharedWithMe = true and trashed = false",
      fields: "files(id, name, mimeType, size, modifiedTime, parents, sharingUser)",
      pageSize: 100
    });
    
    return response.data.files || [];
  } catch (error) {
    console.error("Error getting shared files:", error);
    throw error;
  }
}

// Get drive storage quota
export async function getDriveStorageQuota() {
  try {
    const response = await drive.about.get({
      fields: "storageQuota"
    });
    
    return response.data.storageQuota || {
      limit: 0,
      usage: 0,
      usageInDrive: 0,
      usageInDriveTrash: 0
    };
  } catch (error) {
    console.error("Error getting storage quota:", error);
    throw error;
  }
}