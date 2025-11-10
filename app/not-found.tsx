import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Home, FileText } from 'lucide-react'
import PageLayout from '@/components/PageLayout'

export const metadata: Metadata = {
  title: 'Page Not Found — BulkifyAI',
  description: 'The page you are looking for could not be found.',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <PageLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16">
        <div className="text-center max-w-2xl">
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-gray-200 dark:text-gray-800 mb-4">404</h1>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Page Not Found
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/">
              <Button size="lg" className="bg-primary hover:opacity-90 text-primary-foreground px-8 py-4 text-lg cursor-pointer">
                <Home className="mr-2 h-5 w-5" />
                Go to Homepage
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/editor">
              <Button size="lg" variant="outline" className="px-8 py-4 text-lg cursor-pointer">
                <FileText className="mr-2 h-5 w-5" />
                Open Editor
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/privacy" className="hover:text-primary transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-primary transition">
              Terms of Service
            </Link>
            <Link href="mailto:support.bulkifyai@quuantum.com" className="hover:text-primary transition">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

