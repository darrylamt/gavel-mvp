import React, { useState, ReactNode } from 'react'
import { Upload, X, RotateCcw } from 'lucide-react'

export type UploadedFile = {
  id: string
  name: string
  size: number
  type: string
  progress: number
  failed?: boolean
}

export const getReadableFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(2)} ${units[unitIndex]}`
}

type FileUploadRootProps = {
  children: ReactNode
}

export const FileUploadRoot: React.FC<FileUploadRootProps> = ({ children }) => {
  return <div className="space-y-4">{children}</div>
}

type DropZoneProps = {
  maxSize?: number
  hint?: string
  onDropFiles: (files: FileList) => void
  onSizeLimitExceed?: (files: FileList) => void
}

export const FileUploadDropZone: React.FC<DropZoneProps> = (props) => {
  const {
    maxSize = Number.MAX_SAFE_INTEGER,
    hint,
    onDropFiles,
    onSizeLimitExceed,
  } = props
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    const files = e.dataTransfer.files
    if (!files) return

    // Check size limit
    let exceeds = false
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > maxSize) {
        exceeds = true
        break
      }
    }

    if (exceeds) {
      onSizeLimitExceed?.(files)
    } else {
      onDropFiles(files)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files) return

    let exceeds = false
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > maxSize) {
        exceeds = true
        break
      }
    }

    if (exceeds) {
      onSizeLimitExceed?.(files)
    } else {
      onDropFiles(files)
    }
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragEnter}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
        isDragActive ? 'border-black bg-gray-50' : 'border-gray-300'
      }`}
    >
      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
      <p className="text-sm font-medium text-gray-700 mb-1">Drag and drop files here</p>
      {hint && <p className="text-xs text-gray-500 mb-3">{hint}</p>}
      <label className="inline-block">
        <span className="text-sm text-black font-medium cursor-pointer hover:underline">or click to select</span>
        <input type="file" multiple onChange={handleInputChange} className="hidden" />
      </label>
    </div>
  )
}

type ListProps = {
  children: ReactNode
}

export const FileUploadList: React.FC<ListProps> = ({ children }) => {
  return <div className="space-y-2">{children}</div>
}

type ListItemProgressBarProps = UploadedFile & {
  onDelete: () => void
  onRetry: () => void
}

export const FileUploadListItemProgressBar: React.FC<ListItemProgressBarProps> = ({
  id,
  name,
  size,
  progress,
  failed,
  onDelete,
  onRetry,
}) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{name}</p>
        <p className="text-xs text-gray-500">{getReadableFileSize(size)}</p>
        <div className="mt-2 bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all ${failed ? 'bg-red-500' : 'bg-black'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {failed && (
          <button onClick={onRetry} className="p-1 hover:bg-gray-200 rounded" title="Retry">
            <RotateCcw className="h-4 w-4 text-gray-600" />
          </button>
        )}
        <button onClick={onDelete} className="p-1 hover:bg-gray-200 rounded" title="Delete">
          <X className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    </div>
  )
}

export const FileUpload = {
  Root: FileUploadRoot,
  DropZone: FileUploadDropZone,
  List: FileUploadList,
  ListItemProgressBar: FileUploadListItemProgressBar,
}
