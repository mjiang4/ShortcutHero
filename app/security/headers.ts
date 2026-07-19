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
  secured.headers.set(
    "content-security-policy",
    buildContentSecurityPolicy(production),
  );
  secured.headers.set("cross-origin-opener-policy", "same-origin");
  secured.headers.set("cross-origin-resource-policy", "same-origin");
  secured.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  secured.headers.set(
    "permissions-policy",
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  );
  if (production) {
    secured.headers.set(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains",
    );
  }
  secured.headers.set("x-content-type-options", "nosniff");
  secured.headers.set("x-frame-options", "DENY");
  return secured;
}
