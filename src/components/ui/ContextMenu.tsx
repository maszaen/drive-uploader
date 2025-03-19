'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pencil,
  Trash2,
  Star,
  Share2,
  Copy,
  ArrowRight,
  FileUp,
  Eye,
  Download,
  X,
} from 'lucide-react'

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

interface ContextMenuProps {
  visible: boolean
  position: { x: number; y: number }
  onClose: () => void
  file: FileItem | null
  onRename: (file: FileItem) => void
  onDelete: (fileId: string, name: string, mimeType: string) => void
  onMove: (fileId: string, name: string, mimeType: string) => void
  onToggleStar: (fileId: string, starred: boolean) => void
  onCopy: () => void
  onShare: (fileId: string, name: string) => void
  onStopSharing: (fileId: string, name: string) => void
  onCopyShareLink: (fileId: string) => void
  onFileAction: (file: FileItem) => void
  currentView: string
  onRestoreFromTrash?: (fileId: string) => void
}

const ContextMenu = ({
  visible,
  position,
  onClose,
  file,
  onRename,
  onDelete,
  onMove,
  onToggleStar,
  onCopy,
  onShare,
  onStopSharing,
  onCopyShareLink,
  onFileAction,
  currentView,
  onRestoreFromTrash,
}: ContextMenuProps) => {
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // Adjust position to ensure menu stays within viewport
  useEffect(() => {
    if (visible && file) {
      const menuWidth = 220 // approximate width of menu
      const menuHeight = 350 // approximate max height of menu

      const rightEdge = position.x + menuWidth
      const bottomEdge = position.y + menuHeight

      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      let adjustedX = position.x
      let adjustedY = position.y

      if (rightEdge > windowWidth) {
        adjustedX = windowWidth - menuWidth - 10
      }

      if (bottomEdge > windowHeight) {
        adjustedY = windowHeight - menuHeight - 10
      }

      setAdjustedPosition({ x: adjustedX, y: adjustedY })
    }
  }, [visible, position, file])

  // Close menu when clicking outside
  useEffect(() => {
    if (visible) {
      const handleClickOutside = () => {
        onClose()
      }

      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [visible, onClose])

  // Close menu on escape key
  useEffect(() => {
    if (visible) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [visible, onClose])

  if (!visible || !file) return null

  const canPreview = !file.mimeType.includes('folder')
  const isInTrash = currentView === 'trash'

  return (
    <motion.div
      className="fixed z-50 bg-white rounded-lg shadow-lg text-sm border border-gray-200 py-1 w-56"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {canPreview && !isInTrash && (
        <button
          onClick={() => {
            onFileAction(file)
            onClose()
          }}
          className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
        >
          <Eye className="w-4 h-4 mr-3" />
          <span>Open</span>
        </button>
      )}

      {isInTrash ? (
        <button
          onClick={() => {
            onRestoreFromTrash && onRestoreFromTrash(file.id)
            onClose()
          }}
          className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
        >
          <FileUp className="w-4 h-4 mr-3" />
          <span>Restore</span>
        </button>
      ) : (
        <>
          {!file.mimeType.includes('folder') && (
            <button
              onClick={() => {
                // Implement download functionality
                onClose()
              }}
              className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
            >
              <Download className="w-4 h-4 mr-3" />
              <span>Download</span>
            </button>
          )}

          <button
            onClick={() => {
              onRename(file)
              onClose()
            }}
            className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
          >
            <Pencil className="w-4 h-4 mr-3" />
            <span>Rename</span>
          </button>

          <button
            onClick={() => {
              onMove(file.id, file.name, file.mimeType)
              onClose()
            }}
            className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
          >
            <ArrowRight className="w-4 h-4 mr-3" />
            <span>Move to</span>
          </button>

          <button
            onClick={() => {
              onToggleStar(file.id, !file.starred)
              onClose()
            }}
            className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
          >
            <Star
              className={`w-4 h-4 mr-3 ${file.starred ? 'text-yellow-400' : ''}`}
            />
            <span>{file.starred ? 'Remove star' : 'Add star'}</span>
          </button>

          <div className="border-t border-gray-200 my-1"></div>

          <button
            onClick={() => {
              onCopy()
              onClose()
            }}
            className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
          >
            <Copy className="w-4 h-4 mr-3" />
            <span>Make a copy</span>
          </button>

          {file.shared ? (
            <>
              <button
                onClick={() => {
                  onStopSharing(file.id, file.name)
                  onClose()
                }}
                className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                <X className="w-4 h-4 mr-3" />
                <span>Stop sharing</span>
              </button>
              <button
                onClick={() => {
                  onCopyShareLink(file.id)
                  onClose()
                }}
                className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
              >
                <Share2 className="w-4 h-4 mr-3 text-blue-500" />
                <span>Copy link</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onShare(file.id, file.name)
                onClose()
              }}
              className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-gray-700"
            >
              <Share2 className="w-4 h-4 mr-3" />
              <span>Share</span>
            </button>
          )}

          <div className="border-t border-gray-200 my-1"></div>

          <button
            onClick={() => {
              onDelete(file.id, file.name, file.mimeType)
              onClose()
            }}
            className="flex items-center w-full px-4 py-2 hover:bg-gray-100 text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-3" />
            <span>Remove</span>
          </button>
        </>
      )}
    </motion.div>
  )
}

export default ContextMenu
