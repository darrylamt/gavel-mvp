import Footer from '@/components/layout/Footer'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import WelcomeTourModal from '@/components/layout/WelcomeTourModal'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Gavel Ghana - Online Auctions',
    template: '%s | Gavel Ghana',
  },
  description: 'Bid on trusted online auctions in Ghana using Gavel.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: siteUrl,
    siteName: 'Gavel Ghana',
    title: 'Gavel Ghana - Online Auctions',
    description: 'Bid on trusted online auctions in Ghana using Gavel.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gavel Ghana - Online Auctions',
    description: 'Bid on trusted online auctions in Ghana using Gavel.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <WelcomeTourModal />
        {children}
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}