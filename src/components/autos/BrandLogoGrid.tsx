'use client'

import { useRef } from 'react'

type Brand = { name: string; slug: string }

function BrandLogo({ name, slug }: Brand) {
  const wrapperRef = useRef<HTMLAnchorElement>(null)

  return (
    <a
      ref={wrapperRef}
      href={`/autos/browse?make=${encodeURIComponent(name)}`}
      title={name}
      className="group flex flex-col items-center gap-2 py-3 px-2 rounded-xl hover:bg-gray-50 transition-colors"
    >
      <div className="h-9 w-9 flex items-center justify-center">
        <img
          src={`https://cdn.simpleicons.org/${slug}`}
          alt={name}
          width={36}
          height={36}
          className="max-h-9 max-w-9 w-auto h-auto opacity-60 group-hover:opacity-100 transition-opacity"
          loading="lazy"
          onError={() => {
            if (wrapperRef.current) wrapperRef.current.style.display = 'none'
          }}
        />
      </div>
      <span className="text-[10px] font-semibold text-gray-400 group-hover:text-gray-600 transition-colors text-center leading-tight hidden sm:block">
        {name}
      </span>
    </a>
  )
}

export default function BrandLogoGrid({ brands }: { brands: Brand[] }) {
  return (
    <section>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-8">
        Brands We Deal With
      </p>
      <div className="flex flex-wrap justify-center gap-1">
        {brands.map(b => <BrandLogo key={b.name} {...b} />)}
      </div>
    </section>
  )
}
