import type { NextConfig } from "next";
import { buildContentSecurityPolicy, getSecurityHeaders } from "./app/security/headers";

const nextConfig: NextConfig = {
  async headers() {
    const production = process.env.NODE_ENV === "production";
    return [
      { source: "/:path*", headers: getSecurityHeaders(production) },
      {
        source: "/:path*",
        has: [{ type: "host", value: "localhost" }],
        // Safari upgrades localhost assets to HTTPS even for a local HTTP server.
        // Keep the public-host policy unchanged, including its HTTPS upgrade.
        headers: [{
          key: "content-security-policy",
          value: buildContentSecurityPolicy(production).replace("; upgrade-insecure-requests", ""),
        }],
      },
    ];
  },
};

export default nextConfig;
