'use client'

import { useEffect, RefObject } from 'react'

import FolderTreeView from './FolderTreeView'

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

type ModalTypes = 'delete' | 'move' | 'createFolder'

interface ModalProps {
  showModal: boolean
  modalType: ModalTypes
  selectedFile: FileItem | null
  setShowModal: (show: boolean) => void
  confirmDelete: () => void
  confirmMove: () => void
  confirmCreateFolder: () => void
  targetFolderId: string | null
  setTargetFolderId: (id: string) => void
  availableFolders: FolderPath[]
  newFolderName: string
  setNewFolderName: (name: string) => void
  newFolderInputRef: RefObject<HTMLInputElement | null>
  // Rename modal props
  showRenameModal: boolean
  itemToRename: FileItem | null
  newName: string
  setNewName: (name: string) => void
  isRenaming: boolean
  executeRename: () => void
  renameInputRef: RefObject<HTMLInputElement | null>
}

const Modal = ({
  showModal,
  modalType,
  selectedFile,
  setShowModal,
  confirmDelete,
  confirmMove,
  confirmCreateFolder,
  targetFolderId,
  setTargetFolderId,
  availableFolders,
  newFolderName,
  setNewFolderName,
  newFolderInputRef,
  // Rename modal props
  showRenameModal,
  itemToRename,
  newName,
  setNewName,
  isRenaming,
  executeRename,
  renameInputRef,
}: ModalProps) => {
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
  }, [showModal, modalType, newFolderInputRef])

  useEffect(() => {
    if (showRenameModal && renameInputRef.current) {
      setTimeout(() => {
        if (renameInputRef.current) {
          renameInputRef.current.focus()
          renameInputRef.current.select()
        }
      }, 50)
    }
  }, [showRenameModal, renameInputRef])

  if (!showModal && !showRenameModal) return null

  if (showRenameModal && itemToRename) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 bg-black/30 z-9999 flex items-center justify-center">
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
              onClick={() => setShowModal(false)}
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 bg-black/30 z-9999 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-4 px-6 pt-5 w-full max-w-md mx-4">
        {modalType === 'delete' && selectedFile && (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete "{selectedFile.name}"?
              {selectedFile.mimeType === 'batch' && (
                <span className="block mt-2 text-sm text-red-500">
                  This action cannot be undone.
                </span>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-full hover:bg-base text-primary text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-full hover:bg-red/10 text-red text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </>
        )}

        {modalType === 'move' && selectedFile && (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Move "{selectedFile.name}"
            </h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Destination Folder
              </label>
              <FolderTreeView
                selectedFolderId={targetFolderId}
                onSelectFolder={(folderId, _) => setTargetFolderId(folderId)}
                excludeFolderIds={[selectedFile.id]}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-full hover:bg-base text-primary text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmMove}
                disabled={!targetFolderId}
                className={`px-4 py-2 ${
                  !targetFolderId
                    ? '!text-black/50 cursor-default'
                    : 'hover:bg-base !rounded-full !text-primary'
                } text-sm font-medium transition-colors`}
              >
                Move
              </button>
            </div>
          </>
        )}

        {modalType === 'createFolder' && (
          <>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Create New Folder
            </h3>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                ref={newFolderInputRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full border border-gray-300 text-black rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter folder name"
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-full hover:bg-base text-primary text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreateFolder}
                disabled={!newFolderName}
                className={`px-4 py-2 ${
                  !newFolderName
                    ? '!text-black/50 cursor-default'
                    : 'hover:bg-base !rounded-full !text-primary'
                } text-sm font-medium transition-colors`}
              >
                Create Folder
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Modal
