PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`username` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`read_only` integer DEFAULT false NOT NULL,
	`discord_user_id` text,
	`settings` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "username", "name", "password_hash", "is_admin", "read_only", "discord_user_id", "settings", "created_at") SELECT "id", "email", "username", "name", "password_hash", "is_admin", false, "discord_user_id", "settings", "created_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `comments` ADD `resolved_at` integer;--> statement-breakpoint
ALTER TABLE `comments` ADD `resolved_by` text REFERENCES users(id) ON DELETE set null;