/**
 * Typed wrapper around the FastAPI backend.
 *
 * On the server we forward the user's NextAuth JWT as `Authorization: Bearer …`.
 * On the client we hit `/api/proxy/*` (a Next.js route handler) that adds the
 * header server-side — this avoids exposing the JWT to JavaScript via cookies
 * being readable by other origins.
 */

export type JobStatus =
  | "queued"
  | "extracting"
  | "analyzing"
  | "rendering_pdf"
  | "done"
  | "error";

export interface JobSummary {
  id: string;
  status: JobStatus;
  model: string;
  file_count: number;
  total_pages: number;
  created_at: string;
  completed_at: string | null;
}

export interface Job extends JobSummary {
  options: Record<string, unknown>;
  error_message: string | null;
  has_markdown: boolean;
  has_pdf: boolean;
}

export interface MeResponse {
  id: string;
  provider: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  has_saved_key: boolean;
  default_model: string | null;
}

const API_BASE = "/api/proxy";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  me: () => request<MeResponse>("/me"),
  models: () => request<{ models: string[] }>("/models"),

  jobs: {
    list: () => request<JobSummary[]>("/jobs"),
    get: (id: string) => request<Job>(`/jobs/${id}`),
    create: (form: FormData, geminiKey: string) =>
      request<Job>("/jobs", {
        method: "POST",
        body: form,
        headers: { "X-Gemini-Key": geminiKey },
      }),
    delete: (id: string) => request<void>(`/jobs/${id}`, { method: "DELETE" }),
    markdownUrl: (id: string) => `${API_BASE}/jobs/${id}/markdown`,
    pdfUrl: (id: string, inline = false) =>
      `${API_BASE}/jobs/${id}/pdf${inline ? "?inline=true" : ""}`,
    streamUrl: (id: string) => `${API_BASE}/jobs/${id}/stream`,
  },

  saveKey: (api_key: string, default_model?: string) =>
    request<{ status: string }>("/me/key", {
      method: "PUT",
      body: JSON.stringify({ api_key, default_model }),
    }),
  clearKey: () => request<{ status: string }>("/me/key", { method: "DELETE" }),
};
