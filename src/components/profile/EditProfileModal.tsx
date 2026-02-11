import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  initialUsername?: string | null
  initialPhone?: string
  initialAddress?: string
  initialAvatarUrl?: string | null
  onSaved?: (data: { username?: string; phone?: string; address?: string; avatarUrl?: string }) => void
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
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setAvatarFile(f)
  }

  const handleSave = async () => {
    setSaving(true)

    let avatarUrl = initialAvatarUrl ?? null

    try {
      if (avatarFile) {
        const filename = `${userId}/${Date.now()}-${avatarFile.name}`
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(filename, avatarFile, { upsert: true })

        if (uploadErr) throw uploadErr

        const { data } = supabase.storage.from('avatars').getPublicUrl(filename)
        avatarUrl = data.publicUrl
      }

      const updates: any = {
        username: username || null,
        phone: phone || null,
        address: address || null,
      }

      if (avatarUrl) updates.avatar_url = avatarUrl

      await supabase.from('profiles').update(updates).eq('id', userId)

      onSaved?.({ username, phone, address, avatarUrl })
      onClose()
    } catch (err) {
      console.error('Profile save error', err)
      alert('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-6">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Personal Information</h2>
          <button onClick={onClose} className="text-gray-500">✕</button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium">Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium">Profile Picture</label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {initialAvatarUrl && !avatarFile && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={initialAvatarUrl} alt="avatar" className="w-24 h-24 rounded-full mt-2" />
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded">Close</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-black text-white rounded">{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  )
}
