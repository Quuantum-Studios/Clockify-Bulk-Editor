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

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How does the bulk upload feature work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Simply upload a CSV file with your time entries, and our system will automatically map the data to your Clockify workspace. You can preview all changes before applying them, ensuring data accuracy.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is my data secure?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Absolutely. We use enterprise-grade encryption for all data transmission and storage. Your API keys are stored on-device in your browser. We follow industry best practices.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is it really free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes—${APP_NAME} is 100% free for a limited time. No signup or credit card required.`,
        },
      },
      {
        '@type': 'Question',
        name: "What's the difference between this and Clockify's built-in features?",
        acceptedAnswer: {
          '@type': 'Answer',
          text: "While Clockify is great for individual time tracking, our tool specializes in bulk operations and team management. We provide advanced filtering, bulk editing, CSV import/export, and team analytics that aren't available in the standard Clockify interface.",
        },
      },
      {
        '@type': 'Question',
        name: 'Do you offer team plans?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! We have flexible team plans starting from 5 users. Team plans include advanced collaboration features, role-based permissions, and dedicated support. Contact us for custom enterprise pricing.',
        },
      },
    ],
  }

  return (
    <>
      <JsonLdScript data={org} scriptKey="org" />
      <JsonLdScript data={website} scriptKey="website" />
      <JsonLdScript data={software} scriptKey="software" />
      <JsonLdScript data={faqPage} scriptKey="faqPage" />
    </>
  )
}


