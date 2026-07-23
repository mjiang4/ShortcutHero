CREATE TABLE `visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`deletion_token_hash` text NOT NULL,
	`display_name` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `visitors_expires_at_idx` ON `visitors` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`track_id` text NOT NULL,
	`run_mode` text DEFAULT 'highway' NOT NULL,
	`difficulty` text NOT NULL,
	`guidance` text NOT NULL,
	`pace` text NOT NULL,
	`session_seconds` integer NOT NULL,
	`sound_enabled` integer NOT NULL,
	`effects_mode` text NOT NULL,
	`score` integer NOT NULL,
	`accuracy_pct` real NOT NULL,
	`longest_combo` integer NOT NULL,
	`attempts` integer NOT NULL,
	`correct_answers` integer NOT NULL,
	`misses` integer NOT NULL,
	`unique_shortcuts_correct` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`completed_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rounds_visitor_completed_idx` ON `rounds` (`visitor_id`,`completed_at`);
--> statement-breakpoint
CREATE INDEX `rounds_track_score_idx` ON `rounds` (`track_id`,`score`);
--> statement-breakpoint
CREATE INDEX `rounds_expires_at_idx` ON `rounds` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `leaderboard_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`round_id` text NOT NULL,
	`track_id` text NOT NULL,
	`run_mode` text NOT NULL,
	`display_name` text NOT NULL,
	`score` integer NOT NULL,
	`accuracy_pct` real NOT NULL,
	`longest_combo` integer NOT NULL,
	`difficulty` text NOT NULL,
	`completed_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `leaderboard_global_score_idx` ON `leaderboard_entries` (`score`,`completed_at`);
--> statement-breakpoint
CREATE INDEX `leaderboard_track_score_idx` ON `leaderboard_entries` (`track_id`,`score`,`completed_at`);
--> statement-breakpoint
CREATE INDEX `leaderboard_expires_at_idx` ON `leaderboard_entries` (`expires_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `leaderboard_round_idx` ON `leaderboard_entries` (`round_id`);
--> statement-breakpoint
CREATE TABLE `shortcut_mastery` (
	`visitor_id` text NOT NULL,
	`track_id` text NOT NULL,
	`shortcut_id` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`clean_hits` integer DEFAULT 0 NOT NULL,
	`perfect_hits` integer DEFAULT 0 NOT NULL,
	`misses` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`visitor_id`, `track_id`, `shortcut_id`),
	FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shortcut_mastery_expires_at_idx` ON `shortcut_mastery` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limits_expires_at_idx` ON `rate_limits` (`expires_at`);
