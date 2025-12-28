import { db } from '../db/client.js';
import { founderState, type FounderState } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export async function getState(): Promise<FounderState | null> {
  const [state] = await db.select().from(founderState).where(eq(founderState.id, 1)).limit(1);
  return state || null;
}

export async function updateState(partial: Partial<FounderState>): Promise<FounderState> {
  const [updated] = await db
    .update(founderState)
    .set(partial)
    .where(eq(founderState.id, 1))
    .returning();
  return updated;
}

export async function assignTask(task: string, context: string | null, taskId: number | null): Promise<FounderState> {
  return updateState({
    currentTask: task,
    currentTaskContext: context,
    currentTaskId: taskId,
    currentTaskAssignedAt: new Date(),
  });
}

export async function clearCurrentTask(): Promise<FounderState> {
  return updateState({
    currentTask: null,
    currentTaskContext: null,
    currentTaskId: null,
    currentTaskAssignedAt: null,
  });
}

export async function incrementStreak(): Promise<FounderState> {
  const state = await getState();
  return updateState({
    streakDays: (state?.streakDays || 0) + 1,
    lastCompletion: new Date(),
  });
}

export async function resetStreak(): Promise<FounderState> {
  return updateState({ streakDays: 0 });
}

export async function recordCheckin(): Promise<FounderState> {
  return updateState({ lastCheckin: new Date() });
}

export async function updateProgress(
  currentRevenue: string,
  subscribers: number,
): Promise<FounderState> {
  return updateState({
    currentRevenue,
    subscribers,
    lastProgressUpdate: new Date(),
  });
}
