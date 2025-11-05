'use client'

import { JsonLdScript } from 'next-seo'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'BulkifyAI'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export default function SEO() {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP_NAME,
    url: SITE_URL,
    logo: `${SITE_URL.replace(/\/$/, '')}/icon.png`,
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL.replace(/\/$/, '')}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: APP_NAME,
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: SITE_URL,
  }

  return (
    <>
      <JsonLdScript data={org} scriptKey="org" />
      <JsonLdScript data={website} scriptKey="website" />
      <JsonLdScript data={software} scriptKey="software" />
    </>
  )
}


