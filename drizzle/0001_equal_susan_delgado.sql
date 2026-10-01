CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`sender_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_sender_created` ON `messages` (`sender_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_created` ON `messages` (`created_at`);