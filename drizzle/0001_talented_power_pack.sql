PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_referral_conversions` (
	`id` text PRIMARY KEY NOT NULL,
	`referral_code` text NOT NULL,
	`referred_visitor_id` text NOT NULL,
	`completed_round_id` text NOT NULL,
	`converted_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`referral_code`) REFERENCES `referral_codes`(`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referred_visitor_id`) REFERENCES `visitors`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_referral_conversions`("id", "referral_code", "referred_visitor_id", "completed_round_id", "converted_at", "expires_at") SELECT "id", "referral_code", "referred_visitor_id", "completed_round_id", "converted_at", "expires_at" FROM `referral_conversions`;--> statement-breakpoint
DROP TABLE `referral_conversions`;--> statement-breakpoint
ALTER TABLE `__new_referral_conversions` RENAME TO `referral_conversions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `referral_conversions_once_idx` ON `referral_conversions` (`referral_code`,`referred_visitor_id`);--> statement-breakpoint
CREATE INDEX `referral_conversions_expires_at_idx` ON `referral_conversions` (`expires_at`);