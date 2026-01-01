CREATE TABLE IF NOT EXISTS "learnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"category" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "task_queue" ADD COLUMN "due_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_queue" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learnings_category" ON "learnings" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learnings_created_at" ON "learnings" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_queue_due_date" ON "task_queue" USING btree ("due_date");