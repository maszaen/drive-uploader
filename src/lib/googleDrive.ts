/* eslint-disable */
import fs from "fs";
import { google } from "googleapis";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function uploadFile(file: any, parentFolderId: string) {
  const fileMetadata = {
    name: file.originalFilename,
    parents: [parentFolderId],
  };

  const media = {
    mimeType: file.mimetype,
    body: fs.createReadStream(file.filepath),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id",
  });

  return response.data;
}

export async function createFolderIfNotExist(
  folderName: string,
  parentFolderId: string,
): Promise<string> {
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  } else {
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    };

    const folder = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id",
    });

    return folder.data.id!;
  }
}

export async function listFilesInFolder(folderId: string) {
  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields:
        "files(id, name, mimeType, size, modifiedTime, starred, shared, owners(displayName, emailAddress))",
      orderBy: "folder,name",
    });
    return res.data.files;
  } catch (error) {
    throw error;
  }
}

async function getAuth() {
  return oauth2Client;
}

export async function getFolderDetails(folderId: string) {
  try {
    const auth = await getAuth();
    const drive = google.drive({ version: "v3", auth });

    const response = await drive.files.get({
      fileId: folderId,
      fields: "id, name, parents",
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function isDescendantOfBase(
  folderId: string,
  baseFolderId: string,
  visitedFolders = new Set<string>(),
): Promise<boolean> {
  try {
    if (folderId === baseFolderId) return true;

    if (visitedFolders.has(folderId)) return false;

    visitedFolders.add(folderId);

    const folder = await getFolderDetails(folderId);

    if (!folder.parents || folder.parents.length === 0) return false;

    if (folder.parents.includes(baseFolderId)) return true;

    for (const parentId of folder.parents) {
      const isDescendant = await isDescendantOfBase(
        parentId,
        baseFolderId,
        visitedFolders,
      );
      if (isDescendant) return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

export async function getFolderPath(
  folderId: string,
  baseFolderId: string | null = null,
  visitedFolders = new Set<string>(),
): Promise<{ id: string; name: string }[]> {
  try {
    const path: { id: string; name: string }[] = [];

    if (visitedFolders.has(folderId)) return path;

    visitedFolders.add(folderId);

    let currentId = folderId;

    while (currentId && (baseFolderId === null || currentId !== baseFolderId)) {
      const folder = await getFolderDetails(currentId);
      if (folder.id && folder.name) {
        path.unshift({ id: folder.id, name: folder.name });
      }

      if (!folder.parents || folder.parents.length === 0) break;

      currentId = folder.parents[0];

      if (visitedFolders.has(currentId)) break;
      visitedFolders.add(currentId);
    }

    if (baseFolderId) {
      const baseFolder = await getFolderDetails(baseFolderId);
      if (baseFolder.id && baseFolder.name) {
        path.unshift({ id: baseFolder.id, name: baseFolder.name });
      }
    }

    return path;
  } catch (error) {
    return [];
  }
}

export async function getRecentFiles(maxResults = 50) {
  try {
    const response = await drive.files.list({
      orderBy: "modifiedTime desc",
      pageSize: maxResults,
      fields: "files(id, name, mimeType, size, modifiedTime, parents)",
      q: "trashed = false",
    });

    return response.data.files || [];
  } catch (error) {
    throw error;
  }
}

export async function getStarredFiles() {
  try {
    const response = await drive.files.list({
      q: "starred = true and trashed = false",
      fields: "files(id, name, mimeType, size, modifiedTime, parents, starred)",
      pageSize: 100,
    });

    return response.data.files || [];
  } catch (error) {
    throw error;
  }
}

export async function toggleStarred(fileId: string, starred: boolean) {
  try {
    await drive.files.update({
      fileId,
      requestBody: {
        starred,
      },
    });

    return true;
  } catch (error) {
    throw error;
  }
}

export async function getTrashedFiles() {
  try {
    const response = await drive.files.list({
      q: "trashed = true",
      fields: "files(id, name, mimeType, size, modifiedTime, parents)",
      pageSize: 100,
    });

    return response.data.files || [];
  } catch (error) {
    throw error;
  }
}

export async function restoreFromTrash(fileId: string) {
  try {
    await drive.files.update({
      fileId,
      requestBody: {
        trashed: false,
      },
    });

    return true;
  } catch (error) {
    throw error;
  }
}

export async function getSharedFiles() {
  const auth = await getAuth();
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.list({
    q: "sharedWithMe=true",
    fields:
      "files(id, name, mimeType, size, modifiedTime, starred, shared, owners(displayName, emailAddress))",
    orderBy: "modifiedTime desc",
    pageSize: 1000,
  });

  const files = (response.data.files || []).map((file) => {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      modifiedTime: file.modifiedTime,
      starred: file.starred || false,
      shared: true,
      sharedBy:
        file.owners && file.owners.length > 0
          ? file.owners[0].displayName || file.owners[0].emailAddress
          : "Unknown",
    };
  });

  return files;
}

export async function getDriveStorageQuota() {
  try {
    const response = await drive.about.get({
      fields: "storageQuota",
    });

    return (
      response.data.storageQuota || {
        limit: 0,
        usage: 0,
        usageInDrive: 0,
        usageInDriveTrash: 0,
      }
    );
  } catch (error) {
    throw error;
  }
}
