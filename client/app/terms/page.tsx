import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Terms of Use | RecallAI",
};

export default async function TermsPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <main className="bg-canvas">
      <Nav signedIn={signedIn} />

      <article className="mx-auto max-w-3xl px-6 lg:px-8 py-20">
        <p className="font-mono text-xs tracking-[0.22em] text-coral uppercase">Legal</p>
        <h1 className="mt-3 text-4xl font-medium text-primary">Terms of Use</h1>
        <p className="mt-2 text-sm text-muted font-mono">Effective date: May 1, 2026</p>

        <div className="mt-14 space-y-12 text-ink leading-7">

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">1. The service</h2>
            <p>
              RecallAI lets you upload academic PDF question papers and process them through Google
              Gemini AI — using your own API key — to generate topic-sorted, difficulty-ranked study
              materials. By using RecallAI you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">2. Your account</h2>
            <ul className="list-disc list-inside space-y-2 text-ink/90">
              <li>You must sign in with a Google or GitHub account.</li>
              <li>You must be at least 13 years old to use the service.</li>
              <li>You are responsible for keeping your credentials secure.</li>
              <li>
                Each account is for a single user. You may not share your account or create
                accounts on behalf of others without their knowledge.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">3. Bring Your Own Key (BYOK)</h2>
            <p className="mb-4">
              RecallAI is a BYOK service. You must supply a valid Google Gemini API key to process
              documents. This means:
            </p>
            <ul className="list-disc list-inside space-y-2 text-ink/90">
              <li>
                All Gemini API usage — and any associated costs — is charged to your own Google
                account under your key.
              </li>
              <li>
                We are not responsible for API charges, rate limits, quota exhaustion, or policy
                changes imposed by Google.
              </li>
              <li>
                Your key is sent per-request and is never logged. If you save it on our servers,
                it is encrypted at rest and you can delete it at any time in Settings.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">4. Acceptable use</h2>
            <p className="mb-4">
              You may only upload content you own or have the legal right to process. You agree not
              to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-ink/90">
              <li>Upload files containing malware, scripts, or malicious payloads.</li>
              <li>
                Attempt to reverse-engineer, extract, or reproduce our system prompts or
                processing logic.
              </li>
              <li>
                Scrape, probe, or abuse the API — including automated bulk submission beyond
                normal personal use.
              </li>
              <li>
                Use the service in any way that violates applicable law or regulation.
              </li>
              <li>
                Upload or process content that is illegal, abusive, or infringes third-party
                rights.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">5. Intellectual property</h2>
            <div className="space-y-3">
              <p>
                <span className="font-medium text-primary/80">Your uploads:</span> You retain full
                ownership of everything you upload. We claim no rights over your source documents.
              </p>
              <p>
                <span className="font-medium text-primary/80">Outputs:</span> The structured
                Markdown and PDF outputs generated from your documents belong to you.
              </p>
              <p>
                <span className="font-medium text-primary/80">RecallAI:</span> Our software,
                interface, branding, system prompts, and processing logic are our intellectual
                property. You may not copy, redistribute, or build competing products directly
                from them.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">6. No warranties</h2>
            <p>
              The service is provided <em>"as is"</em> without warranties of any kind. We make no
              guarantees about the accuracy of AI-generated output, service availability, or
              fitness for any particular purpose. AI can make mistakes — always verify important
              information from primary sources before relying on it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">7. Limitation of liability</h2>
            <p>
              To the maximum extent permitted by applicable law, RecallAI and its operators shall
              not be liable for any indirect, incidental, special, or consequential damages arising
              from your use of the service. This includes, without limitation, any Gemini API costs
              incurred under your key, any loss of data, or reliance on AI-generated content.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">8. Termination</h2>
            <p>
              We may suspend or terminate your access if you violate these terms or use the service
              in a way that harms other users or the platform. You can stop using the service at
              any time. To request account deletion, email us at{" "}
              <a href="mailto:vynride@gmail.com" className="text-coral underline underline-offset-2">
                vynride@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">9. Changes to these terms</h2>
            <p>
              We may update these terms from time to time. When we do, we'll update the effective
              date at the top of this page. Continued use of the service after changes constitutes
              acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">10. Contact</h2>
            <p>
              Questions about these terms?{" "}
              <a href="mailto:vynride@gmail.com" className="text-coral underline underline-offset-2">
                vynride@gmail.com
              </a>
            </p>
          </section>

        </div>
      </article>

      <Footer />
    </main>
  );
}
