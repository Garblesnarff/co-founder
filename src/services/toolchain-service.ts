import { db } from '../db/client.js';
import { toolchain, type Tool, type NewTool } from '../db/schema/index.js';
import { eq, desc, or, sql, and } from 'drizzle-orm';

/**
 * Add a new tool to the toolchain
 */
export async function addTool(tool: {
  name: string;
  category: string;
  purpose?: string | null;
  cost?: string | null;
  whenToUse?: string | null;
  limitations?: string | null;
  url?: string | null;
  workflowNotes?: string | null;
  project?: string | null;
  inputFormat?: string | null;
  outputFormat?: string | null;
  qualityNotes?: string | null;
  exampleUsage?: string | null;
  fallbackTool?: string | null;
  authMethod?: string | null;
  repoPath?: string | null;
  tags?: string[];
  createdBy?: string | null;
}): Promise<Tool> {
  const [created] = await db
    .insert(toolchain)
    .values({
      name: tool.name,
      category: tool.category,
      purpose: tool.purpose || null,
      cost: tool.cost || null,
      whenToUse: tool.whenToUse || null,
      limitations: tool.limitations || null,
      url: tool.url || null,
      workflowNotes: tool.workflowNotes || null,
      project: tool.project || null,
      inputFormat: tool.inputFormat || null,
      outputFormat: tool.outputFormat || null,
      qualityNotes: tool.qualityNotes || null,
      exampleUsage: tool.exampleUsage || null,
      fallbackTool: tool.fallbackTool || null,
      authMethod: tool.authMethod || null,
      repoPath: tool.repoPath || null,
      tags: tool.tags || [],
      createdBy: tool.createdBy || null,
    })
    .returning();
  return created;
}

/**
 * Get a tool by ID
 */
export async function getToolById(id: number): Promise<Tool | null> {
  const [tool] = await db
    .select()
    .from(toolchain)
    .where(eq(toolchain.id, id))
    .limit(1);
  return tool || null;
}

/**
 * Get a tool by name (case-insensitive)
 */
export async function getToolByName(name: string): Promise<Tool | null> {
  const [tool] = await db
    .select()
    .from(toolchain)
    .where(sql`LOWER(${toolchain.name}) = ${name.toLowerCase()}`)
    .limit(1);
  return tool || null;
}

/**
 * List tools with optional filters
 */
export async function listTools(options: {
  category?: string | null;
  project?: string | null;
  limit?: number;
} = {}): Promise<Tool[]> {
  const { category, project, limit = 50 } = options;

  const conditions = [];
  if (category) {
    conditions.push(eq(toolchain.category, category));
  }
  if (project) {
    conditions.push(eq(toolchain.project, project));
  }

  if (conditions.length > 0) {
    return db
      .select()
      .from(toolchain)
      .where(and(...conditions))
      .orderBy(toolchain.category, toolchain.name)
      .limit(limit);
  }

  return db
    .select()
    .from(toolchain)
    .orderBy(toolchain.category, toolchain.name)
    .limit(limit);
}

/**
 * Search tools by keyword
 */
export async function searchTools(query: string, limit: number = 20): Promise<Tool[]> {
  const searchPattern = `%${query.toLowerCase()}%`;
  return db
    .select()
    .from(toolchain)
    .where(
      or(
        sql`LOWER(${toolchain.name}) LIKE ${searchPattern}`,
        sql`LOWER(${toolchain.purpose}) LIKE ${searchPattern}`,
        sql`LOWER(${toolchain.category}) LIKE ${searchPattern}`,
        sql`LOWER(${toolchain.whenToUse}) LIKE ${searchPattern}`
      )
    )
    .orderBy(toolchain.category, toolchain.name)
    .limit(limit);
}

/**
 * Get tools by tag
 */
export async function getToolsByTag(tag: string): Promise<Tool[]> {
  return db
    .select()
    .from(toolchain)
    .where(sql`${toolchain.tags} @> ${JSON.stringify([tag])}::jsonb`)
    .orderBy(toolchain.category, toolchain.name);
}

/**
 * Update an existing tool
 */
export async function updateTool(
  id: number,
  updates: Partial<Omit<NewTool, 'id' | 'createdAt'>>
): Promise<Tool | null> {
  const [updated] = await db
    .update(toolchain)
    .set(updates)
    .where(eq(toolchain.id, id))
    .returning();
  return updated || null;
}

/**
 * Delete a tool
 */
export async function deleteTool(id: number): Promise<boolean> {
  const result = await db
    .delete(toolchain)
    .where(eq(toolchain.id, id))
    .returning();
  return result.length > 0;
}

/**
 * Get all unique categories
 */
export async function getCategories(): Promise<string[]> {
  const results = await db
    .selectDistinct({ category: toolchain.category })
    .from(toolchain)
    .orderBy(toolchain.category);
  return results.map(r => r.category);
}
