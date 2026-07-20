"use client";

import { useEffect } from "react";

import { GameLoadingScreen } from "../components/system";

export default function PlayPage() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        params.set("play", "1");
        window.location.replace(`/?${params.toString()}`);
      } catch {
        window.location.assign("/");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return <GameLoadingScreen />;
}
