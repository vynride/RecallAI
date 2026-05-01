import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";
import { NavLinks } from "@/components/dashboard/NavLinks";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?from=/dashboard");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  const email = session.user.email ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <DashboardBackground />

      <header className="sticky top-0 z-30 backdrop-blur-md bg-canvas/90 border-b border-hairline">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 h-14 flex items-center justify-between">

          {/* Left: brand + nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-coral" />
              <span className="font-mono text-sm tracking-[0.18em] uppercase text-primary">RecallAI</span>
            </Link>
            {/* Thin separator */}
            <span className="hidden md:block w-px h-4 bg-hairline" />
            <NavLinks />
          </div>

          {/* Right: user */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted hidden sm:inline truncate max-w-40">
              {email}
            </span>
            <span className="hidden sm:block w-px h-3.5 bg-hairline" />
            <form action={handleSignOut}>
              <button
                type="submit"
                className="text-xs text-muted hover:text-ink underline underline-offset-4 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>

        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-6 lg:px-10 py-12">
        {children}
      </main>
    </div>
  );
}
