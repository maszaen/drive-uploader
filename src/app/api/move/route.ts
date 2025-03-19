import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { isDescendantOfBase, getFolderDetails } from '../../../lib/googleDrive'

// Helper function to check if a folder is a parent or ancestor of another folder
async function isFolderDescendantOf(
  sourceId: string,
  targetId: string
): Promise<boolean> {
  // If they're the same, it's a circular reference
  if (sourceId === targetId) {
    return true
  }

  try {
    // Start from the target and check all its parents
    let currentId = targetId
    const visited = new Set<string>()

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId)

      // If we find the source ID in the parent chain, it's a circular reference
      if (currentId === sourceId) {
        return true
      }

      // Get parent of current folder
      const folder = await getFolderDetails(currentId)

      // If no parents or we reached the root, stop checking
      if (!folder.parents || folder.parents.length === 0) {
        break
      }

      // Move up to parent
      currentId = folder.parents[0]
    }

    return false
  } catch (error) {
    console.error('Error checking folder hierarchy:', error)
    // If we can't determine, assume it's safe
    return false
  }
}

export async function POST(req: Request) {
  const baseFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  let fileInfo = null
  let destinationInfo = null

  try {
    // We'll still check if baseFolderId is configured, but won't enforce it
    // for operations on Google Drive root
    if (!baseFolderId) {
      console.warn('Base folder ID not configured, proceeding anyway')
    }

    const body = await req.json()
    const { fileId, destinationFolderId } = body

    if (!fileId || !destinationFolderId) {
      return NextResponse.json(
        { message: 'File ID dan Folder tujuan diperlukan' },
        { status: 400 }
      )
    }

    console.log(
      `Attempting to move fileId: ${fileId} to destinationFolderId: ${destinationFolderId}`
    )

    // Setup Google Drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID || '',
      process.env.GOOGLE_CLIENT_SECRET || ''
    )

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
    })

    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client,
    })

    // Get file details (for debugging)
    try {
      const fileResponse = await drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,parents,trashed,owners',
      })
      fileInfo = fileResponse.data
      console.log('File info:', JSON.stringify(fileInfo, null, 2))
    } catch (fileError) {
      console.error('Error fetching file info:', fileError)
      return NextResponse.json(
        { message: 'File tidak ditemukan atau tidak dapat diakses' },
        { status: 404 }
      )
    }

    // Get destination folder details (for debugging)
    try {
      const destResponse = await drive.files.get({
        fileId: destinationFolderId,
        fields: 'id,name,mimeType,parents,trashed,owners',
      })
      destinationInfo = destResponse.data
      console.log('Destination info:', JSON.stringify(destinationInfo, null, 2))

      // Verify this is actually a folder
      if (!destinationInfo.mimeType?.includes('folder')) {
        return NextResponse.json(
          { message: 'Destinasi yang dipilih bukan folder' },
          { status: 400 }
        )
      }
    } catch (destError) {
      console.error('Error fetching destination info:', destError)
      return NextResponse.json(
        { message: 'Folder tujuan tidak ditemukan atau tidak dapat diakses' },
        { status: 404 }
      )
    }

    // Get the file to check if it's a folder
    const fileDetails = await drive.files.get({
      fileId: fileId,
      fields: 'mimeType,parents',
    })

    // Check if we're trying to move a folder into itself or its descendants
    if (fileDetails.data.mimeType === 'application/vnd.google-apps.folder') {
      const isCircular = await isFolderDescendantOf(fileId, destinationFolderId)

      if (isCircular) {
        return NextResponse.json(
          {
            message:
              'Tidak dapat memindahkan folder ke dalam dirinya sendiri atau subfolder',
          },
          { status: 403 }
        )
      }
    }

    // Check if moving to the same parent
    if (fileInfo.parents && fileInfo.parents.includes(destinationFolderId)) {
      return NextResponse.json(
        { message: 'File sudah berada di folder tujuan' },
        { status: 400 }
      )
    }

    // We're now bypassing the base folder check and allowing operations on the Drive root
    // Only perform base folder checks if a base folder ID is configured
    if (baseFolderId) {
      console.log('Base folder ID:', baseFolderId)
      const isFileDescendant = await isDescendantOfBase(fileId, baseFolderId)
      console.log(`Is file descendant of base: ${isFileDescendant}`)

      const isDestinationDescendant = await isDescendantOfBase(
        destinationFolderId,
        baseFolderId
      )
      console.log(
        `Is destination descendant of base: ${isDestinationDescendant}`
      )

      // Only enforce base folder restrictions if the files are actually within our base folder
      // This allows operations on files outside the base folder (like in the Drive root)
      if (
        (fileInfo.parents && fileInfo.parents.includes(baseFolderId)) ||
        (destinationInfo.parents &&
          destinationInfo.parents.includes(baseFolderId))
      ) {
        // If one of the items is in our base folder, both must be in or under it
        if (!isFileDescendant && !isDestinationDescendant) {
          return NextResponse.json(
            {
              message:
                'Operasi tidak diizinkan: File atau destinasi berada di luar folder yang diizinkan',
            },
            { status: 403 }
          )
        }
      }
    }

    // Get current parents for the file
    const file = await drive.files.get({
      fileId: fileId,
      fields: 'parents',
    })

    const currentParents = file.data.parents?.join(',') || ''
    console.log(`Current parents: ${currentParents}`)

    console.log(
      `Moving file with removeParents=${currentParents}, addParents=${destinationFolderId}`
    )

    // Perform the move operation
    const moveResult = await drive.files.update({
      fileId: fileId,
      removeParents: currentParents,
      addParents: destinationFolderId,
      fields: 'id, parents',
    })

    console.log('Move successful. New parents:', moveResult.data.parents)
    return NextResponse.json({ message: 'Item berhasil dipindahkan' })
  } catch (error: any) {
    console.error('Move error:', error?.message || 'Unknown error')

    // More detailed error logging
    if (error?.response) {
      console.error('Response status:', error.response.status)
      console.error(
        'Response data:',
        JSON.stringify(error.response.data, null, 2)
      )

      const status = error.response.status

      if (status === 403) {
        // Add file and destination info to the error for debugging
        const errorDetails = {
          message: 'Anda tidak memiliki izin untuk melakukan operasi ini',
          fileInfo,
          destinationInfo,
          error: error.response.data,
        }
        console.error(
          'Permission error details:',
          JSON.stringify(errorDetails, null, 2)
        )

        return NextResponse.json(
          { message: 'Anda tidak memiliki izin untuk melakukan operasi ini' },
          { status: 403 }
        )
      } else if (status === 404) {
        return NextResponse.json(
          { message: 'File atau folder tujuan tidak ditemukan' },
          { status: 404 }
        )
      }
    }

    return NextResponse.json(
      {
        message:
          'Terjadi kesalahan saat memindahkan: ' +
          (error?.message || 'Unknown error'),
      },
      { status: 500 }
    )
  }
}
