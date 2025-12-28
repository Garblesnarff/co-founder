CREATE TABLE IF NOT EXISTS "task_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"task_completed" boolean DEFAULT false NOT NULL,
	"note" text NOT NULL,
	"note_type" text DEFAULT 'progress' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"planned_duration_minutes" integer,
	"tasks_completed" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"learnings" text,
	"energy_level" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_context" (
	"id" serial PRIMARY KEY NOT NULL,
	"project" text NOT NULL,
	"overview" text,
	"current_state" text,
	"key_files" text,
	"tech_stack" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_context_project_unique" UNIQUE("project")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"decision" text NOT NULL,
	"rationale" text NOT NULL,
	"alternatives" text,
	"project" text,
	"impact" text,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_by" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_notes_task" ON "task_notes" USING btree ("task_id","task_completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_work_sessions_ended" ON "work_sessions" USING btree ("ended_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_decisions_project" ON "decisions" USING btree ("project");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_decisions_date" ON "decisions" USING btree ("decided_at");