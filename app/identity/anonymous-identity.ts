"use client";

export type AnonymousIdentity = {
  readonly visitorId: string;
  readonly deletionToken: string;
};

const IDENTITY_STORAGE_KEY = "shortcut-hero:anonymous-identity:v1";
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
    // A fresh in-memory identity still keeps the current session functional.
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
    // Persistence can be unavailable in privacy-restricted browser contexts.
  }
  return cachedIdentity;
}

export function createRoundId(): string {
  return `r_${randomHex(16)}`;
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
