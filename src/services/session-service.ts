import { db } from '../db/client.js';
import { workSessions, type WorkSession } from '../db/schema/index.js';
import { eq, isNull, desc } from 'drizzle-orm';

export async function startSession(
  plannedDurationMinutes: number | null = null,
  energyLevel: string | null = null
): Promise<WorkSession> {
  // End any existing active session first
  const active = await getActiveSession();
  if (active) {
    await endSession(active.id, null, null);
  }

  const [created] = await db
    .insert(workSessions)
    .values({
      plannedDurationMinutes,
      energyLevel,
    })
    .returning();
  return created;
}

export async function endSession(
  sessionId: number,
  notes: string | null,
  learnings: string | null
): Promise<WorkSession | null> {
  const [updated] = await db
    .update(workSessions)
    .set({
      endedAt: new Date(),
      notes,
      learnings,
    })
    .where(eq(workSessions.id, sessionId))
    .returning();
  return updated || null;
}

export async function getActiveSession(): Promise<WorkSession | null> {
  const [session] = await db
    .select()
    .from(workSessions)
    .where(isNull(workSessions.endedAt))
    .orderBy(desc(workSessions.startedAt))
    .limit(1);
  return session || null;
}

export async function incrementSessionTasks(sessionId: number): Promise<void> {
  // Get current value and increment
  const [session] = await db
    .select()
    .from(workSessions)
    .where(eq(workSessions.id, sessionId))
    .limit(1);

  if (session) {
    await db
      .update(workSessions)
      .set({ tasksCompleted: (session.tasksCompleted || 0) + 1 })
      .where(eq(workSessions.id, sessionId));
  }
}

export async function getRecentSessions(limit: number = 10): Promise<WorkSession[]> {
  return db
    .select()
    .from(workSessions)
    .orderBy(desc(workSessions.startedAt))
    .limit(limit);
}
