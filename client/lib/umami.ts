type UmamiPayload = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: UmamiPayload) => void;
    };
  }
}

export function track(name: string, data?: UmamiPayload) {
  if (typeof window === "undefined") return;
  window.umami?.track(name, data);
}
