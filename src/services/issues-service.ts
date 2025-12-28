import { db } from '../db/client.js';
import { mcpIssues, type McpIssue } from '../db/schema/index.js';
import { eq, desc, and, sql } from 'drizzle-orm';

export async function reportIssue(
  type: string,
  title: string,
  description: string,
  reportedBy: string,
  priority: number = 5
): Promise<McpIssue> {
  const [created] = await db
    .insert(mcpIssues)
    .values({
      type,
      title,
      description,
      reportedBy,
      priority,
    })
    .returning();
  return created;
}

export async function getIssues(
  status?: string,
  type?: string,
  limit: number = 10
): Promise<McpIssue[]> {
  let query = db.select().from(mcpIssues);

  const conditions = [];
  if (status) {
    conditions.push(eq(mcpIssues.status, status));
  }
  if (type) {
    conditions.push(eq(mcpIssues.type, type));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query
    .orderBy(desc(mcpIssues.priority), desc(mcpIssues.createdAt))
    .limit(limit);
}

export async function getIssueById(id: number): Promise<McpIssue | null> {
  const [issue] = await db
    .select()
    .from(mcpIssues)
    .where(eq(mcpIssues.id, id))
    .limit(1);
  return issue || null;
}

export async function updateIssue(
  id: number,
  updates: {
    status?: string;
    resolution?: string | null;
    priority?: number;
  }
): Promise<McpIssue | null> {
  const [updated] = await db
    .update(mcpIssues)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(mcpIssues.id, id))
    .returning();
  return updated || null;
}

export async function getIssueStats(): Promise<{
  open: number;
  inProgress: number;
  resolved: number;
  bugs: number;
  features: number;
}> {
  const [openResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mcpIssues)
    .where(eq(mcpIssues.status, 'open'));

  const [inProgressResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mcpIssues)
    .where(eq(mcpIssues.status, 'in_progress'));

  const [resolvedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mcpIssues)
    .where(eq(mcpIssues.status, 'resolved'));

  const [bugsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mcpIssues)
    .where(eq(mcpIssues.type, 'bug'));

  const [featuresResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mcpIssues)
    .where(eq(mcpIssues.type, 'feature'));

  return {
    open: openResult?.count || 0,
    inProgress: inProgressResult?.count || 0,
    resolved: resolvedResult?.count || 0,
    bugs: bugsResult?.count || 0,
    features: featuresResult?.count || 0,
  };
}
