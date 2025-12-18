import type { Metadata } from "next";
import LandingPage from "../components/LandingPage";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "BulkifyAI"
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://bulkifyai.quuantum.com";

export const metadata: Metadata = {
  title: "BulkifyAI — Bulk edit, upload, and clean Clockify faster",
  description: "Bulk edit, upload, and clean up time entries, tags, tasks, and projects—no signup needed. 100% free and secure.",
  openGraph: {
    title: "BulkifyAI — Bulk edit, upload, and clean Clockify faster",
    description: "Manage Clockify at scale. Bulk edit time entries, upload CSVs, and clean up your workspace in seconds. 100% free and secure.",
    url: SITE_URL,
    siteName: APP_NAME,
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/bulkifyai-og-banner.png`,
        width: 1200,
        height: 630,
        alt: APP_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "BulkifyAI — Bulk edit, upload, and clean Clockify faster",
    description: "Manage Clockify at scale. Bulk edit time entries, upload CSVs, and clean up your workspace in seconds. 100% free and secure.",
    images: [
      {
        url: `${SITE_URL}/bulkifyai-og-banner.png`,
        alt: "BulkifyAI - Bulk edit, upload, and clean Clockify time entries faster",
      },
    ],
  },
};

export default function Home() {
  return <LandingPage />;
}