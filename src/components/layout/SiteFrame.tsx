'use client'

import { usePathname } from 'next/navigation'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const Navbar = dynamic(() => import('./Navbar'), { ssr: false })
const Footer = dynamic(() => import('./Footer'), { ssr: false })
const InAppBrowserBanner = dynamic(() => import('./InAppBrowserBanner'), { ssr: false })
const WelcomeTourModal = dynamic(() => import('./WelcomeTourModal'), { ssr: false })
const PhoneNumberPrompt = dynamic(() => import('@/components/PhoneNumberPrompt'), { ssr: false })
const ReferralTracker = dynamic(() => import('@/components/referrals/ReferralTracker'), { ssr: false })

const VERTICAL_PREFIXES = ['/properties', '/autos']

export default function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isVertical = VERTICAL_PREFIXES.some(p => pathname?.startsWith(p))

  if (isVertical) {
    return <>{children}</>
  }

  return (
    <>
      <Navbar />
      <InAppBrowserBanner />
      <WelcomeTourModal />
      <PhoneNumberPrompt />
      <Suspense fallback={null}>
        <ReferralTracker />
      </Suspense>
      {children}
      <Footer />
    </>
  )
}
