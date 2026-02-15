import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gavelgh.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/','/auctions','/auctions/*','/tokens','/faq','/contact'],
        disallow: ['/admin', '/profile', '/api', '/login', '/signup'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
