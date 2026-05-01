"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Clock, Copy, ExternalLink } from "lucide-react";

import { api, type Job } from "@/lib/api";
import { useEventStream } from "@/lib/sse";
import { ProgressStepper } from "@/components/dashboard/ProgressStepper";
import { ResultTabs } from "@/components/dashboard/ResultTabs";
import { Pill } from "@/components/ui/Pill";

function ElapsedTimer({ start }: { start: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startMs = new Date(start).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [start]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return <>{mins > 0 ? `${mins}m ` : ""}{String(secs).padStart(2, "0")}s</>;
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="group inline-flex items-center gap-1.5 font-mono text-sm text-muted hover:text-ink transition"
      title="Copy full job ID"
    >
      {id.slice(0, 8)}
      <span className="opacity-0 group-hover:opacity-100 transition">
        {copied
          ? <Check size={11} className="text-deep-green" />
          : <Copy size={11} />}
      </span>
    </button>
  );
}

function GithubIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function XIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.402 6.231H2.742l7.736-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { href: "https://github.com/vynride/", label: "GitHub", Icon: GithubIcon, bg: "#24292e" },
  { href: "https://x.com/vynride", label: "X / Twitter", Icon: XIcon, bg: "#000000" },
];

export function JobView({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const { events, done } = useEventStream(api.jobs.streamUrl(jobId));
  const resultRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    api.jobs.get(jobId).then(setJob).catch(() => setJob(null));
  }, [jobId]);

  useEffect(() => {
    if (events.length === 0) return;
    api.jobs.get(jobId).then(setJob).catch(() => {});
  }, [events.length, jobId]);

  useEffect(() => {
    if (!done) return;
    let attempts = 0;
    const poll = () => {
      api.jobs.get(jobId).then((j) => {
        setJob(j);
        if (!j.has_pdf && j.status !== "error" && attempts < 8) {
          attempts++;
          setTimeout(poll, 1500);
        }
      }).catch(() => {});
    };
    poll();
  }, [done, jobId]);

  // Auto-scroll to results the first time has_pdf becomes true
  useEffect(() => {
    if (!job?.has_pdf || scrolledRef.current) return;
    scrolledRef.current = true;
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400);
  }, [job?.has_pdf]);

  if (!job) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-muted py-8">
        <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
        Loading…
      </div>
    );
  }

  const isRunning = !["done", "error"].includes(job.status);

  const headingText =
    job.status === "done"  ? "Job Complete"
    : job.status === "error" ? "Job Failed"
    : "Processing Job";

  const headerTheme =
    job.status === "done"
      ? { bg: "bg-pale-green", border: "border-deep-green/20", stripe: "bg-deep-green/25" }
      : job.status === "error"
      ? { bg: "bg-error/5", border: "border-error/20", stripe: "bg-error/25" }
      : { bg: "bg-pale-blue", border: "border-action-blue/15", stripe: "bg-action-blue/25" };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink transition hover:underline underline-offset-4"
        >
          ← Back to jobs
        </Link>

        <div className={`mt-4 rounded-lg ${headerTheme.bg} border ${headerTheme.border} overflow-hidden`}>
          <div className={`h-1 ${headerTheme.stripe}`} />
          <div className="px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-medium tracking-tight text-primary">
                    {headingText}
                  </h1>
                  <Pill tone={job.status === "done" ? "done" : job.status === "error" ? "error" : "running"}>
                    {job.status.replace("_", " ")}
                  </Pill>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-body-muted">
                  <CopyId id={job.id} />
                  <span className="text-hairline">·</span>
                  <span>{job.file_count} file{job.file_count !== 1 ? "s" : ""}</span>
                  <span className="text-hairline">·</span>
                  <span>{job.total_pages || "?"} pages</span>
                  <span className="text-hairline">·</span>
                  <span className="font-mono text-xs bg-canvas/70 px-2 py-0.5 rounded-xs">
                    {job.model}
                  </span>
                </div>

                {job.status === "done" && (
                  <p className="mt-2 font-mono text-xs text-deep-green/70">
                    Your study guide is ready below ↓
                  </p>
                )}
              </div>

              {isRunning && (
                <div className="flex items-center gap-2 text-xs font-mono text-muted bg-canvas/60 px-3 py-2 rounded-xs shrink-0">
                  <Clock size={12} />
                  <ElapsedTimer start={job.created_at} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress stepper */}
      <ProgressStepper status={job.status} />

      {/* Error panel */}
      {job.error_message && (
        <div className="rounded-sm bg-error/5 border border-error/20 p-4 text-sm text-error font-mono">
          {job.error_message}
        </div>
      )}

      {/* "While you wait" engagement band */}
      {isRunning && (
        <div className="rounded-lg overflow-hidden border border-card-border bg-pale-blue">
          <div className="h-1 bg-action-blue/30" />
          <div className="px-7 py-6 sm:px-8 sm:py-7">
            <p className="font-mono text-xs uppercase tracking-widest text-coral">
              Est. ~10 minutes
            </p>
            <h2 className="mt-2 text-lg font-medium tracking-tight text-primary">
              While you wait, check out my other work.
            </h2>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              {SOCIAL_LINKS.map(({ href, label, Icon, bg }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 rounded-pill border border-hairline bg-canvas px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/30 hover:shadow-sm"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ background: bg, color: "#ffffff" }}
                  >
                    <Icon size={12} />
                  </span>
                  {label}
                  <ExternalLink size={10} className="opacity-0 transition group-hover:opacity-100 text-muted" />
                </a>
              ))}
            </div>

            <p className="mt-5 text-xs text-muted">
              Problems? Contact:{" "}
              <a
                href="mailto:vynride@gmail.com"
                className="underline underline-offset-2 hover:text-ink transition"
              >
                vynride@gmail.com
              </a>
            </p>
          </div>

          <div className="relative h-0.5 bg-action-blue/10 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-coral/60"
              style={{ width: "30%", animation: "shimmer 3s ease-in-out infinite" }}
            />
          </div>
        </div>
      )}

      {/* Result viewer */}
      {job.has_pdf && (
        <div ref={resultRef}>
          <ResultTabs job={job} />
        </div>
      )}
    </div>
  );
}
