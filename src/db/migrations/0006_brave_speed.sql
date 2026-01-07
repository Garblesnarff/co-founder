CREATE TABLE IF NOT EXISTS "toolchain" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"purpose" text,
	"cost" text,
	"when_to_use" text,
	"limitations" text,
	"url" text,
	"workflow_notes" text,
	"project" text,
	"input_format" text,
	"output_format" text,
	"quality_notes" text,
	"example_usage" text,
	"fallback_tool" text,
	"auth_method" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_toolchain_category" ON "toolchain" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_toolchain_name" ON "toolchain" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_toolchain_project" ON "toolchain" USING btree ("project");