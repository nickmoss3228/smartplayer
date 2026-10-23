CREATE TABLE "user_vocab_bookmark" (
	"user_id" uuid NOT NULL,
	"word" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_vocab_bookmark_user_id_word_pk" PRIMARY KEY("user_id","word")
);
--> statement-breakpoint
ALTER TABLE "story_part" ADD COLUMN "transcript" text;--> statement-breakpoint
ALTER TABLE "story_part_vocab" ADD COLUMN "anchor" text;--> statement-breakpoint
ALTER TABLE "user_vocab_bookmark" ADD CONSTRAINT "user_vocab_bookmark_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;