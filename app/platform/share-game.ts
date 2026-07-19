import { analytics, type ShareSurface } from "../analytics";

export type ShareResult = "shared" | "copied" | "unavailable";

export async function shareGameLink(
  surface: ShareSurface,
): Promise<ShareResult> {
  const url = new URL("/", window.location.origin).toString();
  const method =
    typeof navigator.share === "function" ? "native_share" : "clipboard";
  analytics.capture("share_clicked", { surface, method });

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "Shortcut Hero",
        text: "Learn keyboard shortcuts through play.",
        url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "unavailable";
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    analytics.capture("share_link_copied", { surface });
    return "copied";
  } catch {
    return "unavailable";
  }
}
