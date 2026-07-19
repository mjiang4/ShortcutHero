"use client";

import { useEffect } from "react";

import { SystemScreen } from "./components/system";

export default function AppError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("Shortcut Hero route failed", error);
  }, [error]);

  return (
    <SystemScreen
      eyebrow="something went wrong"
      title="we lost the beat"
      message="Try this screen again. If the problem continues, return to the title screen and start a new run."
      primaryLabel="try again"
      onPrimary={reset}
    />
  );
}
