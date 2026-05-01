"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, type Job } from "@/lib/api";
import { useEventStream } from "@/lib/sse";
import { ProgressStepper } from "@/components/dashboard/ProgressStepper";
import { ResultTabs } from "@/components/dashboard/ResultTabs";
import { Pill } from "@/components/ui/Pill";

export function JobView({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);
  const { events, done } = useEventStream(api.jobs.streamUrl(jobId));

  useEffect(() => {
    api.jobs.get(jobId).then(setJob).catch(() => setJob(null));
  }, [jobId]);

  // refresh job after each event so status/PDF readiness stay in sync
  useEffect(() => {
    if (events.length === 0) return;
    api.jobs.get(jobId).then(setJob).catch(() => {});
  }, [events.length, jobId]);

  useEffect(() => {
    if (done) {
      api.jobs.get(jobId).then(setJob).catch(() => {});
    }
  }, [done, jobId]);

  if (!job) return <p className="text-sm text-muted">Loading…</p>;

  const lastEvent = events[events.length - 1];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-ink underline underline-offset-4">
          ← Back to jobs
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <h1 className="text-2xl font-medium tracking-tight text-primary">
            Job <span className="font-mono text-base text-muted">{job.id.slice(0, 8)}</span>
          </h1>
          <Pill tone={job.status === "done" ? "done" : job.status === "error" ? "error" : "running"}>
            {job.status.replace("_", " ")}
          </Pill>
        </div>
        <p className="mt-2 text-sm text-body-muted">
          {job.file_count} file(s) · {job.total_pages || "?"} pages · {job.model}
        </p>
      </div>

      <ProgressStepper status={job.status} />

      {lastEvent?.event === "progress" && (
        <p className="text-xs font-mono text-muted">
          {JSON.stringify(lastEvent.data)}
        </p>
      )}

      {job.error_message && (
        <div className="rounded-md bg-error/5 border border-error/20 p-4 text-sm text-error font-mono">
          {job.error_message}
        </div>
      )}

      {job.has_pdf && <ResultTabs job={job} />}
    </div>
  );
}
