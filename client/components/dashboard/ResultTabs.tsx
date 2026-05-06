"use client";

import { useEffect, useState } from "react";
import { Download, Loader } from "lucide-react";

import { api, type Job } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/umami";

type Tab = "preview" | "markdown";

export function ResultTabs({ job }: { job: Job }) {
  const [tab, setTab] = useState<Tab>("preview");
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);

  // Fetch PDF as blob to avoid Content-Disposition / iframe header issues.
  // Wait until has_pdf is confirmed to avoid a premature 404.
  useEffect(() => {
    if (!job.has_pdf) return;
    let revoke: string | null = null;
    fetch(api.jobs.pdfUrl(job.id, true))
      .then((r) => {
        if (!r.ok) throw new Error("not ok");
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        revoke = url;
        setPdfBlobUrl(url);
      })
      .catch(() => setPdfError(true));
    return () => { if (revoke) URL.revokeObjectURL(revoke); };
  }, [job.id, job.has_pdf]);

  useEffect(() => {
    if (tab !== "markdown" || markdown !== null) return;
    fetch(api.jobs.markdownUrl(job.id))
      .then((r) => r.text())
      .then(setMarkdown)
      .catch(() => setMarkdown("# (failed to load)"));
  }, [tab, markdown, job.id]);

  const handleDownload = () => {
    track("pdf_downloaded", { job_id: job.id });
    const a = document.createElement("a");
    a.href = api.jobs.pdfUrl(job.id);
    a.download = `RecallAI-${job.id.slice(0, 8)}.pdf`;
    a.click();
  };

  return (
    <section className="rounded-lg border border-card-border bg-canvas overflow-hidden">
      {/* Colored section header */}
      <div className="border-b border-card-border bg-soft-stone/40">
        <div className="px-5 pt-4">
          <p className="font-mono text-xs uppercase tracking-widest text-coral">Results</p>
        </div>
        <div className="mt-3 flex items-center justify-between px-5 pb-3">
          <div className="flex gap-1">
            {(["preview", "markdown"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs uppercase font-mono tracking-wider rounded-sm transition ${
                  tab === t
                    ? "bg-coral text-white"
                    : "text-muted hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Button size="md" onClick={handleDownload}>
            <Download size={14} /> Download PDF
          </Button>
        </div>
      </div>

      {tab === "preview" ? (
        !job.has_pdf ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted">
            <Loader size={14} className="animate-spin" />
            Finalizing your results…
          </div>
        ) : pdfError ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted">
            Preview unavailable.{" "}
            <button onClick={handleDownload} className="ml-1 underline underline-offset-2 hover:text-ink transition">
              Download instead
            </button>
          </div>
        ) : pdfBlobUrl ? (
          <embed
            src={pdfBlobUrl}
            type="application/pdf"
            className="w-full h-[720px] bg-soft-stone/50"
          />
        ) : (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted">
            <Loader size={14} className="animate-spin" />
            Loading preview…
          </div>
        )
      ) : (
        <div className="bg-soft-stone/40 border-l-2 border-coral/30 m-4 rounded-sm overflow-auto max-h-[720px]">
          <pre className="p-6 text-xs font-mono leading-relaxed whitespace-pre-wrap text-ink">
            {markdown ?? "Loading…"}
          </pre>
        </div>
      )}
    </section>
  );
}
