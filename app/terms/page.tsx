import type { Metadata } from 'next'
import PageLayout from '@/components/PageLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bulkifyai.quuantum.com'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'BulkifyAI'

export const metadata: Metadata = {
  title: "Terms of Service — BulkifyAI",
  description: "The terms that govern your use of BulkifyAI.",
  alternates: { canonical: `${SITE_URL.replace(/\/$/, '')}/terms` },
  robots: { index: true, follow: true },
}

export const revalidate = 3600 // Revalidate every hour

export default function TermsPage() {
  return (
    <PageLayout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">Terms of Service</h1>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              By using {APP_NAME}, you agree to these simple terms:
            </p>
            <ul className="list-disc pl-6 space-y-3 text-gray-600 dark:text-gray-300 text-lg">
              <li>Use the app responsibly and comply with Clockify&apos;s API terms.</li>
              <li>The app is provided &quot;as is&quot; without warranties; use at your own risk.</li>
              <li>We may update features and these terms at any time.</li>
              <li>Contact: <a href="mailto:support.bulkifyai@quuantum.com" className="text-primary underline hover:opacity-80">support.bulkifyai@quuantum.com</a></li>
            </ul>
          </div>
        </div>
      </main>
    </PageLayout>
  )
}


