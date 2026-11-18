CREATE TYPE "public"."participant_type" AS ENUM('general', 'student', 'ie_student');--> statement-breakpoint
CREATE TABLE "billing_address" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"affiliation" text,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"tax_id" text,
	"branch" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "participant_type" "participant_type" DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_address" ADD CONSTRAINT "billing_address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_address_user_id_idx" ON "billing_address" USING btree ("user_id");