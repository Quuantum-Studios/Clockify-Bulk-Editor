import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const isProd = process.env.NODE_ENV === 'production'

  return {
    rules: [
      {
        userAgent: '*',
        allow: isProd ? '/' : '',
        disallow: isProd 
          ? ['/api/*', '/_next/*', '/debug/*', '/preview/*', '/admin/*']
          : '/',
      },
    ],
    sitemap: `${site.replace(/\/$/, '')}/sitemap.xml`,
  }
}


