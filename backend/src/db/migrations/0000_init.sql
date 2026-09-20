CREATE TABLE "admin_audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_name" text NOT NULL,
	"actor_session_id" text,
	"actor_token_issued_at" timestamp with time zone,
	"ip" text,
	"user_agent" text,
	"action" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"status_code" integer NOT NULL,
	"outcome" text NOT NULL,
	"duration_ms" integer,
	"summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_audit_log_method_valid" CHECK (method IN ('POST', 'PUT', 'PATCH', 'DELETE')),
	CONSTRAINT "admin_audit_log_outcome_valid" CHECK (outcome IN ('success', 'client_error', 'server_error'))
);
--> statement-breakpoint
CREATE TABLE "fake_payment" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'RUB' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"callback_url" text NOT NULL,
	"sim_delay_ms" integer DEFAULT 2000 NOT NULL,
	"sim_deliver" text DEFAULT 'once' NOT NULL,
	"sim_amount" text DEFAULT 'correct' NOT NULL,
	"deliveries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"delivered" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fake_payment_status_valid" CHECK (status IN ('NEW', 'PENDING', 'PAID', 'FAILED', 'CANCELED')),
	CONSTRAINT "fake_payment_sim_deliver_valid" CHECK (sim_deliver IN ('once', 'twice', 'never')),
	CONSTRAINT "fake_payment_sim_amount_valid" CHECK (sim_amount IN ('correct', 'wrong'))
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "part_markers" (
	"difficulty" text NOT NULL,
	"story_id" text NOT NULL,
	"part_number" integer NOT NULL,
	"time_markers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "part_markers_difficulty_story_id_part_number_pk" PRIMARY KEY("difficulty","story_id","part_number"),
	CONSTRAINT "part_markers_difficulty_valid" CHECK (difficulty IN ('easy', 'medium', 'hard'))
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'fake' NOT NULL,
	"provider_payment_id" text,
	"idempotence_key" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'RUB' NOT NULL,
	"confirmation_url" text,
	"cancellation_reason" text,
	"paid_at" timestamp with time zone,
	"granted_at" timestamp with time zone,
	"grant_applied_at" timestamp with time zone,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_status_valid" CHECK (status IN ('pending', 'succeeded', 'canceled', 'failed', 'refunded'))
);
--> statement-breakpoint
CREATE TABLE "payment_item" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payment_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"sku" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"duration_days" integer
);
--> statement-breakpoint
CREATE TABLE "progress" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"difficulty" text NOT NULL,
	"completed_levels" integer[] DEFAULT '{}' NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_difficulty_valid" CHECK (difficulty IN ('easy', 'medium', 'hard'))
);
--> statement-breakpoint
CREATE TABLE "progress_level_result" (
	"progress_id" uuid NOT NULL,
	"story_id" text NOT NULL,
	"part_number" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"correct_answers" integer DEFAULT 0 NOT NULL,
	"total_questions" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "progress_level_result_progress_id_story_id_part_number_pk" PRIMARY KEY("progress_id","story_id","part_number")
);
--> statement-breakpoint
CREATE TABLE "story" (
	"id" uuid PRIMARY KEY NOT NULL,
	"difficulty" text NOT NULL,
	"story_id" text NOT NULL,
	"story_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"title_ru" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_ru" text DEFAULT '' NOT NULL,
	"character_icon" text DEFAULT '📖' NOT NULL,
	"total_parts" integer NOT NULL,
	"category" text,
	"cover_url" text,
	"published" boolean DEFAULT false NOT NULL,
	"legacy_mongo_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_difficulty_valid" CHECK (difficulty IN ('easy', 'medium', 'hard')),
	CONSTRAINT "story_category_valid" CHECK (category IS NULL OR category IN ('general', 'news')),
	CONSTRAINT "story_total_parts_range" CHECK ("story"."total_parts" BETWEEN 1 AND 20)
);
--> statement-breakpoint
CREATE TABLE "story_part" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_pk" uuid NOT NULL,
	"part_number" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"audio_url" text,
	"help_audio" text[] DEFAULT '{}' NOT NULL,
	"comic_url" text
);
--> statement-breakpoint
CREATE TABLE "story_part_marker" (
	"id" uuid PRIMARY KEY NOT NULL,
	"part_pk" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"time" double precision NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"color" text DEFAULT 'red' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_part_quiz" (
	"id" uuid PRIMARY KEY NOT NULL,
	"part_pk" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"question" text NOT NULL,
	"options" text[] NOT NULL,
	"correct_answer" integer NOT NULL,
	"reference_time" double precision DEFAULT 0 NOT NULL,
	"audio_fast" text,
	"audio_slow" text,
	CONSTRAINT "story_part_quiz_four_options" CHECK (cardinality("story_part_quiz"."options") = 4),
	CONSTRAINT "story_part_quiz_answer_range" CHECK ("story_part_quiz"."correct_answer" BETWEEN 0 AND 3)
);
--> statement-breakpoint
CREATE TABLE "story_part_vocab" (
	"id" uuid PRIMARY KEY NOT NULL,
	"part_pk" uuid NOT NULL,
	"kind" text NOT NULL,
	"ordinal" integer NOT NULL,
	"word" text NOT NULL,
	"definition" text DEFAULT '' NOT NULL,
	"audio_key" text NOT NULL,
	"audio_url" text,
	CONSTRAINT "story_part_vocab_kind_valid" CHECK (kind IN ('vocabulary', 'phrasal'))
);
--> statement-breakpoint
CREATE TABLE "story_progress" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"difficulty" text NOT NULL,
	"story_id" text NOT NULL,
	"completed_parts" integer[] DEFAULT '{}' NOT NULL,
	"current_part" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_progress_difficulty_valid" CHECK (difficulty IN ('easy', 'medium', 'hard'))
);
--> statement-breakpoint
CREATE TABLE "story_visibility" (
	"difficulty" text NOT NULL,
	"story_id" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_visibility_difficulty_story_id_pk" PRIMARY KEY("difficulty","story_id"),
	CONSTRAINT "story_visibility_difficulty_valid" CHECK (difficulty IN ('easy', 'medium', 'hard'))
);
--> statement-breakpoint
CREATE TABLE "user_entitlement" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"source" text DEFAULT 'purchase' NOT NULL,
	"payment_id" uuid,
	CONSTRAINT "user_entitlement_source_valid" CHECK (source IN ('purchase', 'admin', 'promo'))
);
--> statement-breakpoint
CREATE TABLE "user_learned_word" (
	"user_id" uuid NOT NULL,
	"word" text NOT NULL,
	"learned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_learned_word_user_id_word_pk" PRIMARY KEY("user_id","word")
);
--> statement-breakpoint
CREATE TABLE "user_session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"jti" text NOT NULL,
	"device_id" text NOT NULL,
	"device_label" text,
	"ip_prefix" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"password" text NOT NULL,
	"phone_number" text,
	"is_phone_verified" boolean DEFAULT false NOT NULL,
	"pending_registration" boolean DEFAULT false NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"legal_consent_version" text,
	"legal_consent_terms_accepted_at" timestamp with time zone,
	"legal_consent_data_accepted_at" timestamp with time zone,
	"phone_verification_code_hash" text,
	"phone_verification_expires" timestamp with time zone,
	"phone_verification_attempts" integer DEFAULT 0 NOT NULL,
	"phone_verification_last_sent_at" timestamp with time zone,
	"phone_verification_ticket_hash" text,
	"phone_verification_ticket_expires" timestamp with time zone,
	"password_reset_token" text,
	"password_reset_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"avatar" text DEFAULT 'cat' NOT NULL,
	"nickname" text,
	"total_listening_seconds" integer DEFAULT 0 NOT NULL,
	"bit_award" integer DEFAULT 0 NOT NULL,
	"bit_word" integer DEFAULT 0 NOT NULL,
	"bit_phrase" integer DEFAULT 0 NOT NULL,
	"streak_current" integer DEFAULT 0 NOT NULL,
	"streak_longest" integer DEFAULT 0 NOT NULL,
	"streak_last_submitted_date" date,
	"achievement_listening_time" text,
	"achievement_questions_answered" text,
	"achievement_study_streak" text,
	"achievement_stories_listened" text,
	"achievement_words_learned" text,
	"character_skin_tone" text DEFAULT '#f2c48d' NOT NULL,
	"character_owned_item_ids" text[] DEFAULT '{}' NOT NULL,
	"character_equipped_hairstyle" text,
	"character_equipped_outfit" text,
	"character_equipped_hat" text,
	"school_owned_room_ids" text[] DEFAULT '{}' NOT NULL,
	"school_stage" integer DEFAULT 0 NOT NULL,
	"school_layout_id" text NOT NULL,
	"school_wallpaper_id" text NOT NULL,
	"school_floor_id" text NOT NULL,
	"school_variant_id" text NOT NULL,
	"school_presets" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"school_payroll_last_paid_at" timestamp with time zone,
	"room" jsonb,
	"blocked_login_count" integer DEFAULT 0 NOT NULL,
	"last_blocked_at" timestamp with time zone,
	"recent_ip_prefixes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "users_bit_award_non_negative" CHECK ("users"."bit_award" >= 0),
	CONSTRAINT "users_bit_word_non_negative" CHECK ("users"."bit_word" >= 0),
	CONSTRAINT "users_bit_phrase_non_negative" CHECK ("users"."bit_phrase" >= 0),
	CONSTRAINT "users_school_stage_non_negative" CHECK ("users"."school_stage" >= 0),
	CONSTRAINT "users_ach_listening_time_tier" CHECK (achievement_listening_time IS NULL OR achievement_listening_time IN ('bronze', 'silver', 'gold', 'platinum', 'crown')),
	CONSTRAINT "users_ach_questions_answered_tier" CHECK (achievement_questions_answered IS NULL OR achievement_questions_answered IN ('bronze', 'silver', 'gold', 'platinum', 'crown')),
	CONSTRAINT "users_ach_study_streak_tier" CHECK (achievement_study_streak IS NULL OR achievement_study_streak IN ('bronze', 'silver', 'gold', 'platinum', 'crown')),
	CONSTRAINT "users_ach_stories_listened_tier" CHECK (achievement_stories_listened IS NULL OR achievement_stories_listened IN ('bronze', 'silver', 'gold', 'platinum', 'crown')),
	CONSTRAINT "users_ach_words_learned_tier" CHECK (achievement_words_learned IS NULL OR achievement_words_learned IN ('bronze', 'silver', 'gold', 'platinum', 'crown'))
);
--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_item" ADD CONSTRAINT "payment_item_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress" ADD CONSTRAINT "progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_level_result" ADD CONSTRAINT "progress_level_result_progress_id_progress_id_fk" FOREIGN KEY ("progress_id") REFERENCES "public"."progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_part" ADD CONSTRAINT "story_part_story_pk_story_id_fk" FOREIGN KEY ("story_pk") REFERENCES "public"."story"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_part_marker" ADD CONSTRAINT "story_part_marker_part_pk_story_part_id_fk" FOREIGN KEY ("part_pk") REFERENCES "public"."story_part"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_part_quiz" ADD CONSTRAINT "story_part_quiz_part_pk_story_part_id_fk" FOREIGN KEY ("part_pk") REFERENCES "public"."story_part"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_part_vocab" ADD CONSTRAINT "story_part_vocab_part_pk_story_part_id_fk" FOREIGN KEY ("part_pk") REFERENCES "public"."story_part"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_progress" ADD CONSTRAINT "story_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entitlement" ADD CONSTRAINT "user_entitlement_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_entitlement" ADD CONSTRAINT "user_entitlement_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learned_word" ADD CONSTRAINT "user_learned_word_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_actor_created_idx" ON "admin_audit_log" USING btree ("actor_name","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_audit_log_target_created_idx" ON "admin_audit_log" USING btree ("target_type","target_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "admin_audit_log_action_created_idx" ON "admin_audit_log" USING btree ("action","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "fake_payment_order_idx" ON "fake_payment" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "fake_payment_delivered_status_idx" ON "fake_payment" USING btree ("delivered","status");--> statement-breakpoint
CREATE INDEX "feedback_created_idx" ON "feedback" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "payment_provider_payment_id_key" ON "payment" USING btree ("provider_payment_id") WHERE "payment"."provider_payment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payment_status_created_idx" ON "payment" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "payment_user_created_idx" ON "payment" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "payment_item_payment_ordinal_key" ON "payment_item" USING btree ("payment_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_user_difficulty_key" ON "progress" USING btree ("user_id","difficulty");--> statement-breakpoint
CREATE UNIQUE INDEX "story_difficulty_story_id_key" ON "story" USING btree ("difficulty","story_id");--> statement-breakpoint
CREATE INDEX "story_published_idx" ON "story" USING btree ("published");--> statement-breakpoint
CREATE UNIQUE INDEX "story_part_story_number_key" ON "story_part" USING btree ("story_pk","part_number");--> statement-breakpoint
CREATE UNIQUE INDEX "story_part_marker_part_ordinal_key" ON "story_part_marker" USING btree ("part_pk","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "story_part_quiz_part_ordinal_key" ON "story_part_quiz" USING btree ("part_pk","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "story_part_vocab_part_kind_ordinal_key" ON "story_part_vocab" USING btree ("part_pk","kind","ordinal");--> statement-breakpoint
CREATE INDEX "story_part_vocab_audio_key_idx" ON "story_part_vocab" USING btree ("kind","audio_key");--> statement-breakpoint
CREATE UNIQUE INDEX "story_progress_user_difficulty_story_key" ON "story_progress" USING btree ("user_id","difficulty","story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_entitlement_user_sku_key" ON "user_entitlement" USING btree ("user_id","sku");--> statement-breakpoint
CREATE INDEX "user_entitlement_sku_idx" ON "user_entitlement" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "user_entitlement_payment_idx" ON "user_entitlement" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_session_jti_key" ON "user_session" USING btree ("jti");--> statement-breakpoint
CREATE UNIQUE INDEX "user_session_user_device_key" ON "user_session" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "user_session_user_last_seen_idx" ON "user_session" USING btree ("user_id","last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_key" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_key" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_number_key" ON "users" USING btree ("phone_number");