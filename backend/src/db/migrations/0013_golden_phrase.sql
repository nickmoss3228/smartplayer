CREATE TABLE "user_golden_phrase" (
	"user_id" uuid NOT NULL,
	"difficulty" text NOT NULL,
	"story_id" text NOT NULL,
	"part_number" integer NOT NULL,
	"segment_index" integer NOT NULL,
	"found_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_golden_phrase_pkey" PRIMARY KEY("user_id","difficulty","story_id","part_number","segment_index")
);
--> statement-breakpoint
ALTER TABLE "user_golden_phrase" ADD CONSTRAINT "user_golden_phrase_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_golden_phrase_user_found_idx" ON "user_golden_phrase" USING btree ("user_id","found_at");