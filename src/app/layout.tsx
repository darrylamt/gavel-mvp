import Footer from '@/components/layout/Footer'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import InAppBrowserBanner from '@/components/layout/InAppBrowserBanner'
import WelcomeTourModal from '@/components/layout/WelcomeTourModal'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import type { Metadata } from 'next'
import gavelTabIcon from '@/assets/branding/gavel-logo.jpeg'
import { Poppins } from 'next/font/google'
import Script from 'next/script'
import { Providers } from './providers'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'
const googleAnalyticsId = 'G-DCB2M8019Q'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Gavel Ghana - Online Auctions',
    template: '%s | Gavel Ghana',
  },
  description: 'Bid on trusted online auctions in Ghana using Gavel.',
  verification: {
    google: 'SDSysJpjhUK_A-YPkPKeDsV6lcNiTaXQYKmafA4_vKA',
  },
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
  icons: {
    icon: gavelTabIcon.src,
    shortcut: gavelTabIcon.src,
    apple: gavelTabIcon.src,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const organizationLogoUrl = `${siteUrl}${gavelTabIcon.src.startsWith('/') ? '' : '/'}${gavelTabIcon.src}`

  return (
    <html lang="en">
      <body className={poppins.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Gavel Ghana',
              url: siteUrl,
              logo: organizationLogoUrl,
              description: 'Bid on trusted online auctions in Ghana using Gavel.',
            }),
          }}
        />
        <Providers>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAnalyticsId}');
            `}
          </Script>
          <Navbar />
          <InAppBrowserBanner />
          <WelcomeTourModal />
          {children}
          <Footer />
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}