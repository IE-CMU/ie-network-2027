CREATE TABLE "pending_signup" (
	"email" text PRIMARY KEY NOT NULL,
	"affiliation" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
