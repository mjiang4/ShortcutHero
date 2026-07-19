import { resolveSiteOrigin } from "../site-config";

const PUBLIC_ROUTES = ["/", "/privacy", "/terms"] as const;

export function GET(request: Request): Response {
  const origin = resolveSiteOrigin(new URL(request.url).origin);
  const urls = PUBLIC_ROUTES.map(
    (pathname) => `  <url><loc>${origin}${pathname}</loc></url>`,
  ).join("\n");
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
