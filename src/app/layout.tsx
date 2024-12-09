import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Midjourney Easy UI",
  description: "Imagine creating stunning images 🎨 No Discord, no commands 🚫💬 Just effortless art — type, search, and go! 🚀",
  keywords: ["midjourney", "AI art", "image generation", "artificial intelligence", "easy UI"],
  openGraph: {
    title: "Midjourney Easy UI",
    description: "Imagine creating stunning images 🎨 No Discord, no commands - Just effortless art!",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Midjourney Easy UI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Midjourney Easy UI",
    description: "Imagine creating stunning images 🎨 No Discord, no commands - Just effortless art!",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
