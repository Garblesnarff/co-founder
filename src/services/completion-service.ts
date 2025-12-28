import { db } from '../db/client.js';
import { completedTasks, type CompletedTask, type NewCompletedTask } from '../db/schema/index.js';
import { desc, gte, sql } from 'drizzle-orm';

export async function completeTask(
  task: string,
  context: string | null,
  timeTakenMinutes: number | null,
  notes: string | null,
  project: string | null
): Promise<CompletedTask> {
  const [created] = await db
    .insert(completedTasks)
    .values({
      task,
      context,
      timeTakenMinutes,
      notes,
      project,
    })
    .returning();
  return created;
}

export async function getCompletedTasks(since?: Date): Promise<CompletedTask[]> {
  if (since) {
    return db
      .select()
      .from(completedTasks)
      .where(gte(completedTasks.completedAt, since))
      .orderBy(desc(completedTasks.completedAt));
  }
  return db
    .select()
    .from(completedTasks)
    .orderBy(desc(completedTasks.completedAt));
}

export async function getStats(): Promise<{
  totalCompleted: number;
  completedThisWeek: number;
  completedToday: number;
}> {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(completedTasks);

  const [weekResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(completedTasks)
    .where(gte(completedTasks.completedAt, startOfWeek));

  const [dayResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(completedTasks)
    .where(gte(completedTasks.completedAt, startOfDay));

  return {
    totalCompleted: totalResult?.count || 0,
    completedThisWeek: weekResult?.count || 0,
    completedToday: dayResult?.count || 0,
  };
}
