"use client";

import { useEffect } from "react";

import { SystemScreen } from "./components/system";
import { analytics } from "./analytics";

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    analytics.captureException(error, {
      boundary: "root",
      route: window.location.pathname,
      digest: error.digest,
    });
    if (process.env.NODE_ENV !== "production") {
      console.error("Shortcut Hero root failed", error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <SystemScreen
          eyebrow="shortcut hero"
          title="the game needs a reset"
          message="Reload the app to restore the title screen. Your local settings and high scores will remain in this browser."
          primaryLabel="reload app"
          onPrimary={reset}
        />
      </body>
    </html>
  );
}
