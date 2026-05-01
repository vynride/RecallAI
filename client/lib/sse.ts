"use client";

import { useEffect, useRef, useState } from "react";

export interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

export function useEventStream(url: string | null) {
  const [events, setEvents] = useState<SseEvent[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!url) return;
    const source = new EventSource(url);
    sourceRef.current = source;

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setEvents((prev) => [...prev, { event: event.type, data }]);
        if (event.type === "complete") setDone(true);
        if (event.type === "error") {
          setError(typeof data?.message === "string" ? data.message : "stream error");
          setDone(true);
        }
      } catch {
        /* ignore malformed lines */
      }
    };

    ["snapshot", "progress", "complete", "error"].forEach((t) =>
      source.addEventListener(t, handler as EventListener),
    );
    source.onerror = () => {
      setError("connection lost");
      source.close();
    };

    return () => source.close();
  }, [url]);

  return { events, done, error };
}
