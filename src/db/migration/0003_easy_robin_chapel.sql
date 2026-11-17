CREATE TABLE "paper" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"abstract" text,
	"primary_subject_area" text,
	"secondary_subject_areas" text,
	"track_name" text,
	"status" text NOT NULL,
	"authors_display" text,
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
	"email" text NOT NULL,
	"is_primary_contact" boolean DEFAULT false NOT NULL,
	"author_order" integer NOT NULL,
	"author_name" text NOT NULL,
	"affiliation" text,
	CONSTRAINT "paper_user_paper_id_email_pk" PRIMARY KEY("paper_id","email")
);
--> statement-breakpoint
ALTER TABLE "paper_user" ADD CONSTRAINT "paper_user_paper_id_paper_id_fk" FOREIGN KEY ("paper_id") REFERENCES "public"."paper"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "paper_user" ADD CONSTRAINT "paper_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "paper_is_active_idx" ON "paper" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "paper_user_user_id_idx" ON "paper_user" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "paper_user_email_idx" ON "paper_user" USING btree ("email");