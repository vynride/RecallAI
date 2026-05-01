import { SettingsForm } from "@/components/dashboard/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-deep-green">Account</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-primary">Settings</h1>
        <p className="mt-3 text-body-muted">
          Your Gemini API key is sent per-request as <code className="font-mono text-sm">X-Gemini-Key</code>.
          You can optionally store an encrypted copy on the server so you don't have to paste it each session.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
