import { db } from '../db/client.js';
import { projectContext, type ProjectContext } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export async function getProjectContext(project: string): Promise<ProjectContext | null> {
  const [context] = await db
    .select()
    .from(projectContext)
    .where(eq(projectContext.project, project))
    .limit(1);
  return context || null;
}

export async function updateProjectContext(
  project: string,
  updates: {
    overview?: string | null;
    currentState?: string | null;
    keyFiles?: string | null;
    techStack?: string | null;
    moonshot?: string | null;
  }
): Promise<ProjectContext> {
  const existing = await getProjectContext(project);

  if (existing) {
    const [updated] = await db
      .update(projectContext)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(projectContext.project, project))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(projectContext)
      .values({
        project,
        ...updates,
      })
      .returning();
    return created;
  }
}

export async function getAllProjectContexts(): Promise<ProjectContext[]> {
  return db.select().from(projectContext);
}
