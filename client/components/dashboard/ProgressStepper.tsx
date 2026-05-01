"use client";

import type { JobStatus } from "@/lib/api";

const ORDER: JobStatus[] = ["queued", "extracting", "analyzing", "rendering_pdf", "done"];

const LABEL: Record<JobStatus, string> = {
  queued: "Queued",
  extracting: "Extracting",
  analyzing: "Analyzing",
  rendering_pdf: "Rendering PDF",
  done: "Done",
  error: "Error",
};

export function ProgressStepper({ status }: { status: JobStatus }) {
  if (status === "error") {
    return (
      <div className="rounded-md bg-error/10 text-error border border-error/20 px-4 py-3 text-sm font-mono">
        Pipeline failed. See message below.
      </div>
    );
  }
  const currentIdx = ORDER.indexOf(status);
  return (
    <ol className="flex items-center gap-3 text-xs font-mono uppercase tracking-wider">
      {ORDER.map((step, i) => {
        const done = i < currentIdx || status === "done";
        const active = i === currentIdx && status !== "done";
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                done ? "bg-deep-green" : active ? "bg-coral animate-pulse" : "bg-hairline"
              }`}
            />
            <span className={done || active ? "text-ink" : "text-muted"}>{LABEL[step]}</span>
            {i < ORDER.length - 1 && <span className="w-6 h-px bg-hairline" />}
          </li>
        );
      })}
    </ol>
  );
}
