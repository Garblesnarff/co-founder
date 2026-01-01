import { db } from '../db/client.js';
import { learnings, type Learning, type NewLearning } from '../db/schema/index.js';
import { eq, desc, like, or, sql } from 'drizzle-orm';

export async function logLearning(
  content: string,
  category: string | null = null,
  tags: string[] = [],
  source: string | null = null,
  createdBy: string | null = null
): Promise<Learning> {
  const [created] = await db
    .insert(learnings)
    .values({
      content,
      category,
      tags,
      source,
      createdBy,
    })
    .returning();
  return created;
}

export async function getLearnings(
  category: string | null = null,
  limit: number = 20
): Promise<Learning[]> {
  if (category) {
    return db
      .select()
      .from(learnings)
      .where(eq(learnings.category, category))
      .orderBy(desc(learnings.createdAt))
      .limit(limit);
  }
  return db
    .select()
    .from(learnings)
    .orderBy(desc(learnings.createdAt))
    .limit(limit);
}

export async function searchLearnings(query: string, limit: number = 20): Promise<Learning[]> {
  const searchPattern = `%${query.toLowerCase()}%`;
  return db
    .select()
    .from(learnings)
    .where(
      or(
        sql`LOWER(${learnings.content}) LIKE ${searchPattern}`,
        sql`LOWER(${learnings.category}) LIKE ${searchPattern}`
      )
    )
    .orderBy(desc(learnings.createdAt))
    .limit(limit);
}

export async function getLearningsByTag(tag: string): Promise<Learning[]> {
  return db
    .select()
    .from(learnings)
    .where(sql`${learnings.tags} @> ${JSON.stringify([tag])}::jsonb`)
    .orderBy(desc(learnings.createdAt));
}

export async function getLearningById(id: number): Promise<Learning | null> {
  const [learning] = await db
    .select()
    .from(learnings)
    .where(eq(learnings.id, id))
    .limit(1);
  return learning || null;
}
