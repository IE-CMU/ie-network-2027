CREATE TYPE "public"."type_change_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
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
	"requested_type" "participant_type" NOT NULL,
	"requester_comment" text,
	"status" "type_change_request_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewer_id" text,
	"reviewer_comment" text
);
--> statement-breakpoint
ALTER TABLE "type_change_evidence" ADD CONSTRAINT "type_change_evidence_request_id_type_change_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."type_change_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "type_change_request" ADD CONSTRAINT "type_change_request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "type_change_request" ADD CONSTRAINT "type_change_request_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "type_change_request_requester_id_idx" ON "type_change_request" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "type_change_request_status_idx" ON "type_change_request" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "type_change_request_one_pending_idx" ON "type_change_request" USING btree ("requester_id") WHERE "type_change_request"."status" = 'pending';