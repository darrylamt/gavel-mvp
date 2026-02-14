import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/base/input/input'
import { FileUpload, getReadableFileSize, UploadedFile } from '@/components/base/file-upload/file-upload'

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  initialUsername?: string | null
  initialPhone?: string
  initialAddress?: string
  initialAvatarUrl?: string | null
  onSaved?: (data: { username?: string; phone?: string; address?: string; avatarUrl?: string | null }) => void
}

export default function EditProfileModal({
  open,
  onClose,
  userId,
  initialUsername,
  initialPhone,
  initialAddress,
  initialAvatarUrl,
  onSaved,
}: Props) {
  const [username, setUsername] = useState(initialUsername ?? '')
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [address, setAddress] = useState(initialAddress ?? '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleDropFiles = (files: FileList) => {
    if (files.length > 0) {
      setAvatarFile(files[0])
      const f = files[0]
      setUploadedFiles([
        {
          id: '1',
          name: f.name,
          size: f.size,
          type: f.type,
          progress: 100,
        },
      ])
    }
  }

  const handleDeleteFile = () => {
    setAvatarFile(null)
    setUploadedFiles([])
  }

  const handleSave = async () => {
    setSaving(true)

    let avatarUrl = initialAvatarUrl ?? null

    try {
      if (avatarFile) {
        console.log('Uploading avatar via API')
        const formData = new FormData()
        formData.append('file', avatarFile)
        formData.append('userId', userId)

        const res = await fetch('/api/upload/avatar', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Avatar upload failed')
        }

        const data = await res.json()
        avatarUrl = data.url
        console.log('Avatar uploaded successfully:', avatarUrl)
      }

      const updates: any = {
        username: username || null,
        phone: phone || null,
        address: address || null,
      }

      if (avatarUrl) updates.avatar_url = avatarUrl

      const { error: updateErr } = await supabase.from('profiles').update(updates).eq('id', userId)

      if (updateErr) {
        console.error('Profile update error:', updateErr)
        throw new Error(`Profile update failed: ${updateErr.message}`)
      }

      console.log('Profile updated successfully')
      onSaved?.({ username, phone, address, avatarUrl })
      onClose()
    } catch (err: any) {
      console.error('Profile save error:', err)
      alert(`Failed to save profile: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-6 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-lg my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Edit Personal Information</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your full name"
            />

            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <Input
            label="Home Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your Home address"
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
            <FileUpload.Root>
              <FileUpload.DropZone
                maxSize={5 * 1024 * 1024}
                hint="Upload an image (max 5MB)"
                onDropFiles={handleDropFiles}
                onSizeLimitExceed={(files) => {
                  alert(`File too large. Max size: ${getReadableFileSize(5 * 1024 * 1024)}`)
                }}
              />
              {uploadedFiles.length > 0 && (
                <FileUpload.List>
                  {uploadedFiles.map((file) => (
                    <FileUpload.ListItemProgressBar
                      key={file.id}
                      {...file}
                      onDelete={() => handleDeleteFile()}
                      onRetry={() => {}}
                    />
                  ))}
                </FileUpload.List>
              )}
              {initialAvatarUrl && !avatarFile && (
                <div className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={initialAvatarUrl}
                    alt="Current avatar"
                    className="w-20 h-20 rounded-full mx-auto mt-2 border"
                  />
                </div>
              )}
            </FileUpload.Root>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
