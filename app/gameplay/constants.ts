export const SCORE_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export const SPEED_BPM = {
  relaxed: 112,
  standard: 144,
  turbo: 176,
} as const;

export const DIFFICULTY_LABELS = {
  easy: "Easy · Single keys",
  medium: "Medium · Keys + sequences",
  hard: "Hard · Mixed shortcuts",
  showcase: "All skills",
} as const;

export const DEPARTURE_DURATION_MS = 560;
