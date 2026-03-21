export type CategoryTheme = {
  /** CSS gradient string for the hero — used inline where Tailwind can't handle dynamic values */
  heroGradient: string
  /** Tailwind class for the hero text color */
  heroTextColor: string
  /** Hex value for inline uses (e.g. active pill bg, hover tints) */
  accentHex: string
  /** Short punchy hero tagline shown in the category header banner */
  tagline: string
  /** Mood label — internal descriptor for design reference */
  mood: string
}

export const categoryThemes: Record<string, CategoryTheme> = {
  Electronics: {
    heroGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
    heroTextColor: 'text-white',
    accentHex: '#22d3ee',
    tagline: 'The latest tech, at the best price',
    mood: 'dark tech',
  },
  Cosmetics: {
    heroGradient: 'linear-gradient(135deg, #ffe4e6 0%, #fdf2f8 60%, #fff1f2 100%)',
    heroTextColor: 'text-rose-900',
    accentHex: '#fb7185',
    tagline: 'Glow up. Show up.',
    mood: 'soft feminine',
  },
  Vehicles: {
    heroGradient: 'linear-gradient(135deg, #09090b 0%, #18181b 60%, #27272a 100%)',
    heroTextColor: 'text-white',
    accentHex: '#fbbf24',
    tagline: 'Drive your next chapter',
    mood: 'premium dark',
  },
  Fashion: {
    heroGradient: 'linear-gradient(135deg, #f5f5f4 0%, #fafaf9 60%, #fff7ed 100%)',
    heroTextColor: 'text-stone-900',
    accentHex: '#f97316',
    tagline: 'Style that speaks for itself',
    mood: 'warm editorial',
  },
  Furniture: {
    heroGradient: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 60%, #fefce8 100%)',
    heroTextColor: 'text-amber-900',
    accentHex: '#b45309',
    tagline: 'Make every room a story',
    mood: 'warm minimal',
  },
  'Home Appliances': {
    heroGradient: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 60%, #ffffff 100%)',
    heroTextColor: 'text-sky-900',
    accentHex: '#0ea5e9',
    tagline: 'Smarter homes, simpler lives',
    mood: 'clean modern',
  },
  Gaming: {
    heroGradient: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #1e1b4b 100%)',
    heroTextColor: 'text-white',
    accentHex: '#e879f9',
    tagline: 'Level up your setup',
    mood: 'electric neon',
  },
  Sports: {
    heroGradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #065f46 100%)',
    heroTextColor: 'text-white',
    accentHex: '#a3e635',
    tagline: 'Gear up. Push harder.',
    mood: 'high energy',
  },
  Books: {
    heroGradient: 'linear-gradient(135deg, #e7e5e4 0%, #f5f5f4 60%, #fafaf9 100%)',
    heroTextColor: 'text-stone-900',
    accentHex: '#4f46e5',
    tagline: 'Every page is a new world',
    mood: 'quiet intellectual',
  },
  Jewelry: {
    heroGradient: 'linear-gradient(135deg, #171717 0%, #262626 50%, #1c1917 100%)',
    heroTextColor: 'text-white',
    accentHex: '#facc15',
    tagline: 'Wear what means something',
    mood: 'luxury dark',
  },
  Collectibles: {
    heroGradient: 'linear-gradient(135deg, #1c1917 0%, #292524 60%, #1c1917 100%)',
    heroTextColor: 'text-white',
    accentHex: '#a78bfa',
    tagline: 'Rare finds. Real value.',
    mood: 'dark collector',
  },
  Kids: {
    heroGradient: 'linear-gradient(135deg, #fef9c3 0%, #fefce8 60%, #f0fdf4 100%)',
    heroTextColor: 'text-yellow-900',
    accentHex: '#f59e0b',
    tagline: 'Fun for every little one',
    mood: 'playful bright',
  },
  'Office Supplies': {
    heroGradient: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 60%, #ffffff 100%)',
    heroTextColor: 'text-blue-900',
    accentHex: '#3b82f6',
    tagline: 'Work smarter, not harder',
    mood: 'clean professional',
  },
}

/** Fallback for any category not in the config */
export const defaultCategoryTheme: CategoryTheme = {
  heroGradient: 'linear-gradient(135deg, #111827 0%, #1f2937 60%, #111827 100%)',
  heroTextColor: 'text-white',
  accentHex: '#f97316',
  tagline: 'Find exactly what you need',
  mood: 'neutral brand',
}

/** Case-insensitive lookup with whitespace trimming; returns default if not found */
export function getCategoryTheme(category: string | null | undefined): CategoryTheme {
  if (!category) return defaultCategoryTheme
  const key = Object.keys(categoryThemes).find(
    (k) => k.toLowerCase() === category.trim().toLowerCase()
  )
  return key ? categoryThemes[key] : defaultCategoryTheme
}
