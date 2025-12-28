ALTER TABLE "founder_state" ADD COLUMN "current_revenue" text;--> statement-breakpoint
ALTER TABLE "founder_state" ADD COLUMN "subscribers" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "founder_state" ADD COLUMN "last_progress_update" timestamp with time zone;