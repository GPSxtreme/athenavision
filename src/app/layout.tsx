import type { Metadata } from "next";
import { IBM_Plex_Mono, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const siteUrl = "https://athenavision.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "AthenaVision — Intelligent Text Extraction",
    template: "%s | AthenaVision",
  },
  description:
    "Extract text from images with dual AI verification and anomaly detection. Two AI models extract independently, we diff the outputs and flag disagreements.",
  keywords: [
    "OCR",
    "text extraction",
    "image to text",
    "anomaly detection",
    "AI",
    "dual extraction",
    "document scanning",
  ],
  authors: [{ name: "AthenaVision" }],
  creator: "AthenaVision",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "AthenaVision",
    title: "AthenaVision — Intelligent Text Extraction",
    description:
      "Two AI models extract your text independently. We diff the outputs and flag where they disagree. No black boxes.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AthenaVision — Dual AI Text Extraction",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AthenaVision — Intelligent Text Extraction",
    description:
      "Two AI models extract your text independently. We diff the outputs and flag where they disagree.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${plexMono.variable} h-full`}>
      <body className="noise min-h-full flex flex-col bg-[var(--void)] text-[var(--text)] font-[family-name:var(--font-plex-mono)] antialiased selection:bg-[var(--cyan)]/20 selection:text-[var(--cyan)]">
        {children}
      </body>
    </html>
  );
}
