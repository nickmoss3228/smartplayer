ALTER TABLE "users" ADD COLUMN "school_exterior_owned" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school_facade_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school_roof_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school_trim_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "school_name" text;