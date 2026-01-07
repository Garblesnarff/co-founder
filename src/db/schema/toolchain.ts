import { pgTable, serial, text, timestamp, index, jsonb } from 'drizzle-orm/pg-core';

/**
 * Toolchain: Storage for tools Rob uses (image gen, video gen, coding, etc.)
 * Helps AI instances know what tools are available and when to use them.
 */
export const toolchain = pgTable('toolchain', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // e.g., "ImageFX", "Grok Imagine", "Whisk"
  category: text('category').notNull(), // image-gen, video-gen, audio, coding, etc.
  purpose: text('purpose'), // What it does
  cost: text('cost'), // "free", "$8/mo", "$0.14/image", etc.
  whenToUse: text('when_to_use'), // Conditions/triggers for using this tool
  limitations: text('limitations'), // What it can't do or blocks
  url: text('url'), // Link to tool
  workflowNotes: text('workflow_notes'), // How it fits into larger pipelines
  project: text('project'), // Which project it's used for (optional)
  inputFormat: text('input_format'), // What it accepts (text prompt, image, URL, etc.)
  outputFormat: text('output_format'), // What it produces (PNG, MP4, text, etc.)
  qualityNotes: text('quality_notes'), // Quality observations ("best for X", "struggles with Y")
  exampleUsage: text('example_usage'), // Sample prompts/commands that work well
  fallbackTool: text('fallback_tool'), // If this fails, what's the backup?
  authMethod: text('auth_method'), // How to auth (API key, browser, OAuth)
  repoPath: text('repo_path'), // For codebases: directory path on server (e.g., "/var/www/co-founder")
  tags: jsonb('tags').$type<string[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: text('created_by'),
}, (table) => [
  index('idx_toolchain_category').on(table.category),
  index('idx_toolchain_name').on(table.name),
  index('idx_toolchain_project').on(table.project),
]);

export type Tool = typeof toolchain.$inferSelect;
export type NewTool = typeof toolchain.$inferInsert;
