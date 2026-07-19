"use client";

import { useEffect } from "react";

import { SystemScreen } from "./components/system";

export default function GlobalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("Shortcut Hero root failed", error);
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
