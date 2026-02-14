'use client'

import { useState } from 'react'

type Props = {
  images: string[]
}

export default function ImageGallery({ images }: Props) {
  const [active, setActive] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalImageIndex, setModalImageIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
        No images
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Main image */}
        <div 
          className="w-full h-96 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => {
            setModalImageIndex(active)
            setIsModalOpen(true)
          }}
        >
          <img
            src={images[active]}
            alt="Auction product image"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((img, index) => (
              <button
                key={index}
                onClick={() => setActive(index)}
                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-3 transition-all ${
                  active === index
                    ? 'border-indigo-600 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
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

      {/* Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
                {modalImageIndex + 1} / {images.length}
              </div>
            )}

            {/* Main modal image */}
            <div className="w-full max-h-[90vh] flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <img
                src={images[modalImageIndex]}
                alt="Full size product image"
                className="max-w-full max-h-[90vh] object-contain"
              />
            </div>

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setModalImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={() => setModalImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Thumbnail strip in modal */}
                <div className="bg-gray-900 p-3 flex gap-2 overflow-x-auto">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setModalImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                        modalImageIndex === index
                          ? 'border-indigo-500'
                          : 'border-gray-700 opacity-60 hover:opacity-100'
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
