import { db } from '../db/client.js';
import { blockers, type Blocker } from '../db/schema/index.js';
import { eq, isNull, isNotNull, desc, sql } from 'drizzle-orm';

export async function logBlocker(
  blocker: string,
  context: string | null
): Promise<Blocker> {
  const [created] = await db
    .insert(blockers)
    .values({
      blocker,
      context,
    })
    .returning();
  return created;
}

export async function resolveBlocker(
  id: number,
  resolution: string
): Promise<Blocker | null> {
  const [updated] = await db
    .update(blockers)
    .set({
      resolvedAt: new Date(),
      resolution,
    })
    .where(eq(blockers.id, id))
    .returning();
  return updated || null;
}

export async function getActiveBlockers(): Promise<Blocker[]> {
  return db
    .select()
    .from(blockers)
    .where(isNull(blockers.resolvedAt))
    .orderBy(desc(blockers.identifiedAt));
}

export async function getResolvedBlockers(): Promise<Blocker[]> {
  return db
    .select()
    .from(blockers)
    .where(isNotNull(blockers.resolvedAt))
    .orderBy(desc(blockers.resolvedAt));
}

export async function getBlockerStats(): Promise<{
  active: number;
  resolved: number;
}> {
  const [activeResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blockers)
    .where(isNull(blockers.resolvedAt));

  const [resolvedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blockers)
    .where(isNotNull(blockers.resolvedAt));

  return {
    active: activeResult?.count || 0,
    resolved: resolvedResult?.count || 0,
  };
}
