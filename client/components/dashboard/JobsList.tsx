"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, FileText, Layers } from "lucide-react";

import { Trash2 } from "lucide-react";

import { api, type JobStatus, type JobSummary } from "@/lib/api";

const STATUS_COLOR: Record<JobStatus, string> = {
  queued:        "bg-hairline",
  extracting:    "bg-action-blue",
  analyzing:     "bg-form-focus",
  rendering_pdf: "bg-coral",
  done:          "bg-deep-green",
  error:         "bg-error",
};

const STATUS_LABEL: Record<JobStatus, string> = {
  queued:        "Queued",
  extracting:    "Extracting",
  analyzing:     "Analyzing",
  rendering_pdf: "Rendering",
  done:          "Done",
  error:         "Error",
};

const MODEL_SHORT: Record<string, string> = {
  "gemini-3.1-pro-preview":       "3.1 Pro",
  "gemini-3-flash-preview":       "3 Flash",
  "gemini-3.1-flash-lite-preview":"3.1 Flash Lite",
};

function timeago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const RUNNING: JobStatus[] = ["queued", "extracting", "analyzing", "rendering_pdf"];

const TERMINAL: JobStatus[] = ["done", "error"];

export function JobsList() {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    let active = true;
    const tick = () =>
      api.jobs.list().then((j) => { if (active) setJobs(j); }).catch(() => {});
    tick();
    const id = window.setInterval(tick, 5000);
    return () => { active = false; window.clearInterval(id); };
  }, []);

  async function clearCompleted() {
    if (!jobs) return;
    setClearing(true);
    const toDelete = jobs.filter((j) => TERMINAL.includes(j.status));
    await Promise.allSettled(toDelete.map((j) => api.jobs.delete(j.id)));
    setJobs((prev) => prev?.filter((j) => !TERMINAL.includes(j.status)) ?? null);
    setClearing(false);
  }

  if (jobs === null) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[72px] rounded-sm bg-soft-stone/60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-hairline px-6 py-12 text-center">
        <p className="text-sm text-muted">No tasks yet. Drop some PDFs above to get started.</p>
      </div>
    );
  }

  const running   = jobs.filter((j) => RUNNING.includes(j.status)).length;
  const done      = jobs.filter((j) => j.status === "done").length;
  const completed = jobs.filter((j) => TERMINAL.includes(j.status)).length;

  return (
    <div className="space-y-4">
      {/* Quick stats + clear button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6 text-xs font-mono text-muted">
          <span>
            <span className="text-ink font-medium">{jobs.length}</span> total
          </span>
          {running > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
              <span className="text-ink font-medium">{running}</span> running
            </span>
          )}
          {done > 0 && (
            <span>
              <span className="text-deep-green font-medium">{done}</span> done
            </span>
          )}
        </div>
        {completed > 0 && (
          <button
            onClick={clearCompleted}
            disabled={clearing}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-error transition-colors disabled:opacity-40"
          >
            <Trash2 size={12} />
            {clearing ? "Clearing…" : `Clear ${completed} completed`}
          </button>
        )}
      </div>

      {/* List */}
      <div className="rounded-sm border border-card-border overflow-hidden divide-y divide-card-border">
        {jobs.map((job) => {
          const isRunning = RUNNING.includes(job.status);
          const dotColor = STATUS_COLOR[job.status];
          return (
            <Link
              key={job.id}
              href={`/dashboard/jobs/${job.id}`}
              className="group flex items-center gap-4 px-5 py-4 hover:bg-soft-stone/50 transition-colors"
            >
              {/* Status dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${isRunning ? "animate-pulse" : ""}`}
              />

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono uppercase tracking-wider"
                    style={{
                      color: job.status === "done"   ? "var(--color-deep-green)"
                           : job.status === "error"  ? "var(--color-error)"
                           : isRunning               ? "var(--color-action-blue)"
                           :                           "var(--color-muted)",
                    }}
                  >
                    {STATUS_LABEL[job.status]}
                  </span>
                  <span className="text-hairline text-xs">·</span>
                  <span className="font-mono text-xs text-muted">{MODEL_SHORT[job.model] ?? job.model}</span>
                </div>

                <div className="mt-1 flex items-center gap-3 text-sm text-ink">
                  <span className="flex items-center gap-1 text-body-muted">
                    <FileText size={12} />
                    {job.file_count} file{job.file_count !== 1 ? "s" : ""}
                  </span>
                  {job.total_pages > 0 && (
                    <span className="flex items-center gap-1 text-body-muted">
                      <Layers size={12} />
                      {job.total_pages} pages
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted/60">{job.id.slice(0, 8)}</span>
                </div>

                {/* Running progress bar */}
                {isRunning && (
                  <div className="mt-2 h-0.5 rounded-full bg-hairline overflow-hidden">
                    <div
                      className="h-full bg-action-blue/60 rounded-full"
                      style={{ animation: "shimmer 2.5s ease-in-out infinite", width: "45%" }}
                    />
                  </div>
                )}
              </div>

              {/* Time + arrow */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted font-mono">{timeago(job.created_at)}</span>
                <ChevronRight
                  size={14}
                  className="text-hairline group-hover:text-muted transition-colors"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
