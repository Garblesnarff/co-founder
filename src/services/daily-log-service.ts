import { db } from '../db/client.js';
import { dailyLog, type DailyLogEntry } from '../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getOrCreateToday(): Promise<DailyLogEntry> {
  const today = getTodayDate();

  const [existing] = await db
    .select()
    .from(dailyLog)
    .where(eq(dailyLog.date, today))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(dailyLog)
    .values({ date: today })
    .returning();

  return created;
}

export async function incrementCheckins(): Promise<DailyLogEntry> {
  const entry = await getOrCreateToday();
  const [updated] = await db
    .update(dailyLog)
    .set({ checkins: entry.checkins + 1 })
    .where(eq(dailyLog.id, entry.id))
    .returning();
  return updated;
}

export async function incrementTasksCompleted(): Promise<DailyLogEntry> {
  const entry = await getOrCreateToday();
  const [updated] = await db
    .update(dailyLog)
    .set({ tasksCompleted: entry.tasksCompleted + 1 })
    .where(eq(dailyLog.id, entry.id))
    .returning();
  return updated;
}

export async function incrementTasksAssigned(): Promise<DailyLogEntry> {
  const entry = await getOrCreateToday();
  const [updated] = await db
    .update(dailyLog)
    .set({ tasksAssigned: entry.tasksAssigned + 1 })
    .where(eq(dailyLog.id, entry.id))
    .returning();
  return updated;
}

export async function logMood(mood: string, notes: string | null): Promise<DailyLogEntry> {
  const entry = await getOrCreateToday();
  const [updated] = await db
    .update(dailyLog)
    .set({ mood, notes: notes || entry.notes })
    .where(eq(dailyLog.id, entry.id))
    .returning();
  return updated;
}

export async function getRecentLogs(days: number = 7): Promise<DailyLogEntry[]> {
  return db
    .select()
    .from(dailyLog)
    .orderBy(sql`${dailyLog.date} DESC`)
    .limit(days);
}
