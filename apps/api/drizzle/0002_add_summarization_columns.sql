ALTER TABLE `digest_items` ADD `summary` text;--> statement-breakpoint
ALTER TABLE `digest_items` ADD `summarize` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `digest_items` ADD `summary_prompt` text;