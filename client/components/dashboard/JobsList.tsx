"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Pill } from "@/components/ui/Pill";
import { api, type JobStatus, type JobSummary } from "@/lib/api";

const TONE: Record<JobStatus, "queued" | "running" | "done" | "error"> = {
  queued: "queued",
  extracting: "running",
  analyzing: "running",
  rendering_pdf: "running",
  done: "done",
  error: "error",
};

function timeago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function JobsList() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);

  useEffect(() => {
    let active = true;
    const tick = () => api.jobs.list().then((j) => { if (active) setJobs(j); }).catch(() => {});
    tick();
    const id = window.setInterval(tick, 5000);
    return () => { active = false; window.clearInterval(id); };
  }, []);

  if (jobs === null) {
    return <p className="text-sm text-muted">Loading jobs…</p>;
  }
  if (jobs.length === 0) {
    return <p className="text-sm text-muted">No jobs yet — drop some PDFs above to get started.</p>;
  }

  return (
    <div className="rounded-lg border border-card-border overflow-hidden">
      <ul>
        {jobs.map((job) => (
          <li key={job.id}>
            <Link
              href={`/dashboard/jobs/${job.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-soft-stone/40 transition border-b border-card-border last:border-b-0"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted">{job.id.slice(0, 8)}</span>
                  <Pill tone={TONE[job.status]}>{job.status.replace("_", " ")}</Pill>
                </div>
                <div className="mt-1 text-sm text-ink">
                  {job.file_count} file{job.file_count === 1 ? "" : "s"} ·{" "}
                  {job.total_pages} pages · {job.model}
                </div>
              </div>
              <span className="text-xs text-muted font-mono whitespace-nowrap">
                {timeago(job.created_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
