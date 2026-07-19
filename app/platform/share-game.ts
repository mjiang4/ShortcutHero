export type ShareResult = "shared" | "copied" | "unavailable";

export async function shareGameLink(): Promise<ShareResult> {
  const url = new URL("/", window.location.origin).toString();

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
    return "copied";
  } catch {
    return "unavailable";
  }
}
