CREATE TABLE `referral_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`revoked_at` integer,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_codes_visitor_idx` ON `referral_codes` (`visitor_id`);--> statement-breakpoint
CREATE INDEX `referral_codes_expires_at_idx` ON `referral_codes` (`expires_at`);--> statement-breakpoint
CREATE TABLE `referral_conversions` (
	`id` text PRIMARY KEY NOT NULL,
	`referral_code` text NOT NULL,
	`referred_visitor_id` text NOT NULL,
	`completed_round_id` text NOT NULL,
	`converted_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`referral_code`) REFERENCES `referral_codes`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referred_visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`completed_round_id`) REFERENCES `rounds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referral_conversions_once_idx` ON `referral_conversions` (`referral_code`,`referred_visitor_id`);--> statement-breakpoint
CREATE INDEX `referral_conversions_expires_at_idx` ON `referral_conversions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`visitor_id` text NOT NULL,
	`track_id` text NOT NULL,
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
CREATE INDEX `rounds_visitor_completed_idx` ON `rounds` (`visitor_id`,`completed_at`);--> statement-breakpoint
CREATE INDEX `rounds_expires_at_idx` ON `rounds` (`expires_at`);--> statement-breakpoint
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
CREATE INDEX `shortcut_mastery_expires_at_idx` ON `shortcut_mastery` (`expires_at`);--> statement-breakpoint
CREATE TABLE `visitors` (
	`id` text PRIMARY KEY NOT NULL,
	`deletion_token_hash` text NOT NULL,
	`first_referral_code` text,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `visitors_expires_at_idx` ON `visitors` (`expires_at`);