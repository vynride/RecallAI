"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { clearKey, getKey, saveKey as saveSession } from "@/lib/key-storage";
import { track } from "@/lib/umami";

export function SettingsForm() {
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("gemini-2.5-flash");
  const [hasSaved, setHasSaved] = useState(false);
  const [sessionKey, setSessionKey] = useState("");
  const [serverKey, setServerKey] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSessionKey(getKey() ?? "");
    Promise.all([api.models(), api.me()])
      .then(([m, me]) => {
        setModels(m.models);
        setHasSaved(me.has_saved_key);
        if (me.default_model) setModel(me.default_model);
      })
      .catch(() => {});
  }, []);

  function saveLocal() {
    if (!sessionKey.trim()) {
      clearKey();
      toast.success("Cleared session key");
      return;
    }
    saveSession(sessionKey.trim());
    toast.success("Saved to this browser session");
  }

  async function saveOnServer() {
    if (!serverKey.trim()) {
      toast.error("Paste a key first");
      return;
    }
    setPending(true);
    try {
      await api.saveKey(serverKey.trim(), model);
      setHasSaved(true);
      setServerKey("");
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
        <h2 className="text-lg font-medium tracking-tight text-primary">Session key (recommended)</h2>
        <p className="mt-1 text-sm text-body-muted">
          Stored only in this browser tab's <code className="font-mono">sessionStorage</code>.
          Cleared when you close the tab.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            type="password"
            value={sessionKey}
            onChange={(e) => setSessionKey(e.target.value)}
            placeholder="AIza…"
            className="flex-1 h-10 px-3 rounded-sm border border-hairline bg-canvas font-mono text-sm focus:border-form-focus focus:outline-none"
          />
          <Button onClick={saveLocal} variant="outline">Save</Button>
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
          Encrypted with a per-user envelope (HKDF + Fernet, server pepper). You can clear this at any time.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            type="password"
            value={serverKey}
            onChange={(e) => setServerKey(e.target.value)}
            placeholder="AIza…"
            className="flex-1 h-10 px-3 rounded-sm border border-hairline bg-canvas font-mono text-sm focus:border-form-focus focus:outline-none"
          />
          <Button onClick={saveOnServer} disabled={pending}>Save on server</Button>
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

        {hasSaved && (
          <div className="mt-4">
            <Button onClick={clearOnServer} disabled={pending} variant="outline">
              Clear server-stored key
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
