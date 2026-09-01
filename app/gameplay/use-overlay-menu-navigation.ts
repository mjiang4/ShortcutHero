"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

type OverlayMenuNavigationOptions = {
  readonly paused: boolean;
  readonly showingResults: boolean;
  readonly pauseMenuIndex: number;
  readonly resultsMenuIndex: number;
  readonly setPauseMenuIndex: Dispatch<SetStateAction<number>>;
  readonly setResultsMenuIndex: Dispatch<SetStateAction<number>>;
  readonly resume: () => void;
  readonly restart: () => void;
  readonly returnHome: () => void;
  readonly resultsActionCount: 2 | 3;
  readonly shareResults: () => void;
};

export function useOverlayMenuNavigation({
  paused,
  showingResults,
  pauseMenuIndex,
  resultsMenuIndex,
  setPauseMenuIndex,
  setResultsMenuIndex,
  resume,
  restart,
  returnHome,
  resultsActionCount,
  shareResults,
}: OverlayMenuNavigationOptions): void {
  useEffect(() => {
    if (!paused && !showingResults) return;

    const onMenuKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // Result disclosures and the optional name form own their keyboard input.
      if (event.target instanceof Element && event.target.closest("summary, form, .results-player")) return;
      const itemCount = paused ? 3 : resultsActionCount;
      const currentIndex = paused ? pauseMenuIndex : resultsMenuIndex;
      const setIndex = paused ? setPauseMenuIndex : setResultsMenuIndex;

      if (
        event.code === "ArrowDown" ||
        event.code === "ArrowRight" ||
        event.code === "KeyS" ||
        event.code === "KeyD"
      ) {
        event.preventDefault();
        setIndex((current) => (current + 1) % itemCount);
        return;
      }
      if (
        event.code === "ArrowUp" ||
        event.code === "ArrowLeft" ||
        event.code === "KeyW" ||
        event.code === "KeyA"
      ) {
        event.preventDefault();
        setIndex((current) => (current - 1 + itemCount) % itemCount);
        return;
      }
      if (
        event.code === "Escape" ||
        event.key === "Escape" ||
        event.key === "Esc"
      ) {
        event.preventDefault();
        if (paused) resume();
        else returnHome();
        return;
      }
      if (event.code !== "Enter" && event.code !== "Space") return;

      event.preventDefault();
      if (paused) {
        if (currentIndex === 0) resume();
        else if (currentIndex === 1) restart();
        else returnHome();
      } else if (currentIndex === 0) restart();
      else if (resultsActionCount === 3 && currentIndex === 1) shareResults();
      else returnHome();
    };

    window.addEventListener("keydown", onMenuKey);
    return () => window.removeEventListener("keydown", onMenuKey);
  }, [
    pauseMenuIndex,
    paused,
    restart,
    resultsMenuIndex,
    resume,
    returnHome,
    resultsActionCount,
    shareResults,
    setPauseMenuIndex,
    setResultsMenuIndex,
    showingResults,
  ]);
}
