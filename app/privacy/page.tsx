export const metadata = {
  title: "Privacy Policy — ClockifyManager",
  description: "How ClockifyManager handles your data and privacy.",
}

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        We keep things simple. {`ClockifyManager`} stores your API key only in your browser (local storage) and never on our servers. Requests to Clockify are sent securely over HTTPS.
      </p>
      <ul className="list-disc pl-6 space-y-2 text-gray-600 dark:text-gray-300">
        <li>No account is required, no signup/signin.</li>
        <li>Your data remains in your Clockify account; we don’t persist your time entries.</li>
        <li>We may collect anonymous usage metrics to improve the product.</li>
        <li>Contact: <a href="mailto:support.clockifymanager@quuantum.com" className="text-primary underline">support.clockifymanager@quuantum.com</a></li>
      </ul>
    </main>
  )
}


