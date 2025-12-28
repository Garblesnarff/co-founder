import { pgTable, serial, text, integer, date, index } from 'drizzle-orm/pg-core';

export const dailyLog = pgTable('daily_log', {
  id: serial('id').primaryKey(),
  date: date('date').unique().notNull(),
  tasksCompleted: integer('tasks_completed').default(0).notNull(),
  tasksAssigned: integer('tasks_assigned').default(0).notNull(),
  checkins: integer('checkins').default(0).notNull(),
  notes: text('notes'),
  mood: text('mood'),
}, (table) => [
  index('idx_daily_log_date').on(table.date),
]);

export type DailyLogEntry = typeof dailyLog.$inferSelect;
export type NewDailyLogEntry = typeof dailyLog.$inferInsert;
