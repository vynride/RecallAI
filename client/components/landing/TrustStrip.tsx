export function TrustStrip() {
  const items = ["All-nighters", "Cold brew", "Stack Overflow", "One more rebase", "Ctrl+Z", "Vibe checks"];
  return (
    <section className="border-y border-card-border bg-soft-stone">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-12">
        <p className="text-center text-xs text-muted font-mono tracking-[0.2em] uppercase">
          Fuelled by
        </p>
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-12 gap-y-5 text-ink">
          {items.map((item) => (
            <li key={item} className="text-base font-medium opacity-70 hover:opacity-100 transition">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
