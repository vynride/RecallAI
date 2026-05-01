"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { UploadDropzone } from "@/components/dashboard/UploadDropzone";

export function UploadDropzoneLoader() {
  const [models, setModels] = useState<string[] | null>(null);
  const [defaultModel, setDefaultModel] = useState("gemini-2.5-flash");
  const [hasSavedKey, setHasSavedKey] = useState(false);

  useEffect(() => {
    Promise.all([api.models(), api.me()])
      .then(([m, me]) => {
        setModels(m.models);
        setHasSavedKey(me.has_saved_key);
        if (me.default_model) setDefaultModel(me.default_model);
      })
      .catch(() => setModels(["gemini-2.5-flash"]));
  }, []);

  if (!models) {
    return <div className="h-48 rounded-lg bg-soft-stone/60 animate-pulse" />;
  }
  return (
    <UploadDropzone models={models} defaultModel={defaultModel} hasSavedKey={hasSavedKey} />
  );
}
