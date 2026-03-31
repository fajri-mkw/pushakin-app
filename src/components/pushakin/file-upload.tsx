'use client'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { 
  UploadCloud, 
  X, 
  FileIcon, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useState, useRef, useCallback } from 'react'

interface FileUploadProps {
  folderLink: string // Google Drive folder link
  projectId: string
  onUploadComplete?: (file: { name: string; webViewLink: string }) => void
  className?: string
}

interface UploadingFile {
  id: string
  name: string
  size: number
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
  webViewLink?: string
}

// Extract Google Drive folder ID from URL
function extractFolderId(url: string): string | null {
  if (!url) return null
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

export function FileUpload({ folderLink, projectId, onUploadComplete, className }: FileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const uploadFile = async (file: File): Promise<void> => {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const folderId = extractFolderId(folderLink)
    
    if (!folderId) {
      setUploadingFiles(prev => [...prev, {
        id: fileId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'error',
        error: 'Invalid folder link'
      }])
      return
    }
    
    // Add file to uploading list
    setUploadingFiles(prev => [...prev, {
      id: fileId,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading'
    }])

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folderId', folderId)
      formData.append('projectId', projectId)

      // Simulate progress (since we can't track actual progress with fetch)
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => prev.map(f => 
          f.id === fileId && f.progress < 90 
            ? { ...f, progress: f.progress + 10 } 
            : f
        ))
      }, 100)

      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)

      if (response.ok) {
        const data = await response.json()
        
        setUploadingFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, progress: 100, status: 'success', webViewLink: data.file?.webViewLink }
            : f
        ))

        if (onUploadComplete && data.file) {
          onUploadComplete(data.file)
        }
      } else {
        const error = await response.json()
        throw new Error(error.details || error.error || 'Upload failed')
      }
    } catch (error) {
      setUploadingFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ))
    }
  }

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    
    Array.from(files).forEach(file => {
      uploadFile(file)
    })
  }, [folderLink, projectId])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const clearCompleted = () => {
    setUploadingFiles(prev => prev.filter(f => f.status === 'uploading'))
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
          isDragging 
            ? "border-indigo-500 bg-indigo-50" 
            : "border-stone-300 hover:border-indigo-400 hover:bg-stone-50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        
        <UploadCloud className={cn(
          "w-10 h-10 mx-auto mb-3",
          isDragging ? "text-indigo-600" : "text-stone-400"
        )} />
        
        <p className="text-sm font-medium text-stone-700 mb-1">
          {isDragging ? 'Lepaskan file di sini' : 'Klik atau seret file ke sini'}
        </p>
        <p className="text-xs text-stone-500">
          Dukung berbagai format: gambar, video, dokumen, dll.
        </p>
      </div>

      {/* Upload Progress List */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              File ({uploadingFiles.length})
            </span>
            {uploadingFiles.some(f => f.status !== 'uploading') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCompleted}
                className="h-6 text-xs text-stone-500"
              >
                Hapus Selesai
              </Button>
            )}
          </div>

          {uploadingFiles.map(file => (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                file.status === 'success' && "bg-green-50 border-green-200",
                file.status === 'error' && "bg-red-50 border-red-200",
                file.status === 'uploading' && "bg-white border-stone-200"
              )}
            >
              <FileIcon className={cn(
                "w-5 h-5 flex-shrink-0",
                file.status === 'success' && "text-green-600",
                file.status === 'error' && "text-red-500",
                file.status === 'uploading' && "text-indigo-600"
              )} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-stone-700 truncate" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-stone-500 ml-2 flex-shrink-0">
                    {formatFileSize(file.size)}
                  </span>
                </div>

                {file.status === 'uploading' && (
                  <Progress value={file.progress} className="h-1.5" />
                )}

                {file.status === 'error' && file.error && (
                  <p className="text-xs text-red-600 mt-1">{file.error}</p>
                )}

                {file.status === 'success' && file.webViewLink && (
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:text-green-700 hover:underline mt-1 block"
                  >
                    Lihat di Google Drive
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                {file.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                )}
                {file.status === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                {file.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="h-6 w-6 p-0 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
