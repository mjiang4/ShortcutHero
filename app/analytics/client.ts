"use client";

import type { AnalyticsEventMap, AnalyticsEventName } from "./events";

type SafeProperty = string | number | boolean;
type SafeProperties = Record<string, SafeProperty>;
type PendingEvent = {
  readonly name: AnalyticsEventName;
  readonly properties: SafeProperties;
};
type AnalyticsSink = {
  capture(name: string, properties: SafeProperties): void;
  getAnonymousId(): string | null;
};

const PROJECT_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const REPLAY_ENABLED =
  process.env.NEXT_PUBLIC_POSTHOG_REPLAY_ENABLED === "true";
const REPLAY_SAMPLE_RATE = clampSampleRate(
  Number(process.env.NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE ?? 0.05),
);
const IS_CONFIGURED = Boolean(PROJECT_TOKEN && POSTHOG_HOST);
const SHOULD_INITIALIZE =
  process.env.NODE_ENV === "production" && IS_CONFIGURED;
const MAX_QUEUED_EVENTS = 50;
const FORBIDDEN_PROPERTY_KEYS = new Set([
  "action",
  "email",
  "input",
  "key",
  "keys",
  "name",
  "shortcut",
  "user_name",
]);

let sink: AnalyticsSink | null = null;
let initialization: Promise<void> | null = null;
const queue: PendingEvent[] = [];

export const analytics = {
  capture<Name extends AnalyticsEventName>(
    name: Name,
    properties: AnalyticsEventMap[Name],
  ): void {
    if (!SHOULD_INITIALIZE) return;
    const safeProperties = sanitizeAnalyticsProperties(properties);
    if (sink) {
      sink.capture(name, safeProperties);
      return;
    }
    if (queue.length < MAX_QUEUED_EVENTS) {
      queue.push({ name, properties: safeProperties });
    }
  },

  getAnonymousId(): string | null {
    return sink?.getAnonymousId() ?? null;
  },
};

export function initializeAnalytics(): Promise<void> {
  if (!SHOULD_INITIALIZE) return Promise.resolve();
  initialization ??= initializePostHog();
  return initialization;
}

async function initializePostHog(): Promise<void> {
  try {
    const { default: posthog } = await import("posthog-js");
    posthog.init(PROJECT_TOKEN!, {
      api_host: POSTHOG_HOST,
      defaults: "2026-05-30",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      person_profiles: "never",
      disable_session_recording: !REPLAY_ENABLED,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: ".onboarding-field, .screen-reader-only",
        blockSelector: ".game-canvas",
        captureCanvas: { recordCanvas: false },
        recordHeaders: false,
        recordBody: false,
        sampleRate: REPLAY_SAMPLE_RATE,
      },
    });
    sink = {
      capture: (name, properties) => posthog.capture(name, properties),
      getAnonymousId: () => posthog.get_distinct_id(),
    };
    for (const event of queue.splice(0)) {
      sink.capture(event.name, event.properties);
    }
  } catch (error) {
    queue.length = 0;
    console.warn("Shortcut Hero analytics could not initialize", error);
  }
}

export function sanitizeAnalyticsProperties(
  properties: object,
): SafeProperties {
  const safe: SafeProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (FORBIDDEN_PROPERTY_KEYS.has(key)) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      safe[key] = value;
    }
  }
  return safe;
}

function clampSampleRate(value: number): number {
  if (!Number.isFinite(value)) return 0.05;
  return Math.min(1, Math.max(0, value));
}
