ALTER TABLE "story" ADD COLUMN "content_source" text DEFAULT 'db' NOT NULL;--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "character" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "paid" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "ready" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "price_minor" integer;--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "free_parts" integer;--> statement-breakpoint
ALTER TABLE "story" ADD COLUMN "preview_seconds" integer;--> statement-breakpoint
ALTER TABLE "story" ADD CONSTRAINT "story_content_source_valid" CHECK (content_source IN ('db', 'builtin'));--> statement-breakpoint
ALTER TABLE "story" ADD CONSTRAINT "story_price_minor_range" CHECK ("story"."price_minor" IS NULL OR "story"."price_minor" >= 0);--> statement-breakpoint
ALTER TABLE "story" ADD CONSTRAINT "story_free_parts_range" CHECK ("story"."free_parts" IS NULL OR ("story"."free_parts" >= 0 AND "story"."free_parts" <= "story"."total_parts"));--> statement-breakpoint
ALTER TABLE "story" ADD CONSTRAINT "story_preview_seconds_range" CHECK ("story"."preview_seconds" IS NULL OR "story"."preview_seconds" > 0);