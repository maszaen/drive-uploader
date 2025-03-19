'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  Loader,
  AlertTriangle,
} from 'lucide-react'

interface FolderItem {
  id: string
  name: string
  parentId?: string | null
}

interface TreeViewProps {
  selectedFolderId: string | null
  onSelectFolder: (folderId: string, name: string) => void
  excludeFolderIds?: string[]
  currentFolderId?: string | null
}

const FolderTreeView = ({
  selectedFolderId,
  onSelectFolder,
  excludeFolderIds = [],
  currentFolderId = null,
}: TreeViewProps) => {
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['root'])
  )
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set())
  const [folderChildren, setFolderChildren] = useState<
    Record<string, FolderItem[]>
  >({})
  const [loadedFolders, setLoadedFolders] = useState<Set<string>>(new Set())

  // Automatically expand current folder's path
  useEffect(() => {
    if (currentFolderId) {
      // This would ideally be expanded based on folder path, but for now just expand the current folder
      setExpandedFolders((prev) => {
        const newSet = new Set(prev)
        newSet.add(currentFolderId)
        return newSet
      })
    }
  }, [currentFolderId])

  // Initial load of root folders
  useEffect(() => {
    fetchFolders('root')
  }, [excludeFolderIds])

  const fetchFolders = async (parentId: string = 'root') => {
    if (loadedFolders.has(parentId)) {
      return // Don't reload folders we've already loaded
    }

    try {
      setLoadingFolders((prev) => new Set(prev).add(parentId))
      setError(null)

      const queryParams = new URLSearchParams()
      if (parentId && parentId !== 'root') {
        queryParams.append('folderId', parentId)
      }
      queryParams.append('foldersOnly', 'true')

      const res = await fetch(`/api/list?${queryParams.toString()}`)

      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ message: 'Gagal mengambil data folder' }))
        throw new Error(
          errorData.message || `Error ${res.status}: ${res.statusText}`
        )
      }

      const data = await res.json()

      // Filter out the folders that should be excluded
      const filteredFolders =
        data.files?.filter(
          (file: any) =>
            file.mimeType?.includes('folder') &&
            !excludeFolderIds.includes(file.id)
        ) || []

      if (parentId === 'root') {
        // For root level, set the main folders array
        setFolders(filteredFolders)
      } else {
        // For subfolders, update the folderChildren state
        setFolderChildren((prev) => ({
          ...prev,
          [parentId]: filteredFolders,
        }))
      }

      // Mark this folder as loaded
      setLoadedFolders((prev) => {
        const newSet = new Set(prev)
        newSet.add(parentId)
        return newSet
      })
    } catch (error) {
      console.error('Error fetching folders:', error)
      setError(
        error instanceof Error ? error.message : 'Gagal mengambil data folder'
      )

      // Set empty folders for this parent to prevent infinite loading state
      if (parentId === 'root') {
        setFolders([])
      } else {
        setFolderChildren((prev) => ({
          ...prev,
          [parentId]: [],
        }))
      }
    } finally {
      setLoadingFolders((prev) => {
        const newSet = new Set(prev)
        newSet.delete(parentId)
        return newSet
      })
      setLoading(false)
    }
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)

    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
      // If we don't have children loaded yet, fetch them
      if (!folderChildren[folderId]) {
        fetchFolders(folderId)
      }
    }

    setExpandedFolders(newExpanded)
  }

  // Memoize whether a folder should be disabled (can't move to itself or excluded folders)
  const isDisabled = useMemo(() => {
    return (folderId: string) => {
      return excludeFolderIds.includes(folderId)
    }
  }, [excludeFolderIds])

  const renderFolder = (folder: FolderItem, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isSelected = selectedFolderId === folder.id
    const isLoading = loadingFolders.has(folder.id)
    const children = folderChildren[folder.id] || []
    const hasLoadedChildren = loadedFolders.has(folder.id)
    const folderDisabled = isDisabled(folder.id)

    // A folder might have children if:
    // 1. We've loaded children and there are some, or
    // 2. We haven't loaded children yet (we don't know)
    const hasChildren = children.length > 0 || !hasLoadedChildren

    return (
      <div key={folder.id} className="select-none text-black">
        <div
          className={`flex text-black items-center px-2 py-1.5 hover:bg-gray-100 cursor-pointer ${
            isSelected ? 'bg-blue-100' : ''
          } ${folderDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          <div
            className="w-5 flex-shrink-0 flex justify-center"
            onClick={() => toggleFolder(folder.id)}
          >
            {isLoading ? (
              <Loader className="w-4 h-4 text-gray-400 animate-spin" />
            ) : hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )
            ) : (
              <span className="w-4" />
            )}
          </div>

          <div
            className="flex items-center flex-grow py-1"
            onClick={() =>
              !folderDisabled && onSelectFolder(folder.id, folder.name)
            }
          >
            <Folder className="w-4 h-4 text-gray-500 mr-2" />
            <span className="text-sm truncate">{folder.name}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="ml-3">
            {children.map((childFolder) =>
              renderFolder(childFolder, level + 1)
            )}

            {!hasLoadedChildren && !isLoading && (
              <div
                className="text-xs text-blue-500 px-2 py-1 cursor-pointer hover:underline"
                style={{ paddingLeft: `${level * 16 + 24}px` }}
                onClick={() => fetchFolders(folder.id)}
              >
                Muat subfolder
              </div>
            )}

            {children.length === 0 && hasLoadedChildren && !isLoading && (
              <div
                className="text-xs text-gray-500 px-2 py-1"
                style={{ paddingLeft: `${level * 16 + 24}px` }}
              >
                Tidak ada subfolder
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 border rounded-md bg-white">
        <Loader className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 border rounded-md bg-white">
        <AlertTriangle className="w-6 h-6 text-yellow-500 mb-2" />
        <p className="text-sm text-gray-700">{error}</p>
        <button
          className="mt-3 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          onClick={() => fetchFolders('root')}
        >
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <div className="border text-black rounded-md overflow-auto max-h-64 bg-white">
      <div className="p-1">
        <div
          className={`flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer ${
            selectedFolderId === 'root' ? 'bg-blue-100' : ''
          }`}
          onClick={() => onSelectFolder('root', 'My Drive')}
        >
          <Folder className="w-4 h-4 text-gray-500 mr-2" />
          <span className="text-sm font-medium">My Drive</span>
        </div>

        {folders.map((folder) => renderFolder(folder))}

        {folders.length === 0 && (
          <div className="text-sm text-gray-500 p-3">
            Tidak ada folder ditemukan
          </div>
        )}
      </div>
    </div>
  )
}

export default FolderTreeView
