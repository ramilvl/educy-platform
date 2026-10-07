'use client'

import { useState } from 'react'

export interface LessonMaterial {
  fileId: string
  fileKey: string
  filename: string
  url: string
  type: 'file' | 'link'
}

interface LessonMaterialsManagerProps {
  materials: LessonMaterial[]
  onMaterialsChange: (materials: LessonMaterial[]) => void
  disabled?: boolean
}

export default function LessonMaterialsManager({
  materials,
  onMaterialsChange,
  disabled = false,
}: LessonMaterialsManagerProps) {
  const [uploading, setUploading] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [error, setError] = useState('')

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (max 50MB for course materials)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB')
      return
    }

    setError('')
    setUploading(true)

    try {
      // Get signed upload URL
      const urlResponse = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          context: 'lesson',
        }),
      })

      const urlData = await urlResponse.json()
      if (!urlResponse.ok) throw new Error(urlData.error || 'Failed to get upload URL')

      // Upload to R2
      await fetch(urlData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      // Confirm upload
      await fetch(`/api/files/${urlData.fileId}/confirm`, {
        method: 'POST',
      })

      // Add to materials list
      const publicUrl = `https://pub-f850e88d52e84edba2e5b82a80ba3126.r2.dev/${urlData.fileKey}`
      const newMaterial: LessonMaterial = {
        fileId: urlData.fileId,
        fileKey: urlData.fileKey,
        filename: file.name,
        url: publicUrl,
        type: 'file',
      }

      onMaterialsChange([...materials, newMaterial])

      // Reset file input
      e.target.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleAddLink = () => {
    if (!linkUrl.trim() || !linkTitle.trim()) {
      setError('Both URL and title are required')
      return
    }

    // Validate URL format
    try {
      new URL(linkUrl)
    } catch {
      setError('Please enter a valid URL')
      return
    }

    const newMaterial: LessonMaterial = {
      fileId: '', // No fileId for links
      fileKey: linkUrl,
      filename: linkTitle,
      url: linkUrl,
      type: 'link',
    }

    onMaterialsChange([...materials, newMaterial])
    setLinkUrl('')
    setLinkTitle('')
    setShowLinkForm(false)
    setError('')
  }

  const handleRemoveMaterial = (index: number) => {
    onMaterialsChange(materials.filter((_, i) => i !== index))
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()

    if (ext === 'pdf') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 18h12V6h-4V2H4v16zm-2 1V0h12l4 4v16H2v-1z"/>
        </svg>
      )
    } else if (['doc', 'docx'].includes(ext || '')) {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 2h8l4 4v12H4V2zm1 1v14h10V7h-3V3H5z"/>
        </svg>
      )
    } else if (['ppt', 'pptx'].includes(ext || '')) {
      return (
        <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 2h8l4 4v12H4V2zm1 1v14h10V7h-3V3H5z"/>
        </svg>
      )
    }

    return (
      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 2h8l4 4v12H4V2zm1 1v14h10V7h-3V3H5z"/>
      </svg>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          Course Materials
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowLinkForm(!showLinkForm)}
            disabled={disabled}
            className="text-xs sm:text-sm px-3 py-1.5 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            + Add Link
          </button>
          <label className="text-xs sm:text-sm px-3 py-1.5 border border-[#5C2482] text-[#5C2482] rounded-lg hover:bg-purple-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition">
            + Upload File
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={disabled || uploading}
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs sm:text-sm mb-3">
          {error}
        </div>
      )}

      {uploading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-xs sm:text-sm mb-3">
          Uploading file...
        </div>
      )}

      {/* Link Form */}
      {showLinkForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
          <h4 className="font-medium text-blue-900 mb-3 text-sm">Add Hyperlink</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-blue-900 mb-1">
                Link Title *
              </label>
              <input
                type="text"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="e.g., Additional Reading Material"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-900 mb-1">
                URL *
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium"
              >
                Add Link
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLinkForm(false)
                  setLinkUrl('')
                  setLinkTitle('')
                  setError('')
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Materials List */}
      {materials.length > 0 ? (
        <div className="space-y-2">
          {materials.map((material, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {material.type === 'link' ? (
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                ) : (
                  <div className="flex-shrink-0">{getFileIcon(material.filename)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {material.filename}
                  </p>
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 truncate block"
                  >
                    {material.type === 'link' ? material.url : 'View file'}
                  </a>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveMaterial(index)}
                disabled={disabled}
                className="ml-3 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-gray-50 border border-gray-200 rounded-lg">
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-gray-500">No materials added yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Upload files (PDF, DOC, PPT) or add links to external resources
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        Supported file types: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG (max 50MB)
      </p>
    </div>
  )
}
