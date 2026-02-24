'use client'

import { useEffect, useMemo, useState } from 'react'

type Props = {
  productId: string
  title: string
  baseImageUrl: string | null
  variantImages: Array<string | null>
}

type VariantImageChangeDetail = {
  productId?: string
  imageUrl?: string | null
}

export default function ProductImageGallery({ productId, title, baseImageUrl, variantImages }: Props) {
  const galleryImages = useMemo(
    () =>
      Array.from(
        new Set(
          [baseImageUrl, ...variantImages].filter((value): value is string => Boolean(value && value.trim()))
        )
      ),
    [baseImageUrl, variantImages]
  )

  const [selectedImage, setSelectedImage] = useState<string | null>(galleryImages[0] ?? null)
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  useEffect(() => {
    setSelectedImage(galleryImages[0] ?? null)
  }, [galleryImages])

  useEffect(() => {
    const handleVariantImageChange = (event: Event) => {
      const customEvent = event as CustomEvent<VariantImageChangeDetail>
      const detail = customEvent.detail
      if (!detail || detail.productId !== productId) return

      const nextImage = detail.imageUrl && detail.imageUrl.trim() ? detail.imageUrl : baseImageUrl
      if (nextImage) {
        setSelectedImage(nextImage)
      }
    }

    window.addEventListener('product-variant-image-change', handleVariantImageChange as EventListener)
    return () => {
      window.removeEventListener('product-variant-image-change', handleVariantImageChange as EventListener)
    }
  }, [baseImageUrl, productId])

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
        {selectedImage ? (
          <button
            type="button"
            className="block w-full"
            onClick={() => setExpandedImage(selectedImage)}
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

      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpandedImage(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setExpandedImage(null)
            }
          }}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-md border border-white/30 px-3 py-1 text-sm text-white"
            onClick={() => setExpandedImage(null)}
          >
            Close
          </button>
          <img
            src={expandedImage}
            alt={`${title} expanded`}
            className="max-h-[90vh] max-w-[95vw] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
