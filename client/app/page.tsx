import type { Metadata } from "next";
import { auth } from "@/lib/auth";

import { Announcement } from "@/components/landing/Announcement";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { Capabilities } from "@/components/landing/Capabilities";
import { DarkBand } from "@/components/landing/DarkBand";
import { PdfShowcase } from "@/components/landing/PdfShowcase";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "RecallAI | Question papers, decoded.",
  description:
    "Upload past question papers, get a topic-sorted, difficulty-ranked PDF you can study from. Bring Your Own Gemini Key.",
  alternates: { canonical: "/" },
};

export default async function Page() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <main className="bg-canvas">
      <Announcement />
      <Nav signedIn={signedIn} />
      <Hero signedIn={signedIn} />
      <TrustStrip />
      <Capabilities />
      <DarkBand />
      <PdfShowcase />
      <CTA signedIn={signedIn} />
      <Footer />
    </main>
  );
}
