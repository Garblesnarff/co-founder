import { db } from '../db/client.js';
import { taskNotes, type TaskNote } from '../db/schema/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function addTaskNote(
  taskId: number,
  note: string,
  noteType: string = 'progress',
  taskCompleted: boolean = false,
  createdBy: string | null = null
): Promise<TaskNote> {
  const [created] = await db
    .insert(taskNotes)
    .values({
      taskId,
      note,
      noteType,
      taskCompleted,
      createdBy,
    })
    .returning();
  return created;
}

export async function getTaskNotes(
  taskId: number,
  taskCompleted: boolean = false
): Promise<TaskNote[]> {
  return db
    .select()
    .from(taskNotes)
    .where(
      and(
        eq(taskNotes.taskId, taskId),
        eq(taskNotes.taskCompleted, taskCompleted)
      )
    )
    .orderBy(taskNotes.createdAt);
}

export async function getTaskNoteCount(
  taskId: number,
  taskCompleted: boolean = false
): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(taskNotes)
    .where(
      and(
        eq(taskNotes.taskId, taskId),
        eq(taskNotes.taskCompleted, taskCompleted)
      )
    );
  return result?.count || 0;
}

export async function getRecentNotes(limit: number = 10): Promise<TaskNote[]> {
  return db
    .select()
    .from(taskNotes)
    .orderBy(desc(taskNotes.createdAt))
    .limit(limit);
}
