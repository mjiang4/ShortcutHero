"use client";

import { useEffect, useState } from "react";

import type { EffectsMode } from "../components/settings/settings";

export function useSystemReducedMotion(effectsMode: EffectsMode): boolean {
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    effectsMode === "reduced" ||
    (effectsMode === "system" && systemReducedMotion)
  );
}
