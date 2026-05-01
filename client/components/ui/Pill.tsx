import type { HTMLAttributes } from "react";

type Tone = "neutral" | "queued" | "running" | "done" | "error";

const TONE: Record<Tone, string> = {
  neutral: "bg-soft-stone text-ink",
  queued: "bg-pale-blue text-action-blue",
  running: "bg-pale-green text-deep-green",
  done: "bg-deep-green text-on-dark",
  error: "bg-error/10 text-error border border-error/20",
};

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Pill({ tone = "neutral", className = "", ...props }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] tracking-wide uppercase ${TONE[tone]} ${className}`}
      {...props}
    />
  );
}
