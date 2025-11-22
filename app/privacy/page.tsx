import type { Metadata } from 'next'
import PageLayout from '@/components/PageLayout'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bulkifyai.quuantum.com'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'BulkifyAI'

export const metadata: Metadata = {
  title: "Privacy Policy — BulkifyAI",
  description: "How BulkifyAI handles your data and privacy.",
  alternates: { canonical: `${SITE_URL.replace(/\/$/, '')}/privacy` },
  robots: { index: true, follow: true },
}

export const revalidate = 3600 // Revalidate every hour

export default function PrivacyPage() {
  return (
    <PageLayout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 md:p-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">Privacy Policy</h1>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              We keep things simple. {APP_NAME} stores your API key only in your browser (local storage) and never on our servers. Requests to Clockify are sent securely over HTTPS.
            </p>
            <ul className="list-disc pl-6 space-y-3 text-gray-600 dark:text-gray-300 text-lg">
              <li>No account is required, no signup/signin.</li>
              <li>Your data remains in your Clockify account; we don&apos;t persist your time entries.</li>
              <li>We may collect anonymous usage metrics to improve the product.</li>
              <li>Contact: <a href="mailto:support.bulkifyai@quuantum.com" className="text-primary underline hover:opacity-80">support.bulkifyai@quuantum.com</a></li>
            </ul>
          </div>
        </div>
      </main>
    </PageLayout>
  )
}


