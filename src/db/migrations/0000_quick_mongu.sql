CREATE TABLE IF NOT EXISTS "founder_state" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"goal" text NOT NULL,
	"goal_metric" text NOT NULL,
	"current_task" text,
	"current_task_assigned_at" timestamp with time zone,
	"current_task_context" text,
	"current_task_id" integer,
	"streak_days" integer DEFAULT 0 NOT NULL,
	"last_checkin" timestamp with time zone,
	"last_completion" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"task" text NOT NULL,
	"context" text,
	"priority" integer DEFAULT 0 NOT NULL,
	"estimated_minutes" integer,
	"project" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "completed_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task" text NOT NULL,
	"context" text,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"time_taken_minutes" integer,
	"notes" text,
	"project" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blockers" (
	"id" serial PRIMARY KEY NOT NULL,
	"blocker" text NOT NULL,
	"context" text,
	"identified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"tasks_completed" integer DEFAULT 0 NOT NULL,
	"tasks_assigned" integer DEFAULT 0 NOT NULL,
	"checkins" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"mood" text,
	CONSTRAINT "daily_log_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"user_id" text,
	"roles" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"disabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_queue_priority" ON "task_queue" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_completed_tasks_date" ON "completed_tasks" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_blockers_resolved" ON "blockers" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_daily_log_date" ON "daily_log" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_keys_hash" ON "api_keys" USING btree ("key_hash");