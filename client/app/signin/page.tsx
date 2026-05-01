import Link from "next/link";

import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

function GoogleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.705 17.64 9.2z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.929.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const FEATURES = [
  "Reads typed, scanned, and image PDFs",
  "Questions sorted by topic and difficulty",
  "Study-ready PDF, no reformatting needed",
  "Bring your own Gemini API key, no strings attached",
];

export default async function SignInPage({
  searchParams,
}: PageProps<"/signin">) {
  const params = await searchParams;
  const callbackUrl = (typeof params?.from === "string" ? params.from : "/dashboard") as string;

  async function withGoogle() {
    "use server";
    await signIn("google", { redirectTo: callbackUrl });
  }
  async function withGitHub() {
    "use server";
    await signIn("github", { redirectTo: callbackUrl });
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">

      {/* Left: branded dark panel */}
      <div className="hidden lg:flex flex-col bg-primary text-on-dark p-12">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-coral" />
          <span className="font-mono text-sm tracking-[0.18em] uppercase">RecallAI</span>
        </Link>

        <div className="flex-1 flex flex-col justify-center max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">
            Less panic. More prep.
          </p>
          <h1 className="mt-4 text-4xl font-medium tracking-tight leading-[1.1]">
            Your exam papers,<br />decoded overnight.
          </h1>
          <p className="mt-5 text-on-dark/60 text-lg leading-relaxed">
            Drop in past papers. Get a topic-sorted, difficulty-ranked study guide out.
            The revision session you wish you had all semester.
          </p>

          <ul className="mt-10 space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-coral shrink-0" />
                <span className="text-on-dark/70 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-on-dark/25 font-mono">© RecallAI</p>
      </div>

      {/* Right: sign-in form */}
      <div className="flex flex-col bg-canvas">
        {/* Mobile logo */}
        <div className="lg:hidden px-6 h-16 flex items-center border-b border-card-border">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-coral" />
            <span className="font-mono text-sm tracking-[0.18em] uppercase text-primary">RecallAI</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-medium tracking-tight text-primary">
              Welcome back.
            </h2>
            <p className="mt-2 text-body-muted text-[15px]">
              Pick an account and let&apos;s get to work.
            </p>

            <div className="mt-8 space-y-3">
              <form action={withGoogle}>
                <Button type="submit" size="lg" className="w-full gap-3">
                  <GoogleIcon />
                  Continue with Google
                </Button>
              </form>
              <form action={withGitHub}>
                <Button type="submit" size="lg" variant="outline" className="w-full gap-3">
                  <GitHubIcon />
                  Continue with GitHub
                </Button>
              </form>
            </div>

            <p className="mt-8 text-center text-xs text-muted">
              <Link href="/" className="underline underline-offset-2 hover:text-primary transition">
                Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>

    </main>
  );
}
