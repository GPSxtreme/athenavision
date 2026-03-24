import type { Metadata } from "next";
import { Syne, IBM_Plex_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "AthenaVision — Intelligent Text Extraction",
  description:
    "Extract text from images with dual AI verification and anomaly detection. Beyond simple OCR.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${plexMono.variable} h-full`}
    >
      <body className="noise min-h-full flex flex-col bg-[var(--void)] text-[var(--text)] font-[family-name:var(--font-plex-mono)] antialiased selection:bg-[var(--cyan)]/20 selection:text-[var(--cyan)]">
        {children}
      </body>
    </html>
  );
}
