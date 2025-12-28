import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const projectContext = pgTable('project_context', {
  id: serial('id').primaryKey(),
  project: text('project').notNull().unique(), // infinite_realms, infrastructure, sanctuary, other
  overview: text('overview'), // What is this project
  currentState: text('current_state'), // Where are we now
  keyFiles: text('key_files'), // Important file paths
  techStack: text('tech_stack'), // Technologies used
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type ProjectContext = typeof projectContext.$inferSelect;
export type NewProjectContext = typeof projectContext.$inferInsert;
