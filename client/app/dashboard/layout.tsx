import Link from "next/link";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";

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

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <header className="border-b border-card-border bg-canvas">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-mono text-sm tracking-[0.18em] uppercase text-primary">
              RecallAI
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm text-ink">
              <Link href="/dashboard" className="hover:text-primary">Jobs</Link>
              <Link href="/dashboard/settings" className="hover:text-primary">Settings</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-body-muted hidden sm:inline">
              {session.user.email}
            </span>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="text-sm text-ink underline underline-offset-4 hover:decoration-2"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 lg:px-10 py-10">
        {children}
      </main>
    </div>
  );
}
