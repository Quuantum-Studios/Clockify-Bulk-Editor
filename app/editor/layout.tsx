import type { Metadata } from "next";
import AppNavLayout from "../../components/AppNavLayout";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "BulkifyAI"

export const metadata: Metadata = {
  title: "Bulk Editor for Clockify",
  description: "The powerful bulk command center for your Clockify workspace. Edit entries, manage tags, and fix reporting errors instantly.",
  openGraph: {
    title: "Bulk Editor for Clockify — " + APP_NAME,
    description: "The powerful bulk command center for your Clockify workspace. Edit entries, manage tags, and fix reporting errors instantly.",
    type: 'website',
    images: [
      {
        url: "/bulkifyai-og-banner.png",
        width: 1200,
        height: 630,
        alt: APP_NAME + " Editor",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Bulk Editor for Clockify — " + APP_NAME,
    description: "The powerful bulk command center for your Clockify workspace. Edit entries, manage tags, and fix reporting errors instantly.",
    images: ["/bulkifyai-og-banner.png"],
  }
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppNavLayout>{children}</AppNavLayout>;
}
