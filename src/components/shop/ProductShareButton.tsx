'use client'

import { useState } from 'react'
import { Share2, Copy, Check, X } from 'lucide-react'

type Props = {
  title: string
  price: string
  imageUrl: string | null
  url: string
  shopName?: string | null
}

export default function ProductShareButton({ title, price, imageUrl, url, shopName }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareText = `${title} — ${price}\nShop on Gavel Ghana 🛒`

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${title} – Gavel Ghana`, text: shareText, url })
      } catch {
        // cancelled or unsupported — fall through to modal
        setOpen(true)
      }
      return
    }
    setOpen(true)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`

  return (
    <>
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors"
        aria-label="Share product"
      >
        <Share2 className="h-4 w-4" />
        <span>Share</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Share</p>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Share card preview */}
            <div className="px-5 pt-5">
              <div className="rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/5">
                {/* Image */}
                {imageUrl ? (
                  <div className="relative h-52 w-full bg-gray-100">
                    <img
                      src={imageUrl}
                      alt={title}
                      className="h-full w-full object-cover"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    {/* Price pill on image */}
                    <div className="absolute top-3 right-3">
                      <span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-black text-white shadow-lg">
                        {price}
                      </span>
                    </div>
                    {/* Title on image */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-base font-bold text-white leading-snug line-clamp-2">{title}</p>
                      {shopName && (
                        <p className="mt-0.5 text-xs text-white/70">{shopName}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-5 py-8">
                    <p className="text-xl font-black text-white leading-snug line-clamp-2">{title}</p>
                    <p className="mt-2 text-2xl font-black text-white/90">{price}</p>
                    {shopName && <p className="mt-1 text-sm text-white/70">{shopName}</p>}
                  </div>
                )}

                {/* Card footer */}
                <div className="flex items-center justify-between bg-white px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500">
                      <span className="text-[10px] font-black text-white">G</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">Gavel Ghana</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">gavelgh.com</span>
                </div>
              </div>
            </div>

            {/* Share actions */}
            <div className="p-5 space-y-2.5">
              <button
                onClick={copyLink}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {copied
                  ? <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  : <Copy className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                <span>{copied ? 'Link copied!' : 'Copy link'}</span>
              </button>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white hover:brightness-105 transition-all"
              >
                <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span>Share on WhatsApp</span>
              </a>

              <a
                href={xUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>Share on X</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
