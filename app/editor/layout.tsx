import type { Metadata } from "next";
import AppNavLayout from "../../components/AppNavLayout";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "BulkifyAI"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bulkifyai.quuantum.com";

export const metadata: Metadata = {
  title: "Bulk Editor for Clockify",
  description: "The powerful bulk command center for your Clockify workspace. Edit entries, manage tags, and fix reporting errors instantly.",
  openGraph: {
    title: "Bulk Editor for Clockify — " + APP_NAME,
    description: "The powerful bulk command center for your Clockify workspace. Edit entries, manage tags, and fix reporting errors instantly.",
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/bulkifyai-og-banner.png`,
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
    images: [
      {
        url: `${SITE_URL}/bulkifyai-og-banner.png`,
        alt: `${APP_NAME} Bulk Editor - Edit Clockify time entries, tags, and tasks at scale`,
      },
    ],
  }
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppNavLayout>{children}</AppNavLayout>;
}
