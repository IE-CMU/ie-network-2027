CREATE TABLE "facebook_post" (
	"id" text PRIMARY KEY NOT NULL,
	"created_time" timestamp with time zone NOT NULL,
	"message" text,
	"permalink_url" text NOT NULL,
	"image_key" text,
	"image" "bytea",
	"image_mime" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "facebook_post_created_time_idx" ON "facebook_post" USING btree ("created_time");