CREATE TABLE `editorial_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` text NOT NULL,
	`token` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `editorial_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`label` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `revisions_post_created` ON `editorial_revisions` (`post_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `media_library` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`alt` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `post_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`publish_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `schedules_publish_at` ON `post_schedules` (`publish_at`);