import { db } from '../db/client.js';
import { decisions, type Decision } from '../db/schema/index.js';
import { eq, desc } from 'drizzle-orm';

export async function logDecision(
  decision: string,
  rationale: string,
  alternatives: string | null = null,
  project: string | null = null,
  impact: string | null = null,
  decidedBy: string | null = null
): Promise<Decision> {
  const [created] = await db
    .insert(decisions)
    .values({
      decision,
      rationale,
      alternatives,
      project,
      impact,
      decidedBy,
    })
    .returning();
  return created;
}

export async function getDecisions(
  project: string | null = null,
  limit: number = 20
): Promise<Decision[]> {
  if (project) {
    return db
      .select()
      .from(decisions)
      .where(eq(decisions.project, project))
      .orderBy(desc(decisions.decidedAt))
      .limit(limit);
  }
  return db
    .select()
    .from(decisions)
    .orderBy(desc(decisions.decidedAt))
    .limit(limit);
}

export async function getDecisionById(id: number): Promise<Decision | null> {
  const [decision] = await db
    .select()
    .from(decisions)
    .where(eq(decisions.id, id))
    .limit(1);
  return decision || null;
}
