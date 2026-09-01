export const SITE_NAME = "Shortcut Hero";
export const SITE_TITLE = "Shortcut Hero — Learn keyboard shortcuts through play";
export const SITE_DESCRIPTION =
  "Learn keyboard shortcuts for Linear, Notion, and Slack in a rhythm game built for your browser.";
export const SOCIAL_IMAGE_PATH = "/og.png";
export const SOCIAL_IMAGE_ALT =
  "Shortcut Hero's sunset action highway with a Linear shortcut racing toward the strike line";

const LOCAL_ORIGIN = "http://localhost:3000";

export function resolveSiteOrigin(
  requestOrigin?: string | null,
  configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL,
): string {
  return (
    normalizeWebOrigin(configuredOrigin) ??
    normalizeWebOrigin(requestOrigin) ??
    LOCAL_ORIGIN
  );
}

export function originFromHeaders(requestHeaders: Headers): string {
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return LOCAL_ORIGIN;

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return resolveSiteOrigin(`${protocol}://${host}`);
}

function normalizeWebOrigin(value?: string | null): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}
