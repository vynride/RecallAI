import type { Metadata } from "next";
import Link from "next/link";

import {
  StatusScreen,
  primaryActionClass,
  secondaryLinkClass,
} from "@/components/ui/StatusScreen";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <StatusScreen
      eyebrow="Error 404"
      title="This page isn't on the syllabus."
      description="The page you're looking for doesn't exist, or it moved. Let's get you back to studying."
      actions={
        <>
          <Link href="/" className={primaryActionClass}>
            Back to home
          </Link>
          <Link href="/dashboard" className={secondaryLinkClass}>
            Open dashboard
          </Link>
        </>
      }
    />
  );
}
