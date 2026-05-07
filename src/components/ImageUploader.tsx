'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Upload, X, ImageIcon } from 'lucide-react'

type Props = {
  bucket: 'property-images' | 'auto-images'
  value: string[]
  onChange: (urls: string[]) => void
  maxFiles?: number
  accentColor?: string
}

export default function ImageUploader({
  bucket,
  value,
  onChange,
  maxFiles = 20,
  accentColor = '#C9A84C',
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = maxFiles - value.length
    if (remaining <= 0) return
    const toUpload = Array.from(files).slice(0, remaining)
    setUploading(true)
    const newUrls: string[] = []

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i]
      setProgress(`Uploading ${i + 1} of ${toUpload.length}…`)
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
      })
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
    }

    onChange([...value, ...newUrls])
    setUploading(false)
    setProgress('')
  }

  const removeImage = (url: string) => onChange(value.filter(u => u !== url))

  const moveUp = (i: number) => {
    if (i === 0) return
    const next = [...value]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); uploadFiles(e.dataTransfer.files) }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer
          ${uploading ? 'opacity-60 cursor-wait border-gray-200' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={e => uploadFiles(e.target.files)}
          disabled={uploading}
        />
        <div className="rounded-xl bg-gray-100 p-3">
          {uploading
            ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            : <Upload className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
          }
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">
            {uploading ? progress : 'Drop images here or click to upload'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            JPEG, PNG, WebP · Max {maxFiles} photos
            {value.length > 0 ? ` · ${value.length} uploaded` : ''}
          </p>
        </div>
      </div>

      {/* Preview grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {value.map((url, i) => (
            <div key={url} className="group relative rounded-xl overflow-hidden aspect-square bg-gray-100 border border-gray-200">
              <img src={url} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              {/* Remove button */}
              <button
                onClick={e => { e.stopPropagation(); removeImage(url) }}
                className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
              >
                <X className="h-3 w-3" />
              </button>
              {/* Reorder */}
              {i > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); moveUp(i) }}
                  className="absolute bottom-1 left-1 rounded text-[9px] font-bold bg-black/60 text-white px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                >
                  ← main
                </button>
              )}
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded text-[9px] font-bold px-1 py-0.5 text-white" style={{ background: accentColor }}>
                  Main
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
