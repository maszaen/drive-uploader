// app/api/upload/route.ts
import formidable from "formidable";
import fs from "fs";
import { NextResponse } from "next/server";
import { createFolderIfNotExist, isDescendantOfBase, uploadFile } from "../../../lib/googleDrive";

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = "./uploads";

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Parse form data using formidable
async function parseForm(req: Request): Promise<{ fields: Record<string, string | string[]>; files: formidable.File[] }> {
  const formData = await req.formData();
  const form = formidable({ multiples: true, uploadDir });
  
  // Create temporary files from the form data
  const files: formidable.File[] = [];
  // Use a regular object instead of formidable.Fields to avoid type issues
  const fields: Record<string, string | string[]> = {};
  
  for (const [key, value] of formData.entries()) {
    if (value instanceof Blob) {
      // Handle file
      const fileData = value as File;
      const buffer = Buffer.from(await fileData.arrayBuffer());
      // For folder uploads, we need to preserve the relative path structure
      let filePath;
      let relativePath = "";
      
      // Check if we're in folder upload mode and have relative paths
      if (formData.has('uploadMode') && formData.get('uploadMode') === 'folder') {
        // Find the matching relative path for this file
        // We're using a simple approach here - assuming files are processed in the same order as relativePaths
        const relativePathsData = formData.getAll('relativePaths');
        for (const path of relativePathsData) {
          if (typeof path === 'string' && path.endsWith(fileData.name)) {
            relativePath = path;
            break;
          }
        }
      }
      
      if (relativePath) {
        // Use the relative path from the form data
        filePath = `${uploadDir}/${relativePath}`;
        
        // Ensure directory exists
        const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
        fs.mkdirSync(dirPath, { recursive: true });
      } else {
        // Just use the filename directly in the upload directory
        filePath = `${uploadDir}/${fileData.name}`;
      }
      
      fs.writeFileSync(filePath, buffer);
      
      const file = {
        filepath: filePath,
        originalFilename: fileData.name,
        mimetype: fileData.type,
        size: fileData.size,
        newFilename: fileData.name,
        // For folder uploads, store the relative path
        relativePath: relativePath || fileData.name,
      } as unknown as formidable.File;
      
      files.push(file);
    } else {
      // Handle field
      if (fields[key]) {
        if (Array.isArray(fields[key])) {
          (fields[key] as string[]).push(value as string);
        } else {
          fields[key] = [fields[key] as string, value as string];
        }
      } else {
        fields[key] = value as string;
      }
    }
  }
  
  return { fields, files };
}

export async function POST(req: Request) {
  try {
    const { fields, files } = await parseForm(req);

    // Verify password
    const password = typeof fields.password === 'string' 
      ? fields.password 
      : Array.isArray(fields.password) ? fields.password[0] : '';
    
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword || password !== adminPassword) {
      // Delete temporary files
      for (const file of files) {
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
      }
      return NextResponse.json({ message: "Invalid password" }, { status: 401 });
    }

    const uploadMode = typeof fields.uploadMode === 'string' 
      ? fields.uploadMode 
      : Array.isArray(fields.uploadMode) ? fields.uploadMode[0] : '';
      
    let relativePaths: string[] = [];

    if (uploadMode === "folder" && fields.relativePaths) {
      relativePaths = Array.isArray(fields.relativePaths)
        ? fields.relativePaths
        : [fields.relativePaths];
    }

    // Get target folder ID from form data or use default
    const baseFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!baseFolderId) {
      return NextResponse.json({ message: "Google Drive folder ID tidak dikonfigurasi" }, { status: 500 });
    }

    // Check if a specific folder ID was provided for upload
    const targetFolderId = typeof fields.folderId === 'string' 
      ? fields.folderId 
      : Array.isArray(fields.folderId) ? fields.folderId[0] : baseFolderId;
    
    // Validate that the target folder is a descendant of the base folder
    if (targetFolderId !== baseFolderId) {
      const isDescendant = await isDescendantOfBase(targetFolderId, baseFolderId);
      if (!isDescendant) {
        return NextResponse.json({ message: "Folder tujuan tidak valid" }, { status: 403 });
      }
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let parentFolderId = targetFolderId; // Start with the target folder

      if (uploadMode === "folder") {
        const relativePath = relativePaths[i] || "";
        const pathParts = relativePath.split("/").slice(0, -1); // Remove filename

        for (const part of pathParts) {
          if (part) {
            parentFolderId = await createFolderIfNotExist(part, parentFolderId);
          }
        }
      }

      await uploadFile(file, parentFolderId);

      // Delete local file after upload
      fs.unlinkSync(file.filepath);
    }

    return NextResponse.json({ message: "Upload berhasil" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Terjadi kesalahan saat upload" }, { status: 500 });
  }
}