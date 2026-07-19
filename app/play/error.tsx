"use client";

import { useEffect } from "react";

import { SystemScreen } from "../components/system";

export default function PlayError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("Shortcut Hero play route failed", error);
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
