export function Footer() {
  return (
    <footer className="bg-primary text-on-dark mt-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-16 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <p className="font-mono text-xs tracking-[0.22em] text-coral uppercase">Your data stays yours</p>
          <h3 className="mt-3 text-2xl font-medium">Bring your key. Keep your papers.</h3>
          <p className="mt-3 text-on-dark/60 text-sm max-w-md">
            Your API key is sent per-request and never stored. No ads, no data sales, no surprises.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-on-dark/60 font-mono">Product</p>
          <ul className="mt-4 space-y-2 text-sm text-on-dark/85">
            <li><a href="#how">Features</a></li>
            <li><a href="#pdfs">Preview</a></li>
            <li><a href="#privacy">Privacy</a></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-on-dark/60 font-mono">Account</p>
          <ul className="mt-4 space-y-2 text-sm text-on-dark/85">
            <li><a href="/signin">Sign in</a></li>
            <li><a href="/dashboard">Dashboard</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-on-dark/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between text-xs text-on-dark/55 font-mono">
          <span>© RecallAI</span>
          <span>Made with too much coffee ☕</span>
        </div>
      </div>
    </footer>
  );
}
