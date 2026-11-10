CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`from_id` text NOT NULL,
	`from_side` text NOT NULL,
	`to_id` text NOT NULL,
	`to_side` text NOT NULL,
	`style` text DEFAULT 'line' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_id`) REFERENCES `inspirations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_id`) REFERENCES `inspirations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `connections_project_idx` ON `connections` (`project_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_inspirations` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`track_id` text,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`x` real DEFAULT 40 NOT NULL,
	`y` real DEFAULT 40 NOT NULL,
	`w` real DEFAULT 240 NOT NULL,
	`h` real DEFAULT 160 NOT NULL,
	`z` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_inspirations`("id", "project_id", "track_id", "type", "data", "x", "y", "w", "h", "z", "created_at") SELECT "id", "project_id", "track_id", "type", "data", "x", "y", "w", "h", "z", "created_at" FROM `inspirations`;--> statement-breakpoint
DROP TABLE `inspirations`;--> statement-breakpoint
ALTER TABLE `__new_inspirations` RENAME TO `inspirations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `inspirations_project_idx` ON `inspirations` (`project_id`);--> statement-breakpoint
CREATE INDEX `inspirations_track_idx` ON `inspirations` (`track_id`);