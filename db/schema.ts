import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const visitors = sqliteTable(
  "visitors",
  {
    id: text("id").primaryKey(),
    deletionTokenHash: text("deletion_token_hash").notNull(),
    firstReferralCode: text("first_referral_code"),
    createdAt: integer("created_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("visitors_expires_at_idx").on(table.expiresAt)],
);

export const rounds = sqliteTable(
  "rounds",
  {
    id: text("id").primaryKey(),
    visitorId: text("visitor_id")
      .notNull()
      .references(() => visitors.id, { onDelete: "cascade" }),
    trackId: text("track_id").notNull(),
    difficulty: text("difficulty").notNull(),
    guidance: text("guidance").notNull(),
    pace: text("pace").notNull(),
    sessionSeconds: integer("session_seconds").notNull(),
    soundEnabled: integer("sound_enabled", { mode: "boolean" }).notNull(),
    effectsMode: text("effects_mode").notNull(),
    score: integer("score").notNull(),
    accuracyPct: real("accuracy_pct").notNull(),
    longestCombo: integer("longest_combo").notNull(),
    attempts: integer("attempts").notNull(),
    correctAnswers: integer("correct_answers").notNull(),
    misses: integer("misses").notNull(),
    uniqueShortcutsCorrect: integer("unique_shortcuts_correct").notNull(),
    durationMs: integer("duration_ms").notNull(),
    completedAt: integer("completed_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("rounds_visitor_completed_idx").on(
      table.visitorId,
      table.completedAt,
    ),
    index("rounds_expires_at_idx").on(table.expiresAt),
  ],
);

export const shortcutMastery = sqliteTable(
  "shortcut_mastery",
  {
    visitorId: text("visitor_id")
      .notNull()
      .references(() => visitors.id, { onDelete: "cascade" }),
    trackId: text("track_id").notNull(),
    shortcutId: text("shortcut_id").notNull(),
    attempts: integer("attempts").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    cleanHits: integer("clean_hits").notNull().default(0),
    perfectHits: integer("perfect_hits").notNull().default(0),
    misses: integer("misses").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.visitorId, table.trackId, table.shortcutId],
    }),
    index("shortcut_mastery_expires_at_idx").on(table.expiresAt),
  ],
);

export const referralCodes = sqliteTable(
  "referral_codes",
  {
    code: text("code").primaryKey(),
    visitorId: text("visitor_id")
      .notNull()
      .references(() => visitors.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    revokedAt: integer("revoked_at"),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    uniqueIndex("referral_codes_visitor_idx").on(table.visitorId),
    index("referral_codes_expires_at_idx").on(table.expiresAt),
  ],
);

export const referralConversions = sqliteTable(
  "referral_conversions",
  {
    id: text("id").primaryKey(),
    referralCode: text("referral_code")
      .notNull()
      .references(() => referralCodes.code, { onDelete: "cascade" }),
    referredVisitorId: text("referred_visitor_id")
      .notNull()
      .references(() => visitors.id, { onDelete: "cascade" }),
    completedRoundId: text("completed_round_id").notNull(),
    convertedAt: integer("converted_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    uniqueIndex("referral_conversions_once_idx").on(
      table.referralCode,
      table.referredVisitorId,
    ),
    index("referral_conversions_expires_at_idx").on(table.expiresAt),
  ],
);
