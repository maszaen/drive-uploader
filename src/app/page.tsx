/* eslint-disable */
'use client'

import GoogleStyleAvatar from '@/components/GoogleStyleAvatar'
import Modal from '@/components/ui/Modal'
import ContextMenu from '@/components/ui/ContextMenu'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AppWindow,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  Database,
  EllipsisVertical,
  Filter,
  FolderPlus,
  Grid,
  HardDrive,
  HelpCircle,
  Home as HomeIcon,
  Info,
  List,
  Pencil,
  Plus,
  Search,
  Settings,
  Share2,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import React, {
  useState,
  useEffect,
  useRef,
  MouseEvent as ReactMouseEvent,
} from 'react'

interface FileItem {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  starred?: boolean
  shared?: boolean
  sharedBy?: string
}

interface FolderPath {
  id: string
  name: string
}

interface PreviewSupport {
  canPreview: boolean
  previewType:
    | 'image'
    | 'pdf'
    | 'document'
    | 'spreadsheet'
    | 'presentation'
    | 'video'
    | 'audio'
    | 'text'
    | 'code'
    | 'unknown'
}

interface ContextMenuState {
  visible: boolean
  position: { x: number; y: number }
  file: FileItem | null
}

type ModalTypes = 'delete' | 'move' | 'createFolder'
type ViewModes = 'list' | 'grid'
type UploadModes = 'file' | 'folder'
type SortByOptions = 'name' | 'modified' | 'size'
type SortOrderOptions = 'asc' | 'desc'

const maxUploadSize = 104857600 // Example value: 100 MB

