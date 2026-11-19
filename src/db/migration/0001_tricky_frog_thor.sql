CREATE TABLE "registration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"billing_address_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration" ADD CONSTRAINT "registration_billing_address_id_billing_address_id_fk" FOREIGN KEY ("billing_address_id") REFERENCES "public"."billing_address"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "registration_user_id_idx" ON "registration" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "registration_billing_address_id_idx" ON "registration" USING btree ("billing_address_id");