CREATE TABLE IF NOT EXISTS "mcp_issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"reported_by" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "action_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"assignee" text,
	"due_date" timestamp with time zone,
	"status" text DEFAULT 'open' NOT NULL,
	"channel_slack_id" text,
	"message_slack_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slack_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"slack_id" text NOT NULL,
	"name" text NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slack_channels_slack_id_unique" UNIQUE("slack_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "slack_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slack_id" text NOT NULL,
	"channel_slack_id" text NOT NULL,
	"user_id" text,
	"text" text,
	"thread_ts" text,
	"has_attachments" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slack_messages_slack_id_unique" UNIQUE("slack_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dispatch_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"slack_message_ts" text,
	"slack_channel_id" text,
	"slack_thread_ts" text,
	"agent" text NOT NULL,
	"target" text DEFAULT 'hetzner' NOT NULL,
	"repo_path" text,
	"task" text NOT NULL,
	"track_as_task" boolean DEFAULT false,
	"cofounder_task_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" text,
	"error_message" text,
	"dispatched_by" text,
	"parent_dispatch_id" integer,
	"depth" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mcp_issues_status" ON "mcp_issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mcp_issues_type" ON "mcp_issues" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mcp_issues_priority" ON "mcp_issues" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_action_items_status" ON "action_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_slack_channels_slack_id" ON "slack_channels" USING btree ("slack_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_slack_messages_channel" ON "slack_messages" USING btree ("channel_slack_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_slack_messages_thread" ON "slack_messages" USING btree ("thread_ts");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dispatch_jobs_status" ON "dispatch_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dispatch_jobs_target" ON "dispatch_jobs" USING btree ("target");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dispatch_jobs_slack_thread" ON "dispatch_jobs" USING btree ("slack_thread_ts");