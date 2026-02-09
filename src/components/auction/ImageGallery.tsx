'use client'

import { useState } from 'react'

type Props = {
  images: string[]
}

export default function ImageGallery({ images }: Props) {
  const [active, setActive] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
        No images
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="w-full h-64 rounded-xl overflow-hidden border">
        <img
          src={images[active]}
          alt="Auction image"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setActive(index)}
              className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                active === index
                  ? 'border-black'
                  : 'border-transparent'
              }`}
            >
              <img
                src={img}
                alt="Thumbnail"
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
