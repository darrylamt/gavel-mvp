import React from 'react'

type Props = {
  size?: 'sm' | 'md' | 'lg'
  src?: string | null
  alt?: string
  title?: string
  subtitle?: string
  onClick?: () => void
}

const SIZE_MAP: Record<string, string> = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
}

export default function AvatarLabelGroup({
  size = 'md',
  src,
  alt,
  title,
  subtitle,
  onClick,
}: Props) {
  const sizeClasses = SIZE_MAP[size] || SIZE_MAP.md

  const initials = (title || alt || '')
    .split(' ')
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join('')

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
    >
      <div
        className={`flex-shrink-0 rounded-full overflow-hidden ${sizeClasses} flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold`}
        aria-hidden
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt || 'avatar'} className="w-full h-full object-cover" />
        ) : (
          <span>{initials || '?'}</span>
        )}
      </div>

      <div className="hidden sm:flex flex-col items-start leading-tight">
        <span className="text-sm font-medium text-gray-800">{title}</span>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </div>
    </button>
  )
}
