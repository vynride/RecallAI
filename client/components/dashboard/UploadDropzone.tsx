"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { getKey } from "@/lib/key-storage";
import { track } from "@/lib/umami";

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

  useEffect(() => {
    setUseSaved(hasSavedKey);
  }, [hasSavedKey]);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted].slice(0, 10));
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
    const key = useSaved ? "" : getKey() ?? "";
    if (!useSaved && !key) {
      toast.error("Add your Gemini key in Settings or paste it before uploading");
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
    <section className="rounded-lg border border-card-border bg-canvas p-6">
      <div
        {...getRootProps()}
        className={`rounded-md border-2 border-dashed transition cursor-pointer p-10 text-center ${
          isDragActive
            ? "border-coral bg-coral/5"
            : "border-hairline hover:border-primary/50 hover:bg-soft-stone/40"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto text-muted" size={28} strokeWidth={1.5} />
        <p className="mt-3 text-sm text-ink">
          {isDragActive ? "Drop your PDFs here" : "Drag PDFs here, or click to choose"}
        </p>
        <p className="mt-1 text-xs text-muted">Up to 10 files, 50MB total</p>
      </div>

      {files.length > 0 && (
        <ul className="mt-5 space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between text-sm bg-soft-stone/60 rounded px-3 py-2"
            >
              <span className="truncate font-mono">{f.name}</span>
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-muted hover:text-error"
                aria-label="remove"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        <label className="text-sm">
          <span className="text-xs uppercase font-mono text-muted tracking-wider">Model</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-sm border border-hairline bg-canvas focus:border-form-focus focus:outline-none"
          >
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={useOcr} onChange={(e) => setUseOcr(e.target.checked)} />
            Use OCR fallback for scanned pages
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={extractImages}
              onChange={(e) => setExtractImages(e.target.checked)}
            />
            Extract images and send them to Gemini
          </label>
          {hasSavedKey && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useSaved}
                onChange={(e) => setUseSaved(e.target.checked)}
              />
              Use my saved Gemini key
            </label>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-muted">
          {useSaved
            ? "Using your server-stored key (encrypted with a per-user envelope)"
            : "Your key is sent per-request as the X-Gemini-Key header"}
        </p>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Uploading…" : "Process"}
        </Button>
      </div>
    </section>
  );
}
