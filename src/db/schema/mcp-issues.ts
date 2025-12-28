import { pgTable, serial, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const mcpIssues = pgTable('mcp_issues', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // 'bug' | 'feature'
  title: text('title').notNull(),
  description: text('description').notNull(),
  reportedBy: text('reported_by').notNull(), // 'claude-opus', 'claude-sonnet', 'rob', etc.
  status: text('status').default('open').notNull(), // 'open' | 'in_progress' | 'resolved' | 'wontfix'
  priority: integer('priority').default(5).notNull(), // 1-10
  resolution: text('resolution'), // how it was resolved (nullable)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_mcp_issues_status').on(table.status),
  index('idx_mcp_issues_type').on(table.type),
  index('idx_mcp_issues_priority').on(table.priority),
]);

export type McpIssue = typeof mcpIssues.$inferSelect;
export type NewMcpIssue = typeof mcpIssues.$inferInsert;
