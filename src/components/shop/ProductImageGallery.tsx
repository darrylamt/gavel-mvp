'use client'

import { useEffect, useMemo, useState } from 'react'


type Props = {
  productId: string
  title: string
  baseImageUrl: string | null
  variantImages: Array<string | null>
}

type VariantImageChangeDetail = {
  productId: string
  imageUrl: string | null
}

export default function ProductImageGallery({ productId, title, baseImageUrl, variantImages }: Props) {
  const galleryImages = useMemo(() => {
    const images = [baseImageUrl, ...variantImages].filter((img): img is string => !!img && img.trim() !== '')
    // Remove duplicates
    return Array.from(new Set(images))
  }, [baseImageUrl, variantImages])

  const [selectedImage, setSelectedImage] = useState<string | null>(galleryImages[0] ?? null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  useEffect(() => {
    setSelectedImage(galleryImages[0] ?? null)
    setExpandedIndex(null)
  }, [galleryImages])

  useEffect(() => {
    const handleVariantImageChange = (event: Event) => {
      const customEvent = event as CustomEvent<VariantImageChangeDetail>
      const detail = customEvent.detail
      if (!detail || detail.productId !== productId) return

      const nextImage = detail.imageUrl && detail.imageUrl.trim() ? detail.imageUrl : baseImageUrl
      if (nextImage) {
        setSelectedImage(nextImage)
        const idx = galleryImages.findIndex((img) => img === nextImage)
        setExpandedIndex(idx >= 0 ? idx : null)
      }
    }

    window.addEventListener('product-variant-image-change', handleVariantImageChange as EventListener)
    return () => {
      window.removeEventListener('product-variant-image-change', handleVariantImageChange as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseImageUrl, productId, galleryImages])

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
        {selectedImage ? (
          <button
            type="button"
            className="block w-full"
            onClick={() => {
              const idx = galleryImages.findIndex((img) => img === selectedImage)
              setExpandedIndex(idx >= 0 ? idx : 0)
            }}
            aria-label="Expand product image"
          >
            <img src={selectedImage} alt={title} className="h-full max-h-[620px] w-full object-contain" />
          </button>
        ) : (
          <div className="flex h-[520px] items-center justify-center text-sm text-gray-400">No image available</div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {galleryImages.length > 0 ? (
          galleryImages.slice(0, 6).map((imageUrl, index) => (
            <button
              key={`${imageUrl}-${index}`}
              type="button"
              onClick={() => setSelectedImage(imageUrl)}
              className={`overflow-hidden rounded-xl border bg-gray-50 ${
                selectedImage === imageUrl ? 'border-gray-900' : 'border-gray-200'
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <img src={imageUrl} alt={`${title} thumbnail ${index + 1}`} className="h-24 w-full object-cover" />
            </button>
          ))
        ) : (
          <div className="col-span-3 flex h-24 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-400">
            No image
          </div>
        )}
      </div>

      {expandedIndex !== null && galleryImages[expandedIndex] && (
        <ExpandedGallery
          images={galleryImages}
          index={expandedIndex}
          title={title}
          onClose={() => setExpandedIndex(null)}
          setIndex={(idx: number) => setExpandedIndex(idx)}
        />
      )}
    </>
  )




type ExpandedGalleryProps = {
  images: string[]
  index: number
  title: string
  onClose: () => void
  setIndex: (idx: number) => void
}

function ExpandedGallery({ images, index, title, onClose, setIndex }: ExpandedGalleryProps) {
  const total = images.length
  const current = images[index]

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'ArrowLeft') {
        setIndex(index > 0 ? index - 1 : total - 1)
      } else if (event.key === 'ArrowRight') {
        setIndex(index < total - 1 ? index + 1 : 0)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, setIndex, total, index])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-md border border-white/30 px-3 py-1 text-sm text-white"
        onClick={onClose}
      >
        Close
      </button>
      <button
        type="button"
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
        onClick={(e) => {
          e.stopPropagation()
          setIndex(index > 0 ? index - 1 : total - 1)
        }}
        aria-label="Previous image"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
      <img
        src={current}
        alt={`${title} expanded`}
        className="max-h-[90vh] max-w-[95vw] object-contain"
        onClick={(event) => event.stopPropagation()}
      />
      <button
        type="button"
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/70"
        onClick={(e) => {
          e.stopPropagation()
          setIndex(index < total - 1 ? index + 1 : 0)
        }}
        aria-label="Next image"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/80">
        {index + 1} / {total}
      </div>
    </div>
  )
}
}
