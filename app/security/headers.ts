const POSTHOG_ORIGINS = [
  "https://us.i.posthog.com",
  "https://us-assets.i.posthog.com",
];

export function buildContentSecurityPolicy(production: boolean): string {
  const scriptSources = ["'self'", "'unsafe-inline'", "blob:"];
  const connectSources = ["'self'", ...POSTHOG_ORIGINS];
  if (!production) {
    scriptSources.push("'unsafe-eval'");
    connectSources.push("http:", "ws:", "wss:");
  }
  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (production) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function applySecurityHeaders(
  response: Response,
  production: boolean,
): Response {
  if (response.status === 101) return response;
  const secured = new Response(response.body, response);
  for (const { key, value } of getSecurityHeaders(production)) {
    secured.headers.set(key, value);
  }
  return secured;
}

export function getSecurityHeaders(
  production: boolean,
): { key: string; value: string }[] {
  const headers = [
    { key: "content-security-policy", value: buildContentSecurityPolicy(production) },
    { key: "cross-origin-opener-policy", value: "same-origin" },
    { key: "cross-origin-resource-policy", value: "same-origin" },
    { key: "referrer-policy", value: "strict-origin-when-cross-origin" },
    { key: "permissions-policy", value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()" },
    { key: "x-content-type-options", value: "nosniff" },
    { key: "x-frame-options", value: "DENY" },
  ];
  if (production) {
    headers.push({
      key: "strict-transport-security",
      value: "max-age=31536000; includeSubDomains",
    });
  }
  return headers;
}
