ALTER TABLE "users" ADD COLUMN "onboarding_english_level" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_listening_experience" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_onboarding_english_level" CHECK (onboarding_english_level IS NULL OR onboarding_english_level IN ('beginner', 'elementary', 'intermediate', 'upper_intermediate', 'advanced'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_onboarding_listening_experience" CHECK (onboarding_listening_experience IS NULL OR onboarding_listening_experience IN ('none', 'subtitles', 'no_subtitles', 'courses', 'immersion'));