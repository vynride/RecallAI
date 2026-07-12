"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { StatusScreen, secondaryLinkClass } from "@/components/ui/StatusScreen";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error to the console (and any logging hooks) for diagnosis.
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      eyebrow="Something went wrong"
      title="That didn't go to plan."
      description={
        <>
          An unexpected error tripped us up. Try again — if it keeps happening, head back
          home and give it a minute.
          {error.digest && (
            <span className="mt-4 block font-mono text-xs text-muted">Ref: {error.digest}</span>
          )}
        </>
      }
      actions={
        <>
          <Button size="lg" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/" className={secondaryLinkClass}>
            Back to home
          </Link>
        </>
      }
    />
  );
}
