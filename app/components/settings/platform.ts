import type { SystemInfo } from "./title-types";

export const DEFAULT_SYSTEM_INFO: SystemInfo = {
  operatingSystem: "Other",
  browser: "your browser",
};

export function detectSystem(userAgent: string): SystemInfo {
  const operatingSystem = /Mac|iPhone|iPad/i.test(userAgent)
    ? "macOS"
    : /Win/i.test(userAgent)
      ? "Windows"
      : "Other";
  const browser = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /Chrome\//.test(userAgent)
      ? "Google Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "your browser";

  return { operatingSystem, browser };
}
