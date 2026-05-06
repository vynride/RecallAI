"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { clearKey, getKey, saveKey as saveSession } from "@/lib/key-storage";
import { track } from "@/lib/umami";

export function SettingsForm() {
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("gemini-2.5-flash");
  const [hasSaved, setHasSaved] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [pending, setPending] = useState(false);
  const sessionInputRef = useRef<HTMLInputElement>(null);
  const serverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasSession(Boolean(getKey()));
    Promise.all([api.models(), api.me()])
      .then(([m, me]) => {
        setModels(m.models);
        setHasSaved(me.has_saved_key);
        if (me.default_model) setModel(me.default_model);
      })
      .catch(() => {});
  }, []);

  function commitSession(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    saveSession(trimmed);
    setHasSession(true);
    if (sessionInputRef.current) sessionInputRef.current.value = "";
    track("key_saved_session", {});
    toast.success("Saved to this browser session");
  }

  function clearSession() {
    clearKey();
    setHasSession(false);
    if (sessionInputRef.current) sessionInputRef.current.value = "";
    toast.success("Cleared session key");
  }

  async function commitServer(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setPending(true);
    try {
      await api.saveKey(trimmed, model);
      setHasSaved(true);
      if (serverInputRef.current) serverInputRef.current.value = "";
      track("settings_key_saved", { model });
      toast.success("Saved (encrypted with a per-user envelope)");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "save failed");
    } finally {
      setPending(false);
    }
  }

  async function clearOnServer() {
    setPending(true);
    try {
      await api.clearKey();
      setHasSaved(false);
      track("settings_key_cleared", {});
      toast.success("Server-stored key cleared");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "clear failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-card-border p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight text-primary">Session key (recommended)</h2>
          {hasSession && (
            <span className="text-xs font-mono text-deep-green bg-pale-green px-2 py-1 rounded-full">
              key saved
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-body-muted">
          Stored only in this browser tab's <code className="font-mono">sessionStorage</code>.
          Cleared when you close the tab. Paste your key to save it automatically.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            ref={sessionInputRef}
            type="password"
            defaultValue=""
            onPaste={(e) => {
              const v = e.clipboardData.getData("text");
              if (!v.trim()) return;
              e.preventDefault();
              commitSession(v);
            }}
            onBlur={(e) => {
              if (e.currentTarget.value.trim()) commitSession(e.currentTarget.value);
            }}
            placeholder={hasSession ? "•••••••• (paste a new key to replace)" : "Paste your AIza… key"}
            className="flex-1 h-10 px-3 rounded-sm border border-hairline bg-canvas font-mono text-sm focus:border-form-focus focus:outline-none"
          />
          {hasSession && (
            <Button onClick={clearSession} variant="outline">Clear</Button>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-card-border p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight text-primary">Stored on server</h2>
          {hasSaved && (
            <span className="text-xs font-mono text-deep-green bg-pale-green px-2 py-1 rounded-full">
              key on file
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-body-muted">
          Encrypted with a per-user envelope (HKDF + Fernet, server pepper). Paste your key to save
          it automatically with the default model selected below.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            ref={serverInputRef}
            type="password"
            defaultValue=""
            disabled={pending}
            onPaste={(e) => {
              const v = e.clipboardData.getData("text");
              if (!v.trim()) return;
              e.preventDefault();
              commitServer(v);
            }}
            onBlur={(e) => {
              if (e.currentTarget.value.trim()) commitServer(e.currentTarget.value);
            }}
            placeholder={hasSaved ? "•••••••• (paste a new key to replace)" : "Paste your AIza… key"}
            className="flex-1 h-10 px-3 rounded-sm border border-hairline bg-canvas font-mono text-sm focus:border-form-focus focus:outline-none disabled:opacity-60"
          />
          {hasSaved && (
            <Button onClick={clearOnServer} disabled={pending} variant="outline">Clear</Button>
          )}
        </div>

        <div className="mt-6">
          <label className="text-sm">
            <span className="text-xs uppercase font-mono text-muted tracking-wider">Default model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-sm border border-hairline bg-canvas focus:border-form-focus focus:outline-none"
            >
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
        </div>
      </section>
    </div>
  );
}
