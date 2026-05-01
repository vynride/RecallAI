import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RecallAI — Question papers, decoded.",
  description:
    "Upload past question papers, get a topic-sorted, difficulty-ranked PDF you can study from. Bring Your Own Gemini Key.",
};

const UMAMI_SCRIPT = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-canvas text-primary antialiased">
        {children}
        <Toaster position="bottom-right" theme="light" />
        {UMAMI_SCRIPT && UMAMI_WEBSITE_ID && (
          <Script
            src={UMAMI_SCRIPT}
            data-website-id={UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
            defer
          />
        )}
      </body>
    </html>
  );
}
