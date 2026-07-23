"use client";

export type AnonymousIdentity = {
  readonly visitorId: string;
  readonly deletionToken: string;
};

const IDENTITY_STORAGE_KEY = "shortcut-hero:anonymous-identity:v1";
const DISPLAY_NAME_KEY = "shortcut-hero:display-name:v1";
const VISITOR_ID_PATTERN = /^v_[a-f0-9]{32}$/;
const DELETION_TOKEN_PATTERN = /^d_[a-f0-9]{64}$/;

let cachedIdentity: AnonymousIdentity | null = null;

export function getOrCreateAnonymousIdentity(): AnonymousIdentity {
  if (cachedIdentity) return cachedIdentity;

  try {
    const raw = window.localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, unknown>;
      if (
        typeof saved.visitorId === "string" &&
        typeof saved.deletionToken === "string" &&
        VISITOR_ID_PATTERN.test(saved.visitorId) &&
        DELETION_TOKEN_PATTERN.test(saved.deletionToken)
      ) {
        cachedIdentity = {
          visitorId: saved.visitorId,
          deletionToken: saved.deletionToken,
        };
        return cachedIdentity;
      }
    }
  } catch {
    // Fall through to a fresh identity.
  }

  cachedIdentity = {
    visitorId: `v_${randomHex(16)}`,
    deletionToken: `d_${randomHex(32)}`,
  };
  try {
    window.localStorage.setItem(
      IDENTITY_STORAGE_KEY,
      JSON.stringify(cachedIdentity),
    );
  } catch {
    // Privacy-restricted contexts may block storage.
  }
  return cachedIdentity;
}

export function createRoundId(): string {
  return `r_${randomHex(16)}`;
}

export function getDisplayName(): string {
  try {
    const saved = window.localStorage.getItem(DISPLAY_NAME_KEY);
    if (saved && saved.trim().length >= 2 && saved.trim().length <= 24) {
      return saved.trim();
    }
  } catch {
    // ignore
  }
  const suffix = getOrCreateAnonymousIdentity().visitorId.slice(-4);
  return `Pilot-${suffix}`;
}

export function setDisplayName(name: string): void {
  const trimmed = name.trim().slice(0, 24);
  if (trimmed.length < 2) return;
  try {
    window.localStorage.setItem(DISPLAY_NAME_KEY, trimmed);
  } catch {
    // ignore
  }
}

export function clearAnonymousIdentity(): void {
  cachedIdentity = null;
  try {
    window.localStorage.removeItem(IDENTITY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
