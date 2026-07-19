export const REFERRAL_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

export type SharePromptTrigger =
  | "personal_best"
  | "third_round"
  | "high_accuracy";

export function normalizeReferralCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null;
}