export default function HomePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [uploadMode, setUploadMode] = useState<UploadModes>('file')
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadMessage, setUploadMessage] = useState<string>('')
  const [driveFiles, setDriveFiles] = useState<FileItem[]>([])
  const [showDrive, setShowDrive] = useState<boolean>(true)
  const [showDropdown, setShowDropdown] = useState<boolean>(false)
  const [showCreateMenu, setShowCreateMenu] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<ViewModes>('list')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const createMenuRef = useRef<HTMLDivElement>(null)
  const newFolderInputRef = useRef<HTMLInputElement>(null)

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<FolderPath[]>([])
  const [showModal, setShowModal] = useState<boolean>(false)
  const [modalType, setModalType] = useState<ModalTypes>('delete')
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [newFolderName, setNewFolderName] = useState<string>('')
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null)
  const [availableFolders, setAvailableFolders] = useState<FolderPath[]>([])
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false)

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filteredFiles, setFilteredFiles] = useState<FileItem[]>([])
  const [showSearch, setShowSearch] = useState<boolean>(false)

  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const [sortBy, setSortBy] = useState<SortByOptions>('name')
  const [sortOrder, setSortOrder] = useState<SortOrderOptions>('asc')

  const [multipleSelect, setMultipleSelect] = useState<boolean>(false)
  const [currentView, setCurrentView] = useState<string>('myDrive')
  const [storageQuota, setStorageQuota] = useState<{
    limit: number
    usage: number
    usageInDrive: number
    usageInDriveTrash: number
  }>({ limit: 0, usage: 0, usageInDrive: 0, usageInDriveTrash: 0 })

  const [ctrlKeyPressed, setCtrlKeyPressed] = useState(false)
  const [shiftKeyPressed, setShiftKeyPressed] = useState(false)
  const [lastSelectedIndex, setLastSelectedIndex] = useState(-1)
  const [clipboardItems, setClipboardItems] = useState<FileItem[]>([])
  const [currentUploadFile, setCurrentUploadFile] = useState<string>('')
  const [totalUploadSize, setTotalUploadSize] = useState<number>(0)
  const [uploadedSize, setUploadedSize] = useState<number>(0)
  const [uploadedFiles, setUploadedFiles] = useState<number>(0)
  const [totalFiles, setTotalFiles] = useState<number>(0)
  const [showUploadStatus, setShowUploadStatus] = useState<boolean>(false)
  const [isPasting, setIsPasting] = useState(false)
  const [pasteOperationLock, setPasteOperationLock] = useState(false)
  const lastOperationTimestamp = useRef(0)

  const [showRenameModal, setShowRenameModal] = useState<boolean>(false)
  const [itemToRename, setItemToRename] = useState<FileItem | null>(null)
  const [newName, setNewName] = useState<string>('')
  const [isRenaming, setIsRenaming] = useState<boolean>(false)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    position: { x: 0, y: 0 },
    file: null,
  })

  const handleContextMenu = (
    e: ReactMouseEvent<HTMLElement>,
    file: FileItem
  ) => {
    e.preventDefault()
    e.stopPropagation()

    // Set the selected item
    toggleItemSelection(file.id, filteredFiles.indexOf(file))

    // Show context menu
    setContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      file,
    })
  }

  const usedPercentage = storageQuota.limit
    ? (storageQuota.usage / storageQuota.limit) * 100
    : 0
  const drivePercentage = storageQuota.limit
    ? (storageQuota.usageInDrive / storageQuota.limit) * 100
    : 0
  const trashPercentage = storageQuota.limit
    ? (storageQuota.usageInDriveTrash / storageQuota.limit) * 100
    : 0
  const freeSpace = storageQuota.limit - storageQuota.usage

  // Add this function to close the context menu
  const closeContextMenu = () => {
    setContextMenu((prev) => ({
      ...prev,
      visible: false,
    }))
  }

  const handleMultipleSelect = () => {
    setMultipleSelect(!multipleSelect)
    setSelectedItems([])
  }

  const handleLoadRecent = async () => {
    try {
      setLoadingFiles(true)
      setSearchQuery('')
      setCurrentView('recent')

      const res = await fetch('/api/recent')

      if (!res.ok) {
        const data = await res.json()
        setUploadMessage(data.message || 'Failed to load recent files.')
        setLoadingFiles(false)
        return
      }

      const data = await res.json()

      setDriveFiles(data.files || [])
      setFilteredFiles(data.files || [])
      setCurrentFolderId(null)
      setFolderPath(data.folderPath || [])
      setSelectedItems([])
    } catch (error) {
      setUploadMessage('Failed to fetch recent files. Please try again.')
    } finally {
      setLoadingFiles(false)
    }
  }

  const copyShareLink = async (fileId: string) => {
    try {
      const shareLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`

      await navigator.clipboard.writeText(shareLink)
      setUploadMessage('Share link copied to clipboard')

      setTimeout(() => {
        if (uploadMessage === 'Share link copied to clipboard') {
          setUploadMessage('')
        }
      }, 2000)
    } catch (error) {
      setUploadMessage('Failed to copy share link')
    }
  }

  const handleStopSharing = async (fileId: string, name: string) => {
    try {
      setLoadingFiles(true)

      setDriveFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, shared: false } : file
        )
      )

      setFilteredFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, shared: false } : file
        )
      )

      const res = await fetch('/api/share/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      })

      if (res.ok) {
        const data = await res.json()
        setUploadMessage(data.message || `Stopped sharing "${name}"`)
      } else {
        setUploadMessage(`Stopped sharing "${name}"`)
      }
    } catch (error) {
      setUploadMessage(`Stopped sharing "${name}"`)
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleShareFile = async (fileId: string, name: string) => {
    try {
      setLoadingFiles(true)

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, name }),
      })

      if (res.ok) {
        const data = await res.json()
        setUploadMessage(data.message || `"${name}" shared successfully`)

        if (currentView === 'myDrive') {
          handleListDrive(currentFolderId)
        } else if (currentView === 'recent') {
          handleLoadRecent()
        } else if (currentView === 'starred') {
          handleLoadStarred()
        } else if (currentView === 'shared') {
          handleLoadShared()
        }
      } else {
        setUploadMessage(`Shared "${name}" successfully`)
        setDriveFiles((prevFiles) =>
          prevFiles.map((file) =>
            file.id === fileId ? { ...file, shared: true } : file
          )
        )
        setTimeout(() => {
          if (currentView === 'myDrive') {
            handleListDrive(currentFolderId)
          }
        }, 1000)
      }
    } catch (error) {
      setUploadMessage(`Shared "${name}" successfully`)
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleLoadShared = async () => {
    try {
      setLoadingFiles(true)
      setSearchQuery('')
      setCurrentView('shared')

      const res = await fetch('/api/shared')

      if (!res.ok) {
        const data = await res.json()
        setUploadMessage(data.message || 'Failed to load shared files.')
        setLoadingFiles(false)
        return
      }

      const data = await res.json()

      setDriveFiles(data.files || [])
      setFilteredFiles(data.files || [])
      setCurrentFolderId(null)
      setFolderPath(data.folderPath || [])
      setSelectedItems([])
    } catch (error) {
      setUploadMessage('Failed to fetch shared files. Please try again.')
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleLoadStarred = async () => {
    try {
      setLoadingFiles(true)
      setSearchQuery('')
      setCurrentView('starred')

      const res = await fetch('/api/starred')

      if (!res.ok) {
        const data = await res.json()
        setUploadMessage(data.message || 'Failed to load starred files.')
        setLoadingFiles(false)
        return
      }

      const data = await res.json()

      setDriveFiles(data.files || [])
      setFilteredFiles(data.files || [])
      setCurrentFolderId(null)
      setFolderPath(data.folderPath || [])
      setSelectedItems([])
    } catch (error) {
      setUploadMessage('Failed to fetch starred files. Please try again.')
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleLoadTrash = async () => {
    try {
      setLoadingFiles(true)
      setSearchQuery('')
      setCurrentView('trash')

      const res = await fetch('/api/trash')

      if (!res.ok) {
        const data = await res.json()
        setUploadMessage(data.message || 'Failed to load trash.')
        setLoadingFiles(false)
        return
      }

      const data = await res.json()

      setDriveFiles(data.files || [])
      setFilteredFiles(data.files || [])
      setCurrentFolderId(null)
      setFolderPath(data.folderPath || [])
      setSelectedItems([])
    } catch (error) {
      setUploadMessage('Failed to fetch trash. Please try again.')
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleLoadStorage = async () => {
    try {
      setLoadingFiles(true)
      setSearchQuery('')
      setCurrentView('storage')

      const res = await fetch('/api/storage')

      if (!res.ok) {
        const data = await res.json()
        setUploadMessage(data.message || 'Failed to load storage information.')
        setLoadingFiles(false)
        return
      }

      const data = await res.json()

      setStorageQuota(
        data.quota || {
          limit: 0,
          usage: 0,
          usageInDrive: 0,
          usageInDriveTrash: 0,
        }
      )

      setDriveFiles([])
      setFilteredFiles([])
      setCurrentFolderId(null)
      setFolderPath([{ id: 'storage', name: 'Storage' }])
      setSelectedItems([])
    } catch (error) {
      setUploadMessage('Failed to fetch storage information. Please try again.')
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleRename = (file: FileItem) => {
    setItemToRename(file)
    setNewName(file.name)
    setShowRenameModal(true)
  }

  const executeRename = async () => {
    if (!itemToRename || !newName.trim() || newName === itemToRename.name) {
      setShowRenameModal(false)
      return
    }

    setIsRenaming(true)

    try {
      const res = await fetch('/api/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: itemToRename.id,
          newName: newName.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setUploadMessage(`Renamed to "${newName}" successfully`)

        // Refresh file list
        if (currentView === 'myDrive') {
          handleListDrive(currentFolderId)
        } else if (currentView === 'recent') {
          handleLoadRecent()
        } else if (currentView === 'starred') {
          handleLoadStarred()
        } else if (currentView === 'shared') {
          handleLoadShared()
        }
      } else {
        setUploadMessage(data.message || 'Failed to rename file')
      }
    } catch (error) {
      setUploadMessage('Failed to rename file. Please try again.')
    } finally {
      setIsRenaming(false)
      setShowRenameModal(false)
      setItemToRename(null)
    }
  }

  useEffect(() => {
    if (showRenameModal && renameInputRef.current) {
      setTimeout(() => {
        if (renameInputRef.current) {
          renameInputRef.current.focus()
          renameInputRef.current.select()
        }
      }, 50)
    }
  }, [showRenameModal])

  const RenameModal = () => {
    if (!showRenameModal || !itemToRename) return null

    return (
      <div className="fixed inset-0  bg-black bg-opacity-30 bg-black/30 z-9999 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl p-4 px-6 pt-5 w-full max-w-md mx-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Rename{' '}
            {itemToRename.mimeType?.includes('folder') ? 'Folder' : 'File'}
          </h3>
          <div className="mb-6">
            <input
              type="text"
              ref={renameInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  executeRename()
                }
              }}
              className="w-full border border-gray-300 text-black rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter new name"
              autoFocus
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowRenameModal(false)}
              className="px-4 py-2 rounded-full hover:bg-base text-primary text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={executeRename}
              disabled={
                !newName.trim() || newName === itemToRename.name || isRenaming
              }
              className={`px-4 py-2 ${
                !newName.trim() || newName === itemToRename.name || isRenaming
                  ? '!text-black/50 cursor-default'
                  : 'hover:bg-base !rounded-full !text-primary'
              } text-sm font-medium transition-colors`}
            >
              {isRenaming ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleToggleStar = async (fileId: string, starred: boolean) => {
    try {
      setDriveFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, starred } : file
        )
      )

      setFilteredFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, starred } : file
        )
      )

      const res = await fetch('/api/starred', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, starred }),
      })

      const data = await res.json()

      if (res.ok) {
        setUploadMessage(data.message || 'Star status updated')
      } else {
        setUploadMessage(data.message || 'Failed to update star status')

        setDriveFiles((prevFiles) =>
          prevFiles.map((file) =>
            file.id === fileId ? { ...file, starred: !starred } : file
          )
        )

        setFilteredFiles((prevFiles) =>
          prevFiles.map((file) =>
            file.id === fileId ? { ...file, starred: !starred } : file
          )
        )
      }
    } catch (error) {
      setUploadMessage('Failed to update star status. Please try again.')

      setDriveFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, starred: !starred } : file
        )
      )

      setFilteredFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId ? { ...file, starred: !starred } : file
        )
      )
    }
  }

  const handleRestoreFromTrash = async (fileId: string) => {
    try {
      setLoadingFiles(true)

      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, action: 'restore' }),
      })

      const data = await res.json()

      if (res.ok) {
        setUploadMessage(data.message || 'File restored from trash')
        handleLoadTrash()
      } else {
        setUploadMessage(data.message || 'Failed to restore file')
      }
    } catch (error) {
      setUploadMessage('Failed to restore file. Please try again.')
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleEmptyTrash = async () => {
    try {
      setLoadingFiles(true)

      const res = await fetch('/api/trash', {
        method: 'DELETE',
      })

      const data = await res.json()

      if (res.ok) {
        setUploadMessage(data.message || 'Trash emptied successfully')
        handleLoadTrash()
      } else {
        setUploadMessage(data.message || 'Failed to empty trash')
      }
    } catch (error) {
      setUploadMessage('Failed to empty trash. Please try again.')
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleMoveToTrash = async (fileId: string) => {
    try {
      setLoadingFiles(true)

      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId, action: 'trash' }),
      })

      const data = await res.json()

      if (res.ok) {
        setUploadMessage(data.message || 'File moved to trash')

        if (currentView === 'myDrive') {
          handleListDrive(currentFolderId)
        } else if (currentView === 'starred') {
          handleLoadStarred()
        } else if (currentView === 'recent') {
          handleLoadRecent()
        }
      } else {
        setUploadMessage(data.message || 'Failed to move file to trash')
      }
    } catch (error) {
      setUploadMessage('Failed to move file to trash. Please try again.')
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => {
    if (
      showModal &&
      modalType === 'createFolder' &&
      newFolderInputRef.current
    ) {
      setTimeout(() => {
        if (newFolderInputRef.current) {
          newFolderInputRef.current.focus()
        }
      }, 50)
    }
  }, [showModal, modalType])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      handleListDrive(null)
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/storage')
        .then((res) => res.json())
        .then((data) => {
          if (data.quota) {
            setStorageQuota(data.quota)
          }
        })
        .catch((error) => {})
    }
  }, [status])

  useEffect(() => {
    const filtered = !searchQuery.trim()
      ? [...driveFiles]
      : driveFiles.filter((file) =>
          file.name.toLowerCase().includes(searchQuery.toLowerCase())
        )

    setFilteredFiles(getSortedFiles(filtered))
  }, [searchQuery, driveFiles])

  const getSortedFiles = (files: FileItem[]) => {
    return [...files].sort((a, b) => {
      let comparison = 0

      const aIsFolder = a.mimeType && a.mimeType.includes('folder')
      const bIsFolder = b.mimeType && b.mimeType.includes('folder')

      if (aIsFolder && !bIsFolder) return -1
      if (!aIsFolder && bIsFolder) return 1

      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === 'modified') {
        const aDate = a.modifiedTime ? new Date(a.modifiedTime) : new Date(0)
        const bDate = b.modifiedTime ? new Date(b.modifiedTime) : new Date(0)
        comparison = aDate.getTime() - bDate.getTime()
      } else if (sortBy === 'size') {
        const aSize = a.size ? parseInt(a.size) : 0
        const bSize = b.size ? parseInt(b.size) : 0
        comparison = aSize - bSize
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
  }

  useEffect(() => {
    setFilteredFiles(getSortedFiles(driveFiles))
  }, [sortBy, sortOrder, driveFiles])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(event.target as Node)
      ) {
        setShowCreateMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files)
      setUploadMessage('')

      if (e.target.id === 'folder-upload') {
        setUploadMode('folder')
      } else {
        setUploadMode('file')
      }

      executeUpload(e.target.files)
    }
  }

  const executeUpload = async (files: FileList) => {
    if (!files || files.length === 0) {
      return
    }

    let totalSize = 0
    for (let i = 0; i < files.length; i++) {
      totalSize += files[i].size
    }

    setTotalUploadSize(totalSize)
    setTotalFiles(files.length)
    setUploadedFiles(0)
    setUploadedSize(0)
    setShowUploadStatus(true)

    setUploadProgress(0)
    setUploadMessage('')
    setCurrentUploadFile(files[0]?.name || '')

    const formData = new FormData()
    const relativePaths: string[] = []

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i])

      const file = files[i] as any
      if (file.webkitRelativePath) {
        relativePaths.push(file.webkitRelativePath)
        formData.append('relativePaths', file.webkitRelativePath)
      } else {
        formData.append('relativePaths', '')
      }
    }

    formData.append('uploadMode', uploadMode)
    formData.append('replaceExisting', 'false')

    if (currentFolderId) {
      formData.append('folderId', currentFolderId)
    }

    const simulateUploadProgress = () => {
      let currentProgress = 0
      let currentFileIndex = 0

      const interval = setInterval(() => {
        if (currentProgress >= 100) {
          clearInterval(interval)
          return
        }

        const increment = Math.random() * 3 + 0.5
        currentProgress += increment

        if (currentProgress > 100) currentProgress = 100

        setUploadProgress(currentProgress)
        setUploadedSize(
          Math.min(totalSize * (currentProgress / 100), totalSize)
        )

        if (
          files &&
          currentProgress > (currentFileIndex + 1) * (100 / files.length) &&
          currentFileIndex < files.length - 1
        ) {
          currentFileIndex++
          setCurrentUploadFile(files[currentFileIndex].name)
          setUploadedFiles(currentFileIndex + 1)
        }
      }, 250)

      return interval
    }

    const progressInterval = simulateUploadProgress()

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadedSize(totalSize)
      setUploadedFiles(files.length)

      const data = await res.json()

      if (!data.uploadedFiles) {
        setUploadMessage(data.message || 'Error uploading.')
      } else {
        let successMsg = `Successfully uploaded ${data.uploadedFiles} of ${data.totalFiles} files`

        if (data.replacedFiles && data.replacedFiles > 0) {
          successMsg += ` (${data.replacedFiles} replaced, ${data.newFiles} new)`
        }

        setUploadMessage(successMsg)

        if (fileInputRef.current) fileInputRef.current.value = ''
        if (folderInputRef.current) folderInputRef.current.value = ''

        handleListDrive(currentFolderId)

        setTimeout(() => {
          setShowUploadStatus(false)
        }, 3000)
      }
    } catch (error) {
      clearInterval(progressInterval)
      setUploadMessage('Error uploading. Please try again.')
    }
  }

  const triggerFileInput = (mode: UploadModes) => {
    if (mode === 'file' && fileInputRef.current) {
      fileInputRef.current.click()
    } else if (mode === 'folder' && folderInputRef.current) {
      folderInputRef.current.click()
    }
  }

  const getPreviewSupport = (file: FileItem): PreviewSupport => {
    const mimeType = file.mimeType || ''

    if (mimeType.includes('google-apps')) {
      if (mimeType.includes('document')) {
        return { canPreview: true, previewType: 'document' }
      } else if (mimeType.includes('spreadsheet')) {
        return { canPreview: true, previewType: 'spreadsheet' }
      } else if (mimeType.includes('presentation')) {
        return { canPreview: true, previewType: 'presentation' }
      } else if (mimeType.includes('drawing')) {
        return { canPreview: true, previewType: 'image' }
      }
    }

    if (mimeType.includes('image')) {
      return { canPreview: true, previewType: 'image' }
    } else if (mimeType.includes('pdf')) {
      return { canPreview: true, previewType: 'pdf' }
    } else if (mimeType.includes('video')) {
      return { canPreview: true, previewType: 'video' }
    } else if (mimeType.includes('audio')) {
      return { canPreview: true, previewType: 'audio' }
    } else if (
      mimeType.includes('text') ||
      mimeType.includes('javascript') ||
      mimeType.includes('json') ||
      mimeType.includes('css') ||
      mimeType.includes('html')
    ) {
      return { canPreview: true, previewType: 'text' }
    } else if (
      mimeType.includes('msword') ||
      mimeType.includes('officedocument.wordprocessingml')
    ) {
      return { canPreview: true, previewType: 'document' }
    } else if (
      mimeType.includes('excel') ||
      mimeType.includes('officedocument.spreadsheetml')
    ) {
      return { canPreview: true, previewType: 'spreadsheet' }
    } else if (
      mimeType.includes('powerpoint') ||
      mimeType.includes('officedocument.presentationml')
    ) {
      return { canPreview: true, previewType: 'presentation' }
    }

    if (mimeType.includes('folder')) {
      return { canPreview: false, previewType: 'unknown' }
    }

    return { canPreview: false, previewType: 'unknown' }
  }

  const handleFileAction = async (file: FileItem) => {
    if (file.mimeType.includes('folder')) {
      navigateToFolder(file.id)
      return
    }

    try {
      setLoadingFiles(true)
      const res = await fetch(`/api/filelink?fileId=${file.id}`)

      if (!res.ok) {
        const error = await res.json()
        setUploadMessage(error.message || 'Failed to get file link')
        setLoadingFiles(false)
        return
      }

      const data = await res.json()

      if (data.fileUrl) {
        window.open(data.fileUrl, '_blank')
      } else {
        setUploadMessage("Couldn't open file. Please try again.")
      }
    } catch (error) {
      setUploadMessage('Failed to open file. Please try again.')
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleListDrive = async (folderId: string | null = null) => {
    try {
      setLoadingFiles(true)
      setSearchQuery('')
      setCurrentView('myDrive')

      const queryParams = new URLSearchParams()
      if (folderId) {
        queryParams.append('folderId', folderId)
      }

      const res = await fetch(`/api/list?${queryParams.toString()}`)

      if (!res.ok) {
        const data = await res.json()
        setUploadMessage(data.message || 'Failed to load files.')
        setLoadingFiles(false)
        return
      }

      const data = await res.json()

      if (!showDrive) {
        setShowDrive(true)
      }

      setDriveFiles(data.files || [])
      setFilteredFiles(data.files || [])
      setCurrentFolderId(data.currentFolder?.id || null)
      setFolderPath(data.folderPath || [])
      setSelectedItems([])
    } catch (error) {
      setUploadMessage('Failed to fetch files. Please try again.')
    } finally {
      setLoadingFiles(false)
    }
  }

  const navigateToFolder = (folderId: string) => {
    handleListDrive(folderId)
  }

  const handleDelete = (fileId: string, name: string, mimeType: string) => {
    setSelectedFile({ id: fileId, name, mimeType })
    setModalType('delete')
    setShowModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedFile) return

    setShowModal(false)
    executeDelete()
  }

  const executeDelete = async () => {
    if (!selectedFile) return

    try {
      setLoadingFiles(true)

      const isMultipleDelete = selectedFile.id.includes(',')

      if (isMultipleDelete) {
        const fileIds = selectedFile.id.split(',')
        let successCount = 0

        for (const fileId of fileIds) {
          try {
            const res = await fetch('/api/delete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ fileId }),
            })

            if (res.ok) {
              successCount++
            }
          } catch (error) {
            // Silently catch the error
            // console.error(error);
          }
        }

        if (successCount > 0) {
          setUploadMessage(
            `Successfully deleted ${successCount} of ${fileIds.length} items`
          )
        } else {
          setUploadMessage('Failed to delete items')
        }
      } else {
        const res = await fetch('/api/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId: selectedFile.id }),
        })

        const data = await res.json()
        if (res.ok) {
          setUploadMessage(data.message || 'Item successfully deleted')
        } else {
          setUploadMessage(data.message || 'Failed to delete item')
        }
      }

      handleListDrive(currentFolderId)
    } catch (error) {
      setUploadMessage('Failed to delete item')
    } finally {
      setSelectedFile(null)
      setLoadingFiles(false)
    }
  }

  const handleMove = async (fileId: string, name: string, mimeType: string) => {
    setSelectedFile({ id: fileId, name, mimeType })
    setModalType('move')

    // No need to preload folders here since the TreeView will handle loading
    setTargetFolderId(null) // Reset any previous selection
    setShowModal(true)
  }

  const confirmMove = async () => {
    if (!selectedFile || !targetFolderId) return

    // Don't allow moving to the same folder if we know the current folder ID
    if (targetFolderId === currentFolderId) {
      setUploadMessage('File sudah berada di folder ini')
      setShowModal(false)
      setSelectedFile(null)
      setTargetFolderId(null)
      return
    }

    setShowModal(false)
    setLoadingFiles(true)

    try {
      const res = await fetch('/api/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: selectedFile.id,
          destinationFolderId: targetFolderId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setUploadMessage(data.message || 'Item berhasil dipindahkan')
        // Refresh the file list
        handleListDrive(currentFolderId)
      } else {
        // Handle specific error messages
        if (res.status === 403) {
          setUploadMessage(data.message || 'Operasi tidak diizinkan')
        } else if (res.status === 404) {
          setUploadMessage(
            data.message || 'File atau folder tujuan tidak ditemukan'
          )
        } else {
          setUploadMessage(data.message || 'Gagal memindahkan item')
        }
      }
    } catch (error) {
      console.error('Error during move:', error)
      setUploadMessage('Gagal memindahkan item')
    } finally {
      setSelectedFile(null)
      setTargetFolderId(null)
      setLoadingFiles(false)
    }
  }

  const executeMove = async () => {
    if (!selectedFile || !targetFolderId) return

    try {
      setLoadingFiles(true)
      const res = await fetch('/api/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: selectedFile.id,
          destinationFolderId: targetFolderId,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setUploadMessage(data.message || 'Item successfully moved')

        handleListDrive(currentFolderId)
      } else {
        setUploadMessage(data.message || 'Failed to move item')
      }
    } catch (error) {
      setUploadMessage('Failed to move item')
    } finally {
      setSelectedFile(null)
      setTargetFolderId(null)
      setLoadingFiles(false)
    }
  }

  const handleCreateFolder = () => {
    setModalType('createFolder')
    setNewFolderName('')
    setShowModal(true)
    setShowCreateMenu(false)
  }

  const confirmCreateFolder = async () => {
    if (!newFolderName) return

    try {
      setShowModal(false)
      setLoadingFiles(true)
      const res = await fetch('/api/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderName: newFolderName,
          parentFolderId: currentFolderId,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setUploadMessage(data.message || 'Folder successfully created')

        handleListDrive(currentFolderId)
      } else {
        setUploadMessage(data.message || 'Failed to create folder')
      }
    } catch (error) {
      setUploadMessage('Failed to create folder')
    } finally {
      setNewFolderName('')
      setLoadingFiles(false)
    }
  }

  const handleLogout = async () => {
    localStorage.clear()
    sessionStorage.clear()

    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })

    const databases = await window.indexedDB?.databases()
    if (databases) {
      databases.forEach((db) => {
        if (db.name) window.indexedDB.deleteDatabase(db.name)
      })
    }

    if (navigator.serviceWorker) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      registrations.forEach((registration) => registration.unregister())
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => caches.delete(cacheName))
      })
    }

    await signOut({ redirect: false })
    router.push('/login')
  }

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('folder')) return '📁'
    if (mimeType.includes('image')) return '🖼️'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('document')) return '📝'
    if (mimeType.includes('spreadsheet')) return '📊'
    if (mimeType.includes('presentation')) return '📽️'
    if (mimeType.includes('video')) return '🎬'
    if (mimeType.includes('audio')) return '🎵'
    return '📄'
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const toggleItemSelection = (fileId: string, index: number) => {
    if (ctrlKeyPressed) {
      setSelectedItems((prev) => {
        if (prev.includes(fileId)) {
          return prev.filter((id) => id !== fileId)
        } else {
          setLastSelectedIndex(index)
          return [...prev, fileId]
        }
      })
    } else if (shiftKeyPressed && lastSelectedIndex !== -1) {
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const itemsInRange = filteredFiles
        .slice(start, end + 1)
        .map((file) => file.id)

      setSelectedItems((prev) => {
        const newSelection = [...prev]
        itemsInRange.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id)
          }
        })
        return newSelection
      })
    } else {
      setSelectedItems([fileId])
      setLastSelectedIndex(index)
    }
  }

  const handleCopy = () => {
    if (selectedItems.length === 0) return

    const itemsToCopy = filteredFiles.filter((file) =>
      selectedItems.includes(file.id)
    )
    setClipboardItems(itemsToCopy)

    setUploadMessage(`${selectedItems.length} items copied to clipboard.`)

    setTimeout(() => {
      if (uploadMessage.includes('copied to clipboard')) {
        setUploadMessage('')
      }
    }, 3000)
  }

  const handleSelectAll = () => {
    if (selectedItems.length === filteredFiles.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredFiles.map((file) => file.id))
    }

    setUploadMessage(
      selectedItems.length === filteredFiles.length
        ? 'Deselected all items'
        : `Selected all ${filteredFiles.length} items`
    )

    setTimeout(() => {
      if (
        uploadMessage.includes('Selected all') ||
        uploadMessage.includes('Deselected all')
      ) {
        setUploadMessage('')
      }
    }, 2000)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      if (e.key === 'Control' || e.key === 'Meta') {
        setCtrlKeyPressed(true)
      }

      if (e.key === 'Shift') {
        setShiftKeyPressed(true)
      }

      // Ctrl+A for select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        handleSelectAll()
      }

      // Ctrl+C for copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        handleCopy()
      }

      // Ctrl+X for cut (prepare for move)
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault()
        // Get selected files and mark them for movement
        if (selectedItems.length > 0) {
          const itemsToMove = filteredFiles.filter((file) =>
            selectedItems.includes(file.id)
          )
          setClipboardItems(itemsToMove)
          setIsPasting(false) // Reset pasting state
          setUploadMessage(
            `${selectedItems.length} items ready to move. Use Ctrl+V to paste.`
          )
        }
      }

      // Ctrl+V for paste (complete move operation)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (!isPasting && !pasteOperationLock && clipboardItems.length > 0) {
          e.preventDefault()

          // If items were cut (Ctrl+X), perform move operation
          if (!isPasting) {
            handlePasteMove()
          } else {
            handlePaste() // The existing copy-paste function
          }
        }
      }

      // Delete key to move to trash
      if (e.key === 'Delete' && selectedItems.length > 0) {
        e.preventDefault()

        if (currentView === 'trash') {
          // If in trash, delete permanently
          const fileToDelete = filteredFiles.find(
            (file) => file.id === selectedItems[0]
          )
          if (fileToDelete) {
            handleDelete(
              selectedItems.join(','),
              `${selectedItems.length} items`,
              'batch'
            )
          }
        } else {
          // Otherwise move to trash
          selectedItems.forEach((fileId) => {
            handleMoveToTrash(fileId)
          })
        }
      }

      // Escape key to clear selection
      if (e.key === 'Escape') {
        handleClearSelection()
      }

      // F2 key for rename
      if (e.key === 'F2' && selectedItems.length === 1) {
        e.preventDefault()
        const fileToRename = filteredFiles.find(
          (file) => file.id === selectedItems[0]
        )
        if (fileToRename) {
          handleRename(fileToRename)
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setCtrlKeyPressed(false)
      }
      if (e.key === 'Shift') {
        setShiftKeyPressed(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [
    clipboardItems,
    isPasting,
    pasteOperationLock,
    selectedItems,
    filteredFiles,
    currentView,
  ])

  const handlePasteMove = async () => {
    if (clipboardItems.length === 0 || isPasting || pasteOperationLock) {
      return
    }

    const now = Date.now()
    if (now - lastOperationTimestamp.current < 2000) {
      return
    }

    lastOperationTimestamp.current = now
    setPasteOperationLock(true)
    setIsPasting(true)
    setUploadMessage(`Memindahkan ${clipboardItems.length} item...`)

    const operationId = `move-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const itemsToMove = [...clipboardItems]
    setClipboardItems([]) // Clear clipboard after move operation starts

    let successCount = 0
    let errorCount = 0
    let skippedCount = 0

    try {
      setLoadingFiles(true)

      for (const item of itemsToMove) {
        // Don't try to move a folder to itself
        if (item.id === currentFolderId) {
          skippedCount++
          continue
        }

        try {
          const res = await fetch('/api/move', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileId: item.id,
              destinationFolderId: currentFolderId || 'root',
              operationId,
            }),
          })

          if (res.ok) {
            successCount++
          } else {
            errorCount++
            console.warn(`Failed to move item ${item.name}: ${res.status}`)
          }
        } catch (itemError) {
          errorCount++
          console.error('Error moving item:', item.name, itemError)
        }

        // Small delay to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300))
      }

      // Set appropriate message based on results
      if (successCount > 0) {
        let message = `Berhasil memindahkan ${successCount} dari ${itemsToMove.length} item`

        if (errorCount > 0) {
          message += `, ${errorCount} gagal`
        }

        if (skippedCount > 0) {
          message += `, ${skippedCount} dilewati`
        }

        setUploadMessage(message)
      } else {
        setUploadMessage('Gagal memindahkan item. Periksa izin dan coba lagi.')
      }

      // Refresh the file list after a short delay
      setTimeout(() => {
        handleListDrive(currentFolderId)
      }, 1000)
    } catch (error) {
      console.error('Move operation failed:', error)
      setUploadMessage('Gagal memindahkan. Coba lagi.')
    } finally {
      setTimeout(() => {
        setIsPasting(false)
        setPasteOperationLock(false)
      }, 2000)

      setLoadingFiles(false)
    }
  }

  const handlePaste = async () => {
    if (clipboardItems.length === 0 || isPasting || pasteOperationLock) {
      return
    }

    const now = Date.now()
    if (now - lastOperationTimestamp.current < 2000) {
      return
    }

    lastOperationTimestamp.current = now

    setPasteOperationLock(true)
    setIsPasting(true)
    setUploadMessage(`Copying ${clipboardItems.length} items...`)

    const operationId = `paste-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    const itemsToCopy = [...clipboardItems]
    setClipboardItems([])

    let successCount = 0

    try {
      setLoadingFiles(true)

      for (const item of itemsToCopy) {
        const targetFolderId = currentFolderId || 'root'

        const res = await fetch('/api/copy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: item.id,
            destinationFolderId: targetFolderId,
            operationId,
          }),
        })

        const data = await res.json()

        if (res.ok && !data.duplicate) {
          successCount++
        } else if (data.duplicate) {
        } else {
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      setUploadMessage(
        `Copied ${successCount} of ${itemsToCopy.length} items successfully`
      )

      setTimeout(() => {
        handleListDrive(currentFolderId)
      }, 1000)
    } catch (error) {
      setUploadMessage('Failed to copy. Please try again.')
    } finally {
      setTimeout(() => {
        setIsPasting(false)
        setPasteOperationLock(false)

        if (uploadMessage.includes('Copied')) {
          setUploadMessage('')
        }
      }, 2000)

      setLoadingFiles(false)
    }
  }

  const handleClearSelection = () => {
    if (selectedItems.length > 0) {
      setSelectedItems([])
      setLastSelectedIndex(-1)

      setTimeout(() => {
        if (uploadMessage === 'Selection cleared') {
          setUploadMessage('')
        }
      }, 1500)
    }
  }

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredFiles.length) {
      setSelectedItems([])
    } else {
      setSelectedItems(filteredFiles.map((file) => file.id))
    }
  }

  const batchDeleteSelected = () => {
    if (selectedItems.length === 0) return

    setSelectedFile({
      id: selectedItems.join(','),
      name: `${selectedItems.length} items`,
      mimeType: 'batch',
    })
    setModalType('delete')
    setShowModal(true)
  }

  const formatDate = (isoDate: string) => {
    if (!isoDate) return ''

    const date = new Date(isoDate)
    const today = new Date()

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()

    if (isToday) {
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    } else {
      return date
        .toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        .replace(/\s/g, '–')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <motion.div
          className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]">
        <motion.div
          className="w-10 h-10 border-4 border-gray-300 border-t-blue-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
    )
  }

  return (
    <div className="font-product-sans flex flex-col bg-[#f8f9fa] font-sans">
      <div className="flex flex-1">
        <aside className="w-60 bg-base-1 fixed left-0 top-0 bottom-0 z-999 px-5">
          <div>
            <div className="relative" ref={createMenuRef}>
              <div className="flex items-center px-3 pt-3 mr-6 mb-5">
                <div className="w-9 h-9 flex items-center justify-center mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
                    <defs>
                      <linearGradient
                        id="gradient"
                        className="w-9 h-9"
                        gradientUnits="userSpaceOnUse"
                        x1="57.853"
                        x2="43.1737"
                        y1="12.7873"
                        y2="117.2361"
                      >
                        <stop offset="0" stopColor="#6CA5D9" />
                        <stop offset="0.34" stopColor="#478ECC" />
                        <stop offset="0.58" stopColor="#2574BB" />
                        <stop offset="1" stopColor="#00539E" />
                      </linearGradient>
                    </defs>
                    <path
                      fillOpacity="0.2"
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M34,79.7l93,4.4c1.2,0.1,1.4,1,0.4,2.1l-27,32.8c-0.9,1.1-2.6,2.1-3.8,1.9L5.5,109.7c-1.1-0.1-1.4-1.1-0.4-2.1l25.2-25.9C31.2,80.6,32.8,79.7,34,79.7z"
                    />
                    <polygon
                      fill="#6699FF"
                      points="1.6,10 3.6,8 4,7.6 4.5,7.4 4.9,7.1 5.4,7 5.9,6.8 6.4,6.8 7,6.8 7.5,6.8 97.6,18.1 98.1,18.2 98.7,18.4 99.2,18.6 99.7,18.8 100.2,19.1 100.6,19.5 101.1,19.9 101.4,20.3 101.8,20.7 102.1,21.2 102.4,21.7 102.6,22.2 102.8,22.7 102.9,23.3 103,23.8 103.1,24.4 103.1,114.3 103,114.8 102.9,115.4 102.8,115.9 102.6,116.4 102.4,116.9 102.1,117.3 101.8,117.7 99.8,119.7 100.1,119.3 100.4,118.9 100.6,118.4 100.8,117.9 100.9,117.4 101,116.9 101,116.3 101,26.4 101,25.9 100.9,25.3 100.8,24.7 100.6,24.2 100.4,23.7 100.1,23.2 99.8,22.7 99.4,22.3 99,21.9 98.6,21.5 98.2,21.2 97.7,20.9 97.2,20.6 96.6,20.4 96.1,20.3 95.5,20.2 5.5,8.8 4.9,8.8 4.4,8.8 3.9,8.9 3.4,9 2.9,9.2 2.4,9.4 2,9.7"
                    />
                    <path
                      fill="url(#gradient)"
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M5.5,8.8l90.1,11.3c3,0.4,5.5,3.2,5.5,6.3v89.9c0,3.1-2.5,5.3-5.5,4.9L5.5,109.9c-3-0.4-5.5-3.2-5.5-6.3V13.7C0,10.7,2.5,8.5,5.5,8.8z"
                    />
                    <g fill="#FFFFFF">
                      <polygon points="39.2,76.8 29.1,91.6 28.5,92.4 29.7,92.6 76,99.1 76.4,99.2 76.6,98.9 87.1,83.6" />
                      <polygon points="63.4,34.2 63.2,33.8 62.8,33.8 42.8,31 41.6,30.9 42.2,32 65.3,74.8 65.5,75.2 65.9,75.2 85.9,78 87.1,78.1 86.5,77" />
                      <polygon points="48.7,52.3 48.5,52 38.4,33.5 37.8,32.4 37.2,33.3 14.1,69.6 13.9,69.9 14.1,70.3 24.2,88.8 24.8,89.9 25.4,88.9 48.5,52.7" />
                    </g>
                  </svg>
                </div>
                <h1 className="text-xl font-product-sans font-normal text-gray-800">
                  Drivogle
                </h1>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowCreateMenu(!showCreateMenu)}
                  className="flex items-center space-x-3 bg-white border border-gray-300 shadow-md hover:shadow-lg text-gray-700 font-medium rounded-2xl px-4 py-4 mb-5 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-sm">New</span>
                </button>
                <AnimatePresence>
                  {showCreateMenu && (
                    <motion.div
                      className="absolute left-0 mt-0 top-0 w-50 bg-white rounded-xl shadow-xl py-2 ring-1 ring-black ring-opacity-5 z-20"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => {
                          const newMode = 'file'
                          setUploadMode(newMode)
                          triggerFileInput(newMode)
                          setShowCreateMenu(false)
                        }}
                        className="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Upload className="h-4 w-4 text-gray-500" />
                        <span>File upload</span>
                      </button>
                      <button
                        onClick={() => {
                          const newMode = 'folder'
                          setUploadMode(newMode)
                          triggerFileInput(newMode)
                          setShowCreateMenu(false)
                        }}
                        className="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Upload className="h-4 w-4 text-gray-500" />
                        <span>Folder upload</span>
                      </button>
                      <div className="border-t border-gray-200 my-2"></div>
                      <button
                        onClick={handleCreateFolder}
                        className="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <FolderPlus className="h-4 w-4 text-gray-500" />
                        <span>New folder</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <nav className="mt-2">
            <ul>
              <li>
                <button
                  onClick={() => handleListDrive(null)}
                  className={`flex items-center w-full px-4 py-1.5 text-sm font-medium ${
                    currentView === 'myDrive'
                      ? 'bg-fore-1 text-fore-3'
                      : 'text-gray-700 hover:bg-fore-2'
                  } rounded-full transition-colors`}
                >
                  <HomeIcon
                    className={`h-5 w-5 mr-3 ${currentView === 'myDrive' ? 'text-fore-3' : 'text-gray-500'}`}
                  />
                  <span>My Drive</span>
                </button>
              </li>
              <li>
                <button
                  onClick={handleLoadRecent}
                  className={`flex items-center w-full px-4 py-1.5 text-sm font-medium ${
                    currentView === 'recent'
                      ? 'bg-fore-1 text-fore-3'
                      : 'text-gray-700 hover:bg-fore-2'
                  } rounded-full transition-colors`}
                >
                  <Clock
                    className={`h-5 w-5 mr-3 ${currentView === 'recent' ? 'text-fore-3' : 'text-gray-500'}`}
                  />
                  <span>Recent</span>
                </button>
              </li>
              <li>
                <button
                  onClick={handleLoadStarred}
                  className={`flex mb-4 items-center w-full px-4 py-1.5 text-sm font-medium ${
                    currentView === 'starred'
                      ? 'bg-fore-1 text-fore-3'
                      : 'text-gray-700 hover:bg-fore-2'
                  } rounded-full transition-colors`}
                >
                  <Star
                    className={`h-5 w-5 mr-3 ${currentView === 'starred' ? 'text-fore-3' : 'text-gray-500'}`}
                  />
                  <span>Starred</span>
                </button>
              </li>
              <li>
                <button
                  onClick={handleLoadShared}
                  className={`flex items-center w-full px-4 py-1.5 text-sm font-medium ${
                    currentView === 'shared'
                      ? 'bg-fore-1 text-fore-3'
                      : 'text-gray-700 hover:bg-fore-2'
                  } rounded-full transition-colors`}
                >
                  <Share2
                    className={`h-5 w-5 mr-3 ${currentView === 'shared' ? 'text-fore-3' : 'text-gray-500'}`}
                  />
                  <span>Shared with me</span>
                </button>
              </li>
              <li>
                <button
                  onClick={handleLoadTrash}
                  className={`flex items-center w-full px-4 py-1.5 text-sm font-medium ${
                    currentView === 'trash'
                      ? 'bg-fore-1 text-fore-3'
                      : 'text-gray-700 hover:bg-fore-2'
                  } rounded-full transition-colors`}
                >
                  <Trash2
                    className={`h-5 w-5 mr-3 ${currentView === 'trash' ? 'text-fore-3' : 'text-gray-500'}`}
                  />
                  <span>Trash</span>
                </button>
              </li>
              <li>
                <button
                  onClick={handleLoadStorage}
                  className={`flex items-center w-full px-4 py-1.5 text-sm font-medium ${
                    currentView === 'storage'
                      ? 'bg-fore-1 text-fore-3'
                      : 'text-gray-700 hover:bg-fore-2'
                  } rounded-full transition-colors`}
                >
                  <Database
                    className={`h-5 w-5 mr-3 ${currentView === 'storage' ? 'text-fore-3' : 'text-gray-500'}`}
                  />
                  <span>Storage</span>
                </button>
              </li>
            </ul>
          </nav>

          <div className="px-4 mt-2">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="bg-[#1a73e8] h-full"
                style={{
                  width: `${storageQuota.limit ? (storageQuota.usage / storageQuota.limit) * 100 : 0}%`,
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatFileSize(storageQuota.usage)} of{' '}
              {formatFileSize(storageQuota.limit)} used
            </div>
            <button className="mt-3 w-full flex justify-center border rounded-full hover:bg-base border-gray-600 py-2 text-sm text-primary font-medium hover:text-[#0e60cb] transition-colors">
              Get more storage
            </button>
          </div>
        </aside>

        <main className="ml-60 flex-1">
          <div className="flex items-center w-full justify-between bg-base-1 py-2 pl-1 pr-5">
            <div className="relative flex-grow text-gray-700 max-w-3xl ">
              <div
                className={`flex items-center  bg-base-2 rounded-full px-4 ${showSearch ? 'ring-1 ring-blue-500 shadow-sm' : ''}`}
              >
                <Search className="h-5 w-5 text-gray-700 mr-3" />
                <input
                  type="text"
                  placeholder="Search in Drive"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  onBlur={() => setShowSearch(false)}
                  className="py-3 w-full bg-transparent border-none placeholder:text-gray-700 text-black focus:outline-none text-sm"
                />
                {showSearch && (
                  <button className="p-2 text-gray-700 hover:bg-gray-200 rounded-full">
                    <Filter className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                <HelpCircle className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                <Settings className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                <AppWindow className="h-5 w-5" />
              </button>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-[#1a73e8] text-white font-medium hover:bg-[#1a73e8]/90 focus:outline-none transition-colors"
                >
                  <GoogleStyleAvatar size={43} src="/images/avatar.jpg" />
                </button>

                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-xl py-2 ring-1 ring-black ring-opacity-5 z-20"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full font-medium flex items-center justify-center mr-3">
                            <GoogleStyleAvatar
                              size={43}
                              src="/images/avatar.jpg"
                            />
                          </div>
                          <div>
                            <div className="font-medium text-black">
                              {session?.user?.name || 'User'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {session?.user?.email || 'no-email'}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
          />
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFileChange}
            multiple
            //@ts-ignore
            webkitdirectory="true"
            directory=""
            className="hidden"
          />

          <AnimatePresence>
            {showUploadStatus && (
              <motion.div
                className="fixed bottom-6 right-6 z-50 bg-fore rounded-2xl shadow-switch-1 overflow-hidden w-80"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="p-4 border-b border-gray-200 bg-base-1">
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-gray-700">
                      Uploading {totalFiles}{' '}
                      {totalFiles === 1 ? 'item' : 'items'}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowUploadStatus(false)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"
                            fill="#5F6368"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center mb-3">
                    <div className="relative mr-4">
                      {uploadProgress < 100 ? (
                        <div className="relative w-10 h-10">
                          <svg className="w-10 h-10" viewBox="0 0 36 36">
                            <circle
                              cx="18"
                              cy="18"
                              r="16"
                              fill="none"
                              stroke="#e0e0e0"
                              strokeWidth="2"
                            ></circle>
                            <circle
                              cx="18"
                              cy="18"
                              r="16"
                              fill="none"
                              stroke="#1a73e8"
                              strokeWidth="2"
                              strokeDasharray="100"
                              strokeDashoffset={100 - uploadProgress}
                              transform="rotate(-90 18 18)"
                            ></circle>
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary">
                            {Math.round(uploadProgress)}%
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div
                        className="text-sm font-medium mb-1 truncate text-black"
                        title={currentUploadFile}
                      >
                        {currentUploadFile ||
                          (selectedFiles && selectedFiles[0]?.name)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(uploadedSize)} of{' '}
                        {formatFileSize(totalUploadSize)}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    {uploadedFiles} of {totalFiles}{' '}
                    {totalFiles === 1 ? 'file' : 'files'} uploaded
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col bg-white rounded-tl-2xl">
            <div className="mb-4 flex items-center w-full justify-between flex-col">
              <div className="flex items-center w-full justify-between px-5 space-x-2 flex-row mt-4">
                <div className="flex items-center">
                  <h2 className="text-2xl font-product-sans font-normal text-gray-800 mr-4">
                    {folderPath.length > 0
                      ? folderPath[folderPath.length - 1].name
                      : 'My Drive'}
                  </h2>
                  {currentView === 'trash' && (
                    <button
                      onClick={handleEmptyTrash}
                      className="mx-2 mr-3 flex flex-row gap-2 px-4 py-2 text-primary border border-gray-400 bg-base-1 hover:bg-white rounded-full text-sm font-medium transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                      Empty Trash
                    </button>
                  )}
                  <AnimatePresence>
                    {uploadMessage && (
                      <motion.div
                        key="upload-message"
                        className={`text-sm font-medium items-center flex flex-row px-3 py-1 rounded-full ${
                          uploadMessage.includes('failed') ||
                          uploadMessage.includes('Please')
                            ? 'bg-red-50 text-red-500'
                            : 'bg-green-50 text-green-500'
                        }`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          transition: {
                            type: 'tween',
                            ease: [0.4, 0, 0.2, 1],
                            duration: 0.3,
                          },
                        }}
                        exit={{
                          opacity: 0,
                          x: 20,
                          transition: {
                            type: 'tween',
                            ease: [0.4, 0, 1, 1],
                            duration: 0.2,
                          },
                        }}
                      >
                        {uploadMessage}
                        <X
                          onClick={() => setUploadMessage('')}
                          className="h-4 w-4 ml-2 cursor-pointer"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedItems.length > 0 && (
                    <motion.div
                      className="flex space-x-2 mr-2"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <button
                        onClick={batchDeleteSelected}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
                        title="Delete selected"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </motion.div>
                  )}

                  <button
                    onClick={() => handleMultipleSelect()}
                    className={`p-2 rounded-full ${multipleSelect === true ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Multiple select"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                  <div className="flex items-center">
                    <div className="flex rounded-full border border-gray-400 p-1 bg-white">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-full flex items-center justify-center transition-colors ${
                          viewMode === 'list'
                            ? 'bg-fore-1 text-fore-3'
                            : 'text-gray-600'
                        }`}
                        title="List view"
                      >
                        <List className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-full flex items-center justify-center transition-colors ${
                          viewMode === 'grid'
                            ? 'bg-fore-1 text-fore-3'
                            : 'text-gray-600'
                        }`}
                        title="Grid view"
                      >
                        <Grid className="h-5 w-5" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setSortBy('name')
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                      }}
                      className="p-2 ml-2 text-gray-600 hover:bg-gray-100 rounded-full"
                      title="Sort by name"
                    >
                      <Info className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <nav className="flex pb-4 pl-5 text-sm overflow-x-auto py-1 bg-white">
            <p className="text-gray-500 cursor-not-allowed select-none">
              {'Cloud Storage'}&nbsp;&nbsp;
            </p>{' '}
            {folderPath.length > 0 && (
              <p className="text-gray-300 cursor-not-allowed select-none">
                {'/'}&nbsp;
              </p>
            )}
            <ol className="flex items-center space-x-1">
              {folderPath.map((folder, index) => (
                <li
                  key={folder.id}
                  className="flex items-center whitespace-nowrap"
                >
                  {index > 0 && <span className="mx-1 text-gray-300">/</span>}
                  <button
                    onClick={() => navigateToFolder(folder.id)}
                    className={`hover:text-primary transition-colors ${
                      index === folderPath.length - 1
                        ? 'font-medium text-primary'
                        : 'text-gray-500'
                    }`}
                  >
                    {folder.name}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="bg-white select-none min-h-[calc(100vh-344.5px)] max-h-[calc(100vh-344.5px)] h-[calc(100vh-344.5px)]">
            {showDrive ? (
              loadingFiles ? (
                <div className="bg-white min-h-[calc(100vh-182px)] h-full overflow-y-auto pl-4">
                  <table className="min-w-full divide-y divide-black">
                    <thead className="bg-white font-product-sans sticky top-0 z-10">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                          Name
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                          Last modified
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider">
                          File size
                        </th>
                        <th className="relative px-3 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white font-google-sans">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td className="px-3 py-3">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                          </td>
                          <td className="px-3 py-3 flex space-x-2">
                            <div className="h-4 w-4 bg-gray-200 rounded"></div>
                            <div className="h-4 w-4 bg-gray-200 rounded"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : filteredFiles.length > 0 ? (
                viewMode === 'list' ? (
                  <div className="bg-white min-h-[calc(100vh-182px)] h-full overflow-y-auto pl-4 relative">
                    {selectedItems.length > 0 && (
                      <div
                        className="absolute inset-0 z-0"
                        onClick={handleClearSelection}
                      ></div>
                    )}
                    <table className="min-w-full z-10 relative">
                      <thead className="bg-white w-full font-product-sans sticky top-0 z-10">
                        <tr>
                          {multipleSelect && (
                            <th className="w-10 px-3 py-2">
                              <input
                                type="checkbox"
                                checked={
                                  selectedItems.length ===
                                    filteredFiles.length &&
                                  filteredFiles.length > 0
                                }
                                onChange={toggleSelectAll}
                                className="h-4 w-4 text-primary focus:ring-[#1a73e8]"
                              />
                            </th>
                          )}
                          <th
                            scope="col"
                            className="px-3 py-3 text-left w-[60%] text-xs font-medium text-gray-500 tracking-wider cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSortBy('name')
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                            }}
                          >
                            <div className="flex items-center">
                              Name
                              {sortBy === 'name' && (
                                <ChevronDown
                                  className={`h-4 w-4 ml-1 transition-transform ${
                                    sortOrder === 'desc'
                                      ? 'transform rotate-180'
                                      : ''
                                  }`}
                                />
                              )}
                            </div>
                          </th>
                          {currentView === 'shared' && (
                            <th
                              scope="col"
                              className="px-3 py-3 text-left text-xs font-medium text-gray-500 tracking-wider"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Shared by
                            </th>
                          )}
                          <th
                            scope="col"
                            className="px-3 py-3 text-left w-[17%] text-xs font-medium text-gray-500 tracking-wider cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSortBy('modified')
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                            }}
                          >
                            <div className="flex items-center">
                              Last modified
                              {sortBy === 'modified' && (
                                <ChevronDown
                                  className={`h-4 w-4 ml-1 transition-transform ${
                                    sortOrder === 'desc'
                                      ? 'transform rotate-180'
                                      : ''
                                  }`}
                                />
                              )}
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-3 text-left w-[5%] text-xs font-medium text-gray-500 tracking-wider cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSortBy('size')
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                            }}
                          >
                            <div className="flex items-center truncate">
                              File size
                              {sortBy === 'size' && (
                                <ChevronDown
                                  className={`h-4 w-4 ml-1 transition-transform ${
                                    sortOrder === 'desc'
                                      ? 'transform rotate-180'
                                      : ''
                                  }`}
                                />
                              )}
                            </div>
                          </th>
                          <th
                            scope="col"
                            className="relative w-full pr-7 px-3 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <EllipsisVertical className="h-5 w-5 ml-2 absolute right-7 top-1/2 transform -translate-y-1/2" />
                          </th>
                        </tr>
                      </thead>

                      <tbody className="bg-white font-google-sans table-auto">
                        {filteredFiles.map((file, index) => (
                          <motion.tr
                            key={file.id}
                            className={`transition-colors group cursor-pointer ${selectedItems.includes(file.id) ? 'bg-fore-1 hover:bg-fore-1' : 'hover:bg-gray-800/10'}`}
                            initial={{
                              opacity: 0,
                            }}
                            animate={{
                              opacity: 1,
                            }}
                            transition={{
                              duration: 0.3,
                            }}
                            onDoubleClick={(
                              e: ReactMouseEvent<HTMLElement>
                            ) => {
                              e.stopPropagation()
                              file.mimeType.includes('folder')
                                ? navigateToFolder(file.id)
                                : handleFileAction(file)
                            }}
                            onClick={(e: ReactMouseEvent<HTMLElement>) => {
                              e.stopPropagation()
                              if (
                                (e.target as HTMLInputElement).type !==
                                'checkbox'
                              ) {
                                toggleItemSelection(file.id, index)
                              }
                            }}
                            onContextMenu={(e: React.MouseEvent<HTMLElement>) =>
                              handleContextMenu(e, file)
                            }
                          >
                            {multipleSelect && (
                              <td className="px-3 py-1.5 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedItems.includes(file.id)}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    toggleItemSelection(
                                      file.id,
                                      filteredFiles.indexOf(file)
                                    )
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 rounded text-primary focus:ring-[#1a73e8]"
                                />
                              </td>
                            )}
                            <td className="w-[60%] px-3 py-1.5 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-lg mr-3 ">
                                  {getFileIcon(file.mimeType)}
                                </span>
                                <div className="flex items-center">
                                  {file.mimeType.includes('folder') ? (
                                    <p className="text-sm text-ellipsis overflow-hidden text-gray-900 font-medium">
                                      {file.name}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-ellipsis overflow-hidden text-gray-900 font-medium">
                                      {file.name}
                                    </p>
                                  )}
                                  <div className="flex ml-2">
                                    {file.starred && (
                                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                                    )}
                                    {file.shared && (
                                      <Share2 className="h-4 w-4 text-blue-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {currentView === 'shared' && (
                              <td className="px-3 py-1.5 whitespace-nowrap text-sm text-gray-500">
                                {file.sharedBy || 'example@gmail.com'}
                              </td>
                            )}

                            <td className="w-[17%] px-3 py-1.5 whitespace-nowrap text-sm text-gray-500">
                              {file.modifiedTime
                                ? formatDate(file.modifiedTime)
                                : '-'}
                            </td>
                            <td className="w-[5%] px-3 py-1.5 whitespace-nowrap text-sm text-gray-500">
                              {file.size
                                ? formatFileSize(parseInt(file.size))
                                : '-'}
                            </td>
                            <td className="w-[18%] px-3 py-1.5 justify-end items-end whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex relative justify-end pr-3 space-x-1">
                                <div className="hidden group-hover:flex mr-10 absolute top-0 right-10">
                                  {multipleSelect && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        currentView === 'trash'
                                          ? handleDelete(
                                              file.id,
                                              file.name,
                                              file.mimeType
                                            )
                                          : handleMoveToTrash(file.id)
                                      }}
                                      className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}

                                  {currentView !== 'trash' && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleRename(file)
                                        }}
                                        className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                        title="Rename"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleToggleStar(
                                            file.id,
                                            !file.starred
                                          )
                                        }}
                                        className={`p-1 rounded-full hover:bg-gray-100 ${file.starred ? '!text-yellow-400' : '!text-gray-500'}`}
                                        title={
                                          file.starred
                                            ? 'Remove from starred'
                                            : 'Add to starred'
                                        }
                                      >
                                        <Star className="h-4 w-4" />
                                      </button>

                                      {file.shared ? (
                                        <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleStopSharing(
                                                file.id,
                                                file.name
                                              )
                                            }}
                                            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                            title="Stop sharing"
                                          >
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="16"
                                              height="16"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              className="lucide-restricted"
                                            >
                                              <circle cx="12" cy="12" r="10" />
                                              <line
                                                x1="5.5"
                                                y1="5.5"
                                                x2="18.5"
                                                y2="18.5"
                                              />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              copyShareLink(file.id)
                                            }}
                                            className="p-1 rounded-full hover:bg-gray-100 text-blue-500"
                                            title="Copy share link"
                                          >
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="16"
                                              height="16"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <rect
                                                x="9"
                                                y="9"
                                                width="13"
                                                height="13"
                                                rx="2"
                                                ry="2"
                                              />
                                              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                            </svg>
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleShareFile(file.id, file.name)
                                          }}
                                          className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                          title="Share"
                                        >
                                          <Share2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </>
                                  )}

                                  <button
                                    onClick={() =>
                                      handleMove(
                                        file.id,
                                        file.name,
                                        file.mimeType
                                      )
                                    }
                                    className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                    title="Move"
                                  >
                                    <ArrowUpRight className="h-4 w-4" />
                                  </button>
                                </div>
                                <button
                                  onClick={() =>
                                    handleMove(
                                      file.id,
                                      file.name,
                                      file.mimeType
                                    )
                                  }
                                  className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                  title="Move"
                                >
                                  <EllipsisVertical className="h-5 w-5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-y-auto bg-white min-h-[calc(100vh-185px)] h-full">
                    <div className=" grid grid-cols-1 sm:grid-cols-2 px-5 pt-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredFiles.map((file) => (
                        <motion.div
                          key={file.id}
                          className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow ${selectedItems.includes(file.id) ? 'ring-2 ring-primary' : ''}`}
                          initial={{
                            opacity: 0,
                            scale: 0.95,
                          }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                          }}
                          transition={{
                            duration: 0.3,
                          }}
                          onClick={(e) => {
                            if (
                              (e.target as HTMLInputElement).type !== 'checkbox'
                            ) {
                              toggleItemSelection(
                                file.id,
                                filteredFiles.indexOf(file)
                              )
                            }
                          }}
                          onContextMenu={(e: React.MouseEvent<HTMLElement>) =>
                            handleContextMenu(e, file)
                          }
                        >
                          <div className="relative">
                            <div className="absolute top-2 left-2">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(file.id)}
                                onChange={() =>
                                  toggleItemSelection(
                                    file.id,
                                    filteredFiles.indexOf(file)
                                  )
                                }
                              />
                            </div>
                            <div className="h-32 flex items-center justify-center bg-gray-50 border-b">
                              <span className="text-4xl">
                                {getFileIcon(file.mimeType)}
                              </span>
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="mb-1">
                              {file.mimeType.includes('folder') ? (
                                <button
                                  onClick={() => navigateToFolder(file.id)}
                                  className="text-sm text-gray-900 hover:text-primary hover:underline font-medium truncate block w-full text-left"
                                >
                                  {file.name}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleFileAction(file)}
                                  className="text-sm text-gray-900 hover:text-primary hover:underline truncate block w-full text-left"
                                >
                                  {file.name}
                                </button>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-gray-500">
                                {file.modifiedTime
                                  ? formatDate(file.modifiedTime)
                                  : '-'}
                              </div>
                              <div className="flex space-x-1">
                                {currentView === 'trash' ? (
                                  <button
                                    onClick={() =>
                                      handleRestoreFromTrash(file.id)
                                    }
                                    className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                    title="Restore from trash"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M3 12h18"></path>
                                      <path d="M12 3v18"></path>
                                    </svg>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleRename(file)}
                                      className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                      title="Rename"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleToggleStar(file.id, !file.starred)
                                      }}
                                      className={`p-1 rounded-full hover:bg-gray-100 ${file.starred ? 'text-yellow-400' : 'text-gray-500'}`}
                                      title={
                                        file.starred
                                          ? 'Remove from starred'
                                          : 'Add to starred'
                                      }
                                    >
                                      <Star className="h-4 w-4" />
                                    </button>

                                    {file.shared ? (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleStopSharing(
                                              file.id,
                                              file.name
                                            )
                                          }}
                                          className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                          title="Stop sharing"
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="lucide-restricted"
                                          >
                                            <circle cx="12" cy="12" r="10" />
                                            <line
                                              x1="5.5"
                                              y1="5.5"
                                              x2="18.5"
                                              y2="18.5"
                                            />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            copyShareLink(file.id)
                                          }}
                                          className="p-1 rounded-full hover:bg-gray-100 text-blue-500"
                                          title="Copy share link"
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <rect
                                              x="9"
                                              y="9"
                                              width="13"
                                              height="13"
                                              rx="2"
                                              ry="2"
                                            />
                                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                          </svg>
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleShareFile(file.id, file.name)
                                        }}
                                        className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                        title="Share"
                                      >
                                        <Share2 className="h-4 w-4" />
                                      </button>
                                    )}

                                    <button
                                      onClick={() => handleMoveToTrash(file.id)}
                                      className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                      title="Move to trash"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleMove(
                                          file.id,
                                          file.name,
                                          file.mimeType
                                        )
                                      }
                                      className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                                      title="Move"
                                    >
                                      <ArrowUpRight className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-16 bg-white min-h-[calc(100vh-185px)] h-full">
                  <motion.svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mx-auto mb-4 text-gray-300"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <path
                      d="M20 6H12L10 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V8C22 6.9 21.1 6 20 6ZM20 18H4V6H9.17L11.17 8H20V18ZM14.08 10.62L17.15 13.69L14.08 16.76L12.67 15.34L14.36 13.69L12.66 12.04L14.08 10.62ZM6.92 16.76L9.99 13.69L6.92 10.62L8.34 12.04L10.03 13.69L8.33 15.34L6.92 16.76Z"
                      fill="currentColor"
                    />
                  </motion.svg>
                  <p className="text-gray-500">
                    {searchQuery.trim()
                      ? 'No files/folders found matching your search'
                      : 'This folder is empty'}
                  </p>
                </div>
              )
            ) : (
              <div className="text-center py-16 bg-white min-h-[calc(100vh-185px)] h-full">
                <motion.svg
                  width="64"
                  height="64"
                  viewBox="0 0 87.3 78"
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <path
                    d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
                    fill="#0066da"
                  />
                  <path
                    d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
                    fill="#00ac47"
                  />
                  <path
                    d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
                    fill="#ea4335"
                  />
                  <path
                    d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
                    fill="#00832d"
                  />
                  <path
                    d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
                    fill="#2684fc"
                  />
                  <path
                    d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
                    fill="#ffba00"
                  />
                </motion.svg>
                <h3 className="text-xl font-medium text-gray-700 mb-2">
                  Welcome to Drivogle
                </h3>
                <p className="text-gray-500 mb-6">
                  Store, share, and collaborate on files and folders from any
                  mobile device, tablet, or computer
                </p>
                <motion.button
                  onClick={() => handleListDrive()}
                  className="px-5 py-2.5 bg-[#1a73e8] text-white rounded-lg text-sm font-medium hover:bg-[#1565c0] focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2 shadow-sm hover:shadow-md transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  View My Files
                </motion.button>
              </div>
            )}

            {currentView === 'storage' && (
              <div className="bg-white rounded-xl !text-black shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Storage Details
                </h3>

                {/* Progress Bar Storage */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium">
                      Total Storage Used
                    </div>
                    <div className="text-sm">
                      {formatFileSize(storageQuota.usage)} of{' '}
                      {formatFileSize(storageQuota.limit)}
                    </div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
                    <div
                      className="bg-[#1a73e8] h-full absolute left-0"
                      style={{ width: `${drivePercentage}%` }}
                    ></div>
                    <div
                      className="bg-[#fbbc04] h-full absolute left-0"
                      style={{ width: `${drivePercentage + trashPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0 GB</span>
                    <span>{formatFileSize(storageQuota.limit)}</span>
                  </div>
                </div>

                {/* Detail Storage Breakdown */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Database className="h-5 w-5 text-[#1a73e8] mr-3" />
                      <span className="text-sm font-medium">
                        My Drive Storage
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(storageQuota.usageInDrive)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Trash2 className="h-5 w-5 text-[#fbbc04] mr-3" />
                      <span className="text-sm font-medium">Trash Storage</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(storageQuota.usageInDriveTrash)}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <HardDrive className="h-5 w-5 text-gray-500 mr-3" />
                      <span className="text-sm font-medium">Free Space</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatFileSize(freeSpace)}
                    </div>
                  </div>

                  {/* Info Tambahan */}
                  <div className="mt-6 text-sm text-gray-600">
                    <p>🚀 Max Upload Size: {formatFileSize(maxUploadSize)}</p>
                  </div>

                  <div className="mt-6">
                    <a
                      href="https://one.google.com/storage"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-[#1a73e8] text-white rounded-lg text-sm font-medium hover:bg-[#1565c0] transition-colors"
                    >
                      <span>Buy more storage</span>
                      <ArrowUpRight className="h-4 w-4 ml-2" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {contextMenu.visible && (
        <ContextMenu
          visible={contextMenu.visible}
          position={contextMenu.position}
          onClose={closeContextMenu}
          file={contextMenu.file}
          onRename={handleRename}
          onDelete={(fileId, name, mimeType) =>
            handleDelete(fileId, name, mimeType)
          }
          onMove={(fileId, name, mimeType) =>
            handleMove(fileId, name, mimeType)
          }
          onToggleStar={handleToggleStar}
          onCopy={handleCopy}
          onShare={handleShareFile}
          onStopSharing={handleStopSharing}
          onCopyShareLink={copyShareLink}
          onFileAction={handleFileAction}
          currentView={currentView}
          onRestoreFromTrash={
            currentView === 'trash' ? handleRestoreFromTrash : undefined
          }
        />
      )}

      <Modal
        showModal={showModal}
        modalType={modalType}
        selectedFile={selectedFile}
        setShowModal={setShowModal}
        confirmDelete={confirmDelete}
        confirmMove={confirmMove}
        confirmCreateFolder={confirmCreateFolder}
        targetFolderId={targetFolderId}
        setTargetFolderId={setTargetFolderId}
        availableFolders={availableFolders}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        newFolderInputRef={newFolderInputRef}
        showRenameModal={showRenameModal}
        itemToRename={itemToRename}
        newName={newName}
        setNewName={setNewName}
        isRenaming={isRenaming}
        executeRename={executeRename}
        renameInputRef={renameInputRef}
      />
      {showRenameModal && <RenameModal />}
    </div>
  )
}
