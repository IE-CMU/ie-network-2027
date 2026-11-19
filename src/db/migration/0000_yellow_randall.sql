CREATE TYPE "public"."participant_type" AS ENUM('participant', 'participant_student', 'participant_student_ie', 'author', 'author_student', 'author_student_ie');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('student', 'ie_student');--> statement-breakpoint
CREATE TYPE "public"."type_change_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "paper" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"abstract" text,
	"primary_subject_area" text,
	"secondary_subject_areas" text,
	"track_name" text,
	"status" text NOT NULL,
	"cmt_created_at" timestamp with time zone,
	"cmt_modified_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"imported_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paper_user" (
	"paper_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"is_primary_contact" boolean DEFAULT false NOT NULL,
	"author_order" integer NOT NULL,
	CONSTRAINT "paper_user_paper_id_user_id_pk" PRIMARY KEY("paper_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "type_change_evidence" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "type_change_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" text NOT NULL,
	"requested_type" "student_status" NOT NULL,
	"requester_comment" text,
	"status" "type_change_request_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewer_id" text,
	"reviewer_comment" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"affiliation" text,
	"participant_type" "participant_type" DEFAULT 'participant' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_address" ADD CONSTRAINT "billing_address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_user" ADD CONSTRAINT "paper_user_paper_id_paper_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."paper"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_user" ADD CONSTRAINT "paper_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "type_change_evidence" ADD CONSTRAINT "type_change_evidence_request_id_type_change_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."type_change_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "type_change_request" ADD CONSTRAINT "type_change_request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "type_change_request" ADD CONSTRAINT "type_change_request_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "billing_address_user_id_idx" ON "billing_address" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "facebook_post_created_time_idx" ON "facebook_post" USING btree ("created_time");--> statement-breakpoint
CREATE INDEX "paper_is_active_idx" ON "paper" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "paper_user_user_id_idx" ON "paper_user" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "type_change_request_requester_id_idx" ON "type_change_request" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "type_change_request_status_idx" ON "type_change_request" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "type_change_request_one_pending_idx" ON "type_change_request" USING btree ("requester_id") WHERE "type_change_request"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");