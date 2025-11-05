export const metadata = {
  title: "Terms of Service — BulkifyAI",
  description: "The terms that govern your use of BulkifyAI.",
}

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        By using {`BulkifyAI`}, you agree to these simple terms:
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
        <li>Use the app responsibly and comply with Clockify’s API terms.</li>
        <li>The app is provided &quot;as is&quot; without warranties; use at your own risk.</li>
        <li>We may update features and these terms at any time.</li>
        <li>Contact: <a href="mailto:support.bulkifyai@quuantum.com" className="text-primary underline">support.bulkifyai@quuantum.com</a></li>
      </ul>
    </main>
  )
}


