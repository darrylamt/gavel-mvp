'use client'

type Brand = { name: string; slug: string }

function BrandLogo({ name, slug }: Brand) {
  return (
    <a
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
          onError={e => {
            e.currentTarget.style.display = 'none'
            const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
            if (fallback) fallback.style.display = 'flex'
          }}
        />
        {/* Fallback — hidden by default, shown if image fails */}
        <span
          style={{ display: 'none' }}
          className="items-center justify-center h-9 w-9 rounded-xl bg-gray-100 text-xs font-black text-gray-500"
        >
          {name.slice(0, 2).toUpperCase()}
        </span>
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
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-3 items-center">
        {brands.map(b => <BrandLogo key={b.name} {...b} />)}
      </div>
    </section>
  )
}
