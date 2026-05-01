import { SettingsForm } from "@/components/dashboard/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">Account</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-primary">Settings</h1>
        <p className="mt-3 text-[15px] text-body-muted leading-relaxed">
          Your Gemini API key is sent per-request as{" "}
          <code className="font-mono text-sm bg-soft-stone px-1.5 py-0.5 rounded-xs">X-Gemini-Key</code>.
          Store an encrypted copy on the server so you don't have to paste it every session.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
