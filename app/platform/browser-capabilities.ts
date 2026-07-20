"use client";

import { useEffect, useState } from "react";

export type GraphicsCapability = "checking" | "supported" | "unavailable";
export type RenderQuality = "full" | "reduced";
export type AudioCapability = "checking" | "supported" | "unavailable";

type NavigatorWithDeviceMemory = Navigator & {
  readonly deviceMemory?: number;
};

type WindowWithWebAudio = Window & {
  readonly AudioContext?: unknown;
  readonly webkitAudioContext?: unknown;
};

export type BrowserCapabilities = {
  readonly graphics: GraphicsCapability;
  readonly renderQuality: RenderQuality;
  readonly audio: AudioCapability;
};

const INITIAL_CAPABILITIES: BrowserCapabilities = {
  graphics: "checking",
  renderQuality: "full",
  audio: "checking",
};

export function useBrowserCapabilities(): BrowserCapabilities {
  const [capabilities, setCapabilities] = useState(INITIAL_CAPABILITIES);

  useEffect(() => {
    // requestAnimationFrame can be paused for a backgrounded or newly opened
    // tab. Capability detection is startup-critical, so do not make the game
    // wait for a paint that the browser may defer indefinitely.
    const timer = window.setTimeout(() => {
      setCapabilities(detectBrowserCapabilities(window, navigator));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return capabilities;
}

export function detectBrowserCapabilities(
  browserWindow: Window,
  browserNavigator: Navigator,
): BrowserCapabilities {
  const windowWithAudio = browserWindow as WindowWithWebAudio;
  return {
    graphics: supportsWebGL(browserWindow.document)
      ? "supported"
      : "unavailable",
    renderQuality: shouldReduceRenderQuality(browserNavigator)
      ? "reduced"
      : "full",
    audio:
      typeof windowWithAudio.AudioContext === "function" ||
      typeof windowWithAudio.webkitAudioContext === "function"
        ? "supported"
        : "unavailable",
  };
}

export function supportsWebGL(documentObject: Document): boolean {
  try {
    const canvas = documentObject.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

export function shouldReduceRenderQuality(
  browserNavigator: Navigator,
): boolean {
  const navigatorWithMemory = browserNavigator as NavigatorWithDeviceMemory;
  const lowCoreCount =
    browserNavigator.hardwareConcurrency > 0 &&
    browserNavigator.hardwareConcurrency <= 4;
  const lowMemory =
    typeof navigatorWithMemory.deviceMemory === "number" &&
    navigatorWithMemory.deviceMemory <= 4;
  return lowCoreCount || lowMemory;
}
