import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default async function PrivacyPage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <main className="bg-canvas">
      <Nav signedIn={signedIn} />

      <article className="mx-auto max-w-3xl px-6 lg:px-8 py-20">
        <p className="font-mono text-xs tracking-[0.22em] text-coral uppercase">Legal</p>
        <h1 className="mt-3 text-4xl font-medium text-primary">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted font-mono">Effective date: May 1, 2026</p>

        <div className="mt-14 space-y-12 text-ink leading-7">

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">1. What RecallAI is</h2>
            <p>
              RecallAI is an AI-powered tool that processes academic question papers using Google
              Gemini AI. You supply your own Gemini API key; we extract, structure, and render the
              results back to you as a searchable Markdown document and a formatted PDF.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">2. Information we collect</h2>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-primary/80 mb-1">Account data (via OAuth)</p>
                <p>
                  When you sign in with Google or GitHub, we receive your name, email address, and
                  profile picture from that provider. We store these to identify your account.
                </p>
              </div>
              <div>
                <p className="font-medium text-primary/80 mb-1">Uploaded files</p>
                <p>
                  PDFs you submit are stored on our servers during processing and for a reasonable
                  period after, so you can retrieve results from your dashboard. We never use your
                  uploaded content to train AI models.
                </p>
              </div>
              <div>
                <p className="font-medium text-primary/80 mb-1">Gemini API key (optional)</p>
                <p>
                  By default, your API key is sent per-request in a request header and is never
                  written to disk or logged. If you choose to save your key on our servers via
                  Settings, it is encrypted using HKDF key derivation and Fernet symmetric
                  encryption before being stored. You can delete it at any time.
                </p>
              </div>
              <div>
                <p className="font-medium text-primary/80 mb-1">Job metadata</p>
                <p>
                  For each processing job we store: the Gemini model selected, page count, job
                  status, timestamps, and the Markdown output we generate.
                </p>
              </div>
              <div>
                <p className="font-medium text-primary/80 mb-1">Analytics</p>
                <p>
                  We use self-hosted{" "}
                  <span className="font-mono text-sm">Umami</span> analytics, which collects basic
                  page-view and session data without cookies or cross-site tracking. No data is
                  sent to third-party analytics services.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">3. How we use it</h2>
            <ul className="list-disc list-inside space-y-2 text-ink/90">
              <li>To authenticate you and retrieve your account and job history.</li>
              <li>To run the AI processing pipeline on your documents and store the results.</li>
              <li>To enforce per-user rate limits and concurrency limits.</li>
              <li>To understand aggregate usage patterns so we can improve the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">4. What we share</h2>
            <div className="space-y-4">
              <div>
                <p className="font-medium text-primary/80 mb-1">Google Gemini API</p>
                <p>
                  The text and optional images extracted from your PDFs are sent to the Google
                  Gemini API using <em>your own</em> API key. Google processes this data under its
                  own terms. We do not send your documents to any other AI provider.
                </p>
              </div>
              <div>
                <p className="font-medium text-primary/80 mb-1">Google / GitHub OAuth</p>
                <p>
                  Authentication is handled by these providers. We receive only your name, email,
                  and profile picture. We do not share your data back with them beyond the normal
                  OAuth flow.
                </p>
              </div>
              <p>
                We do not sell your data. We do not share it with advertisers or data brokers. We
                will only disclose data if required to do so by law.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">5. Data retention</h2>
            <p>
              Your account and job history are retained until you delete your account. Uploaded
              source PDFs may be deleted from our servers after processing completes. Generated
              PDFs and Markdown output are retained so you can retrieve them from your dashboard.
              To delete your account and all associated data, contact us at{" "}
              <a href="mailto:vynride@gmail.com" className="text-coral underline underline-offset-2">
                vynride@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">6. Security</h2>
            <ul className="list-disc list-inside space-y-2 text-ink/90">
              <li>All traffic is served over HTTPS in production.</li>
              <li>
                Authentication uses stateless JWTs signed with a secret shared only between our
                Next.js frontend and FastAPI backend.
              </li>
              <li>
                If you save your Gemini API key, it is encrypted with a per-user derived key before
                being written to the database; the plaintext key is never stored.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">7. Children</h2>
            <p>
              RecallAI is not directed at children under 13. We do not knowingly collect personal
              data from children. If you believe a child has created an account, please contact us
              and we will delete the account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">8. Your rights</h2>
            <p>
              You can view and update your profile via your Google or GitHub account. You can delete
              your saved Gemini API key at any time in Settings. For account deletion or any data
              access request, email us at{" "}
              <a href="mailto:vynride@gmail.com" className="text-coral underline underline-offset-2">
                vynride@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">9. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. If we make material changes we will
              update the effective date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-primary mb-3">10. Contact</h2>
            <p>
              Questions about this policy?{" "}
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
