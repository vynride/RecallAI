"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { api, type Job } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/umami";

type Tab = "preview" | "markdown";

export function ResultTabs({ job }: { job: Job }) {
  const [tab, setTab] = useState<Tab>("preview");
  const [markdown, setMarkdown] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "markdown" || markdown !== null) return;
    fetch(api.jobs.markdownUrl(job.id))
      .then((r) => r.text())
      .then(setMarkdown)
      .catch(() => setMarkdown("# (failed to load)"));
  }, [tab, markdown, job.id]);

  return (
    <section className="rounded-lg border border-card-border bg-canvas overflow-hidden">
      <div className="flex items-center justify-between border-b border-card-border px-5 py-3">
        <div className="flex gap-1">
          {(["preview", "markdown"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs uppercase font-mono tracking-wider rounded-sm transition ${
                tab === t ? "bg-primary text-on-primary" : "text-muted hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <a
          href={api.jobs.pdfUrl(job.id)}
          onClick={() => track("pdf_downloaded", { job_id: job.id })}
        >
          <Button size="md">
            <Download size={14} /> Download PDF
          </Button>
        </a>
      </div>

      {tab === "preview" ? (
        <iframe
          src={api.jobs.pdfUrl(job.id, true)}
          title="PDF preview"
          className="w-full h-[720px] bg-soft-stone/50"
        />
      ) : (
        <pre className="p-6 text-xs font-mono leading-relaxed whitespace-pre-wrap text-ink max-h-[720px] overflow-auto">
          {markdown ?? "Loading…"}
        </pre>
      )}
    </section>
  );
}
