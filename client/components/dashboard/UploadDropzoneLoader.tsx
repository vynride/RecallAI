"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { UploadDropzone } from "@/components/dashboard/UploadDropzone";

const FALLBACK_MODELS = ["gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite-preview"];

export function UploadDropzoneLoader() {
  const [models, setModels] = useState<string[] | null>(null);
  const [defaultModel, setDefaultModel] = useState("gemini-3-flash-preview");
  const [hasSavedKey, setHasSavedKey] = useState(false);

  useEffect(() => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 8_000),
    );
    Promise.race([Promise.all([api.models(), api.me()]), timeout])
      .then(([m, me]) => {
        setModels(m.models);
        setHasSavedKey(me.has_saved_key);
        if (me.default_model) setDefaultModel(me.default_model);
      })
      .catch(() => setModels(FALLBACK_MODELS));
  }, []);

  if (!models) {
    return <div className="h-64 rounded-sm bg-soft-stone/60 animate-pulse" />;
  }
  return (
    <UploadDropzone models={models} defaultModel={defaultModel} hasSavedKey={hasSavedKey} />
  );
}
