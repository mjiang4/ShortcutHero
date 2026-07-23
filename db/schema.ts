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
    displayName: text("display_name"),
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
    runMode: text("run_mode").notNull().default("highway"),
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
    index("rounds_track_score_idx").on(table.trackId, table.score),
    index("rounds_expires_at_idx").on(table.expiresAt),
  ],
);

export const leaderboardEntries = sqliteTable(
  "leaderboard_entries",
  {
    id: text("id").primaryKey(),
    visitorId: text("visitor_id")
      .notNull()
      .references(() => visitors.id, { onDelete: "cascade" }),
    roundId: text("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    trackId: text("track_id").notNull(),
    runMode: text("run_mode").notNull(),
    displayName: text("display_name").notNull(),
    score: integer("score").notNull(),
    accuracyPct: real("accuracy_pct").notNull(),
    longestCombo: integer("longest_combo").notNull(),
    difficulty: text("difficulty").notNull(),
    completedAt: integer("completed_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("leaderboard_global_score_idx").on(table.score, table.completedAt),
    index("leaderboard_track_score_idx").on(
      table.trackId,
      table.score,
      table.completedAt,
    ),
    index("leaderboard_expires_at_idx").on(table.expiresAt),
    uniqueIndex("leaderboard_round_idx").on(table.roundId),
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

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    windowStartedAt: integer("window_started_at").notNull(),
    count: integer("count").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("rate_limits_expires_at_idx").on(table.expiresAt)],
);
