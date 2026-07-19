import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { AnalyticsBootstrap } from "./analytics";
import {
  originFromHeaders,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SOCIAL_IMAGE_ALT,
  SOCIAL_IMAGE_PATH,
} from "./site-config";
import "./globals.css";
import "./components/settings/settings-screen.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const origin = originFromHeaders(requestHeaders);

  return {
    metadataBase: new URL(origin),
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    category: "game",
    alternates: { canonical: "/" },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: "/",
      images: [
        {
          url: SOCIAL_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: SOCIAL_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [{ url: SOCIAL_IMAGE_PATH, alt: SOCIAL_IMAGE_ALT }],
    },
  };
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#07070a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AnalyticsBootstrap />
        {children}
      </body>
    </html>
  );
}
