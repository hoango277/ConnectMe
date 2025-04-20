"use client"

import type React from "react"

import { useState, useRef } from "react"
import type { FileAttachment } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Upload, File, Download, FileText, FileImage, FileArchive, FileIcon as FilePdf } from "lucide-react"
import { formatBytes, formatDistanceToNow } from "@/lib/utils"

interface FileSharingProps {
  files: FileAttachment[]
  onUploadFile: (file: File) => void
}

export default function FileSharing({ files, onUploadFile }: FileSharingProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFile(e.target.files[0])
      e.target.value = "" // Reset input
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFile(e.dataTransfer.files[0])
    }
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()

    switch (extension) {
      case "pdf":
        return <FilePdf className="h-6 w-6 text-red-500" />
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <FileImage className="h-6 w-6 text-blue-500" />
      case "zip":
      case "rar":
      case "7z":
        return <FileArchive className="h-6 w-6 text-yellow-500" />
      case "doc":
      case "docx":
      case "txt":
        return <FileText className="h-6 w-6 text-blue-500" />
      default:
        return <File className="h-6 w-6 text-gray-500" />
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-gray-900 dark:text-white">Shared Files</h3>
      </div>

      {/* File upload area */}
      <div
        className={`m-3 p-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer ${
          isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-700"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
        <Upload className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Click to upload or drag and drop</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
          Share files with meeting participants
        </p>
      </div>

      {/* Files list */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <p>No files have been shared yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {files.map((file) => (
              <li key={file.id} className="p-3">
                <div className="flex items-start">
                  {getFileIcon(file.name)}
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                        {file.name}
                      </span>
                      <Button size="icon" variant="ghost" className="h-7 w-7">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-1 flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatBytes(file.size)}</span>
                      <span className="mx-1">•</span>
                      <span>Shared by {file.uploaderName}</span>
                      <span className="mx-1">•</span>
                      <span>{formatDistanceToNow(file.timestamp)}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
