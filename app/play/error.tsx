"use client";

import { useEffect } from "react";

import { SystemScreen } from "../components/system";
import { analytics } from "../analytics";

export default function PlayError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    analytics.captureException(error, {
      boundary: "play",
      route: window.location.pathname,
      digest: error.digest,
    });
    if (process.env.NODE_ENV !== "production") {
      console.error("Shortcut Hero play route failed", error);
    }
  }, [error]);

  return (
    <SystemScreen
      eyebrow="run interrupted"
      title="the game could not start"
      message="Try loading the run again. Your settings are still saved in this browser."
      primaryLabel="try again"
      onPrimary={reset}
    />
  );
}
