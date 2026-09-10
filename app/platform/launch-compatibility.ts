"use client";

import { useEffect, useState } from "react";

import type { KeyboardPlatform } from "../game/types";

export type OperatingSystem =
  | "macOS"
  | "Windows"
  | "iOS"
  | "Android"
  | "Other";
export type BrowserName =
  | "Google Chrome"
  | "Safari"
  | "Firefox"
  | "Microsoft Edge"
  | "your browser";
export type LaunchSupport =
  | "supported"
  | "mobile"
  | "untested";

export type SystemSignals = {
  readonly maxTouchPoints?: number;
  readonly coarsePointer?: boolean;
  readonly viewportWidth?: number;
};

export type SystemInfo = {
  readonly operatingSystem: OperatingSystem;
  readonly browser: BrowserName;
  readonly likelyPhysicalKeyboard: boolean;
  readonly browserSupported: boolean;
  readonly launchSupport: LaunchSupport;
};

export const DEFAULT_SYSTEM_INFO: SystemInfo = {
  operatingSystem: "Other",
  browser: "your browser",
  likelyPhysicalKeyboard: true,
  browserSupported: false,
  launchSupport: "untested",
};

export function useSystemInfo(): SystemInfo | null {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  useEffect(() => {
    // This check must complete even when the tab is initially backgrounded.
    // Browsers are allowed to pause animation frames in that state.
    const timer = window.setTimeout(() => {
      setSystemInfo(
        detectSystem(window.navigator.userAgent, {
          maxTouchPoints: window.navigator.maxTouchPoints,
          coarsePointer: window.matchMedia("(pointer: coarse)").matches,
          viewportWidth: window.innerWidth,
        }),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return systemInfo;
}

export function detectSystem(
  userAgent: string,
  signals: SystemSignals = {},
): SystemInfo {
  const isiPadDesktopAgent =
    /Macintosh/i.test(userAgent) && (signals.maxTouchPoints ?? 0) > 1;
  const operatingSystem: OperatingSystem = /iPhone|iPad|iPod/i.test(userAgent) ||
    isiPadDesktopAgent
    ? "iOS"
    : /Android/i.test(userAgent)
      ? "Android"
      : /Win/i.test(userAgent)
        ? "Windows"
        : /Mac/i.test(userAgent)
          ? "macOS"
          : "Other";
  const browser: BrowserName = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /Chrome\/|CriOS\//.test(userAgent)
      ? "Google Chrome"
      : /Firefox\/|FxiOS\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "your browser";
  const mobileUserAgent = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
  const compactTouchDevice =
    Boolean(signals.coarsePointer) &&
    (signals.maxTouchPoints ?? 0) > 0 &&
    (signals.viewportWidth ?? Number.POSITIVE_INFINITY) < 1024;
  const likelyPhysicalKeyboard = !(mobileUserAgent || isiPadDesktopAgent || compactTouchDevice);
  const browserSupported = [
    "Google Chrome",
    "Safari",
    "Firefox",
    "Microsoft Edge",
  ].includes(browser);
  const launchSupport: LaunchSupport = !likelyPhysicalKeyboard
    ? "mobile"
    : (operatingSystem === "macOS" || operatingSystem === "Windows") && browserSupported
      ? "supported"
      : "untested";

  return {
    operatingSystem,
    browser,
    likelyPhysicalKeyboard,
    browserSupported,
    launchSupport,
  };
}

export function supportMessage(systemInfo: SystemInfo): string {
  if (systemInfo.launchSupport === "supported") {
    return `Ready for the ${keyboardPlatformLabel(systemInfo)} shortcut track.`;
  }
  if (systemInfo.launchSupport === "mobile") {
    return "A physical keyboard is required to play.";
  }
  return "For launch, use a Mac or Windows computer with Chrome, Edge, Safari, or Firefox.";
}

export function keyboardPlatform(systemInfo: SystemInfo): KeyboardPlatform {
  return systemInfo.operatingSystem === "Windows" ? "windows" : "macos";
}

export function keyboardPlatformLabel(systemInfo: SystemInfo): "Mac" | "Windows" {
  return keyboardPlatform(systemInfo) === "windows" ? "Windows" : "Mac";
}
