CREATE TABLE `domain_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` text NOT NULL,
	`domain` text NOT NULL,
	`location_code` integer NOT NULL,
	`language_code` text NOT NULL,
	`organic_traffic` integer,
	`organic_keywords` integer,
	`captured_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `domain_snapshots_project_domain_captured_idx` ON `domain_snapshots` (`project_id`,`domain`,`captured_at`);--> statement-breakpoint
CREATE TABLE `project_annotations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`date` text NOT NULL,
	`note` text NOT NULL,
	`url` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_annotations_project_date_idx` ON `project_annotations` (`project_id`,`date`);--> statement-breakpoint
ALTER TABLE `rank_tracking_keywords` ADD `target_url` text;