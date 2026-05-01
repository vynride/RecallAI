"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, X, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { getKey, saveKey as saveSessionKey } from "@/lib/key-storage";
import { track } from "@/lib/umami";

const MODEL_META: Record<string, { label: string; tag?: string; tagColor?: string }> = {
  "gemini-3.1-pro-preview":      { label: "3.1 Pro",       tag: "Most capable",  tagColor: "bg-pale-blue text-action-blue" },
  "gemini-3-flash-preview":      { label: "3 Flash",       tag: "Recommended",   tagColor: "bg-pale-green text-deep-green" },
  "gemini-3.1-flash-lite-preview":{ label: "3.1 Flash Lite",tag: "Fastest",      tagColor: "bg-soft-stone text-body-muted" },
};

interface Props {
  models: string[];
  defaultModel: string;
  hasSavedKey: boolean;
}

export function UploadDropzone({ models, defaultModel, hasSavedKey }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [model, setModel] = useState(defaultModel);
  const [useOcr, setUseOcr] = useState(true);
  const [extractImages, setExtractImages] = useState(true);
  const [useSaved, setUseSaved] = useState(hasSavedKey);
  const [submitting, setSubmitting] = useState(false);

  const [sessionKey, setSessionKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setSessionKey(getKey() ?? "");
    setUseSaved(hasSavedKey);
  }, [hasSavedKey]);

  const hasKey = hasSavedKey || Boolean(sessionKey);

  function saveKeyLocal() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    saveSessionKey(trimmed);
    setSessionKey(trimmed);
    setKeyInput("");
    toast.success("Key saved for this session");
    track("key_saved_session", {});
  }

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 50 * 1024 * 1024,
  });

  async function submit() {
    if (files.length === 0) {
      toast.error("Drop at least one PDF");
      return;
    }
    const key = useSaved ? "" : sessionKey;
    if (!useSaved && !key) {
      toast.error("Add your Gemini key above to continue");
      return;
    }

    const form = new FormData();
    files.forEach((f) => form.append("files", f, f.name));
    form.append("model", model);
    form.append("use_ocr", String(useOcr));
    form.append("extract_images", String(extractImages));
    form.append("use_saved_key", String(useSaved));

    setSubmitting(true);
    try {
      const job = await api.jobs.create(form, key);
      track("job_submitted", { model, file_count: files.length, ocr: useOcr });
      router.push(`/dashboard/jobs/${job.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "submit failed");
      track("job_failed", { model, step: "submit", error_class: "client" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">

      {/* Key setup — shown until a key is configured */}
      {!hasKey && (
        <div className="rounded-sm bg-soft-stone px-6 py-5 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-primary">Add your Gemini API key</p>
            <p className="mt-0.5 text-xs text-body-muted">
              Saved to this browser session only.{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-primary"
              >
                Get a free key
              </a>
            </p>
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? "text" : "password"}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveKeyLocal()}
                  placeholder="AIza…"
                  className="w-full h-10 px-3 pr-9 rounded-sm border border-hairline bg-canvas font-mono text-sm focus:border-form-focus focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  aria-label="toggle visibility"
                >
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <Button onClick={saveKeyLocal} variant="outline">Save</Button>
            </div>
          </div>
          {hasSavedKey && (
            <label className="flex items-center gap-2 text-sm shrink-0 pb-0.5">
              <input
                type="checkbox"
                checked={useSaved}
                onChange={(e) => setUseSaved(e.target.checked)}
              />
              Use saved key instead
            </label>
          )}
        </div>
      )}

      {/* Key active indicator */}
      {hasKey && (
        <div className="flex items-center justify-between text-xs text-body-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-deep-green" />
            {hasSavedKey && useSaved ? "Using saved key" : "Session key active"}
          </span>
          {hasSavedKey && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useSaved}
                onChange={(e) => setUseSaved(e.target.checked)}
              />
              Use saved key
            </label>
          )}
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`rounded-sm border-2 border-dashed transition cursor-pointer px-8 py-12 text-center ${
          isDragActive
            ? "border-coral bg-coral/5"
            : "border-hairline hover:border-primary/40 hover:bg-soft-stone/30"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto text-muted" size={28} strokeWidth={1.4} />
        <p className="mt-3 text-sm font-medium text-ink">
          {isDragActive ? "Drop your PDFs here" : "Drag PDFs here, or click to browse"}
        </p>
        <p className="mt-1 text-xs text-muted">50MB total per upload</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between text-sm bg-soft-stone rounded-sm px-3 py-2"
            >
              <span className="truncate font-mono text-[13px]">{f.name}</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="ml-3 text-muted hover:text-error shrink-0"
                aria-label="remove"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Model selector */}
      <div>
        <p className="text-xs uppercase font-mono text-muted tracking-wider mb-2">Model</p>
        <div className="flex flex-wrap gap-2">
          {models.map((m) => {
            const meta = MODEL_META[m];
            const active = model === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setModel(m)}
                className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-sm transition ${
                  active
                    ? "border-primary bg-primary text-on-primary"
                    : "border-hairline bg-canvas hover:border-primary/50 text-ink"
                }`}
              >
                <span className="font-medium">{meta?.label ?? m}</span>
                {meta?.tag && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    active ? "bg-on-primary/10 text-on-primary" : (meta.tagColor ?? "bg-soft-stone text-muted")
                  }`}>
                    {meta.tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Options + submit */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-5 text-sm text-body-muted">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useOcr} onChange={(e) => setUseOcr(e.target.checked)} />
            OCR fallback
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={extractImages} onChange={(e) => setExtractImages(e.target.checked)} />
            Send images to Gemini
          </label>
        </div>
        <Button onClick={submit} disabled={submitting || !hasKey} size="lg">
          {submitting ? "Uploading…" : "Process"}
        </Button>
      </div>

    </div>
  );
}
