import React, { useState } from 'react'
import { supabase, getSessionHeaders } from '@/lib/supabaseClient'
import { Input } from '@/components/base/input/input'
import { FileUpload, getReadableFileSize, UploadedFile } from '@/components/base/file-upload/file-upload'
import LocationDropdown from '@/components/ui/LocationDropdown'
import { ALL_LOCATIONS } from '@/lib/ghanaLocations'

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string;
  initialUsername?: string;
  initialPhone?: string;
  initialWhatsAppPhone?: string;
  initialWhatsAppOptIn?: boolean;
  initialWhatsAppMarketingOptIn?: boolean;
  initialAddress?: string;
  initialDeliveryLocation?: string | null;
  initialAvatarUrl?: string | null;
  onSaved?: (d: {
    username?: string;
    phone?: string;
    whatsappPhone?: string;
    whatsappOptIn?: boolean;
    whatsappMarketingOptIn?: boolean;
    address?: string;
    deliveryLocation?: string;
    avatarUrl?: string;
  }) => void;
};

export default function EditProfileModal({
  open,
  onClose,
  userId,
  initialUsername,
  initialPhone,
  initialWhatsAppPhone,
  initialWhatsAppOptIn,
  initialWhatsAppMarketingOptIn,
  initialAddress,
  initialDeliveryLocation,
  initialAvatarUrl,
  onSaved,
}: Props) {
  const [username, setUsername] = useState(initialUsername ?? '')
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [whatsappPhone, setWhatsappPhone] = useState(initialWhatsAppPhone ?? '')
  const [whatsappOptIn, setWhatsappOptIn] = useState(Boolean(initialWhatsAppOptIn))
  const [whatsappMarketingOptIn, setWhatsappMarketingOptIn] = useState(Boolean(initialWhatsAppMarketingOptIn))
  const [address, setAddress] = useState(initialAddress ?? '')
  const [deliveryLocation, setDeliveryLocation] = useState(initialDeliveryLocation ?? '')
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

        const headers = await getSessionHeaders()
        const res = await fetch('/api/upload/avatar', {
          method: 'POST',
          headers,
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

      const updates: Record<string, string | boolean | null> = {
        username: username || null,
        phone: phone || null,
        whatsapp_phone: whatsappPhone || null,
        whatsapp_opt_in: whatsappOptIn,
        whatsapp_marketing_opt_in: whatsappMarketingOptIn,
        whatsapp_opt_in_at: whatsappOptIn ? new Date().toISOString() : null,
        address: address || null,
        delivery_location: deliveryLocation || null,
      }

      if (avatarUrl) updates.avatar_url = avatarUrl

      const { error: updateErr } = await supabase.from('profiles').update(updates).eq('id', userId)

      if (updateErr) {
        console.error('Profile update error:', updateErr)
        throw new Error(`Profile update failed: ${updateErr.message}`)
      }

      console.log('Profile updated successfully')
      onSaved?.({
        username,
        phone,
        whatsappPhone,
        whatsappOptIn,
        whatsappMarketingOptIn,
        address,
        deliveryLocation,
        avatarUrl: avatarUrl ?? undefined,
      })
      onClose()
    } catch (err: unknown) {
      console.error('Profile save error:', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      alert(`Failed to save profile: ${message}`)
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

            <Input
              label="WhatsApp Number"
              type="tel"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              placeholder="+233 24 000 0000"
            />
          </div>

          <div className="space-y-2 rounded-lg border border-gray-200 p-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(event) => setWhatsappOptIn(event.target.checked)}
              />
              Receive auction/payment/delivery alerts on WhatsApp
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={whatsappMarketingOptIn}
                onChange={(event) => setWhatsappMarketingOptIn(event.target.checked)}
                disabled={!whatsappOptIn}
              />
              Receive marketing updates on WhatsApp
            </label>
          </div>


          <Input
            label="Home Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your Home address"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Default Delivery Location</label>
            <LocationDropdown
              locations={ALL_LOCATIONS}
              value={deliveryLocation || null}
              onChange={setDeliveryLocation}
              placeholder="Select your default location"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
            <FileUpload.Root>
              <FileUpload.DropZone
                maxSize={5 * 1024 * 1024}
                hint="Upload an image (max 5MB)"
                onDropFiles={handleDropFiles}
                onSizeLimitExceed={() => {
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
