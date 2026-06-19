import './globals.css'
import SiteFrame from '@/components/layout/SiteFrame'
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
    default: "Gavel — Ghana's Online Auction Platform",
    template: '%s | Gavel Ghana',
  },
  description: "Bid, win, and save on live online auctions across Ghana. Gavel is Ghana's online auction platform.",
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
    title: "Gavel — Ghana's Online Auction Platform",
    description: "Bid, win, and save on live online auctions across Ghana. Gavel is Ghana's online auction platform.",
  },
  twitter: {
    card: 'summary_large_image',
    title: "Gavel — Ghana's Online Auction Platform",
    description: "Bid, win, and save on live online auctions across Ghana. Gavel is Ghana's online auction platform.",
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
              description: 'Ghana\'s trusted online auction platform – bid on electronics, fashion, and more.',
              foundingDate: '2024',
              areaServed: 'GH',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                url: `${siteUrl}/contact`
              },
              sameAs: [
                'https://facebook.com/gavelgh',
                'https://twitter.com/gavelgh',
                'https://instagram.com/gavelgh'
              ]
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
          <SiteFrame>
            {children}
          </SiteFrame>
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}