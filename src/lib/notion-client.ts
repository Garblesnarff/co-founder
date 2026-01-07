import { Client } from '@notionhq/client';
import { env } from '../config/env.js';

let notionClient: Client | null = null;

/**
 * Get the Notion client instance (singleton).
 * Returns null if Notion is not configured.
 */
export function getNotionClient(): Client | null {
  if (!env.NOTION_API_KEY) {
    return null;
  }

  if (!notionClient) {
    notionClient = new Client({
      auth: env.NOTION_API_KEY,
    });
  }

  return notionClient;
}

/**
 * Check if Notion sync is enabled.
 */
export function isNotionEnabled(): boolean {
  return Boolean(env.NOTION_API_KEY && env.NOTION_DATABASE_ID);
}

/**
 * Get the configured Notion database ID.
 */
export function getNotionDatabaseId(): string | undefined {
  return env.NOTION_DATABASE_ID;
}

// Type for Notion page properties we'll set
export interface NotionTaskProperties {
  title: string;
  priority: number;
  project: string | null;
  tags: string[];
  context: string | null;
  dueDate: Date | null;
  estimatedMinutes: number | null;
}

/**
 * Map priority number to Notion select option name.
 * Notion has: 0-Low, 1, 2, 3, 4, 5-Normal, 6, 7, 8, 9, 10-Critical
 */
export function mapPriorityToNotionSelect(priority: number): string {
  const clamped = Math.max(0, Math.min(10, priority));
  if (clamped === 0) return '0-Low';
  if (clamped === 5) return '5-Normal';
  if (clamped === 10) return '10-Critical';
  return String(clamped);
}

/**
 * Build Notion page properties object from task data.
 */
export function buildNotionProperties(task: NotionTaskProperties) {
  const properties: Record<string, any> = {
    // Title property (required)
    Task: {
      title: [{ text: { content: task.title } }],
    },
    // Priority as select
    Priority: {
      select: { name: mapPriorityToNotionSelect(task.priority) },
    },
  };

  // Project (select) - only if set
  if (task.project) {
    properties.Project = {
      select: { name: task.project },
    };
  }

  // Tags (multi_select) - only if non-empty
  if (task.tags && task.tags.length > 0) {
    properties.Tags = {
      multi_select: task.tags.map(tag => ({ name: tag })),
    };
  }

  // Context (rich_text) - only if set
  if (task.context) {
    properties.Context = {
      rich_text: [{ text: { content: task.context } }],
    };
  }

  // Due Date - only if set
  if (task.dueDate) {
    properties['Due Date'] = {
      date: { start: task.dueDate.toISOString().split('T')[0] },
    };
  }

  // Est. Minutes (number) - only if set
  if (task.estimatedMinutes !== null && task.estimatedMinutes !== undefined) {
    properties['Est. Minutes'] = {
      number: task.estimatedMinutes,
    };
  }

  return properties;
}

/**
 * Create a new page in the Notion database.
 * Returns the page ID or null on failure.
 */
export async function createNotionPage(task: NotionTaskProperties): Promise<string | null> {
  const client = getNotionClient();
  const databaseId = getNotionDatabaseId();

  if (!client || !databaseId) {
    return null;
  }

  try {
    const response = await client.pages.create({
      parent: { database_id: databaseId },
      properties: buildNotionProperties(task),
    });
    return response.id;
  } catch (error) {
    console.error('[Notion] Failed to create page:', error);
    return null;
  }
}

/**
 * Update an existing Notion page.
 * Returns true on success, false on failure.
 */
export async function updateNotionPage(pageId: string, task: NotionTaskProperties): Promise<boolean> {
  const client = getNotionClient();

  if (!client) {
    return false;
  }

  try {
    await client.pages.update({
      page_id: pageId,
      properties: buildNotionProperties(task),
    });
    return true;
  } catch (error) {
    console.error('[Notion] Failed to update page:', error);
    return false;
  }
}

/**
 * Archive (soft delete) a Notion page.
 * Returns true on success, false on failure.
 */
export async function archiveNotionPage(pageId: string): Promise<boolean> {
  const client = getNotionClient();

  if (!client) {
    return false;
  }

  try {
    await client.pages.update({
      page_id: pageId,
      archived: true,
    });
    return true;
  } catch (error) {
    console.error('[Notion] Failed to archive page:', error);
    return false;
  }
}

/**
 * Set the Status property on a Notion page (e.g., "Done").
 * Returns true on success, false on failure.
 */
export async function setNotionPageStatus(pageId: string, status: string): Promise<boolean> {
  const client = getNotionClient();

  if (!client) {
    return false;
  }

  try {
    await client.pages.update({
      page_id: pageId,
      properties: {
        Status: {
          status: { name: status },
        },
      },
    });
    return true;
  } catch (error) {
    console.error('[Notion] Failed to set page status:', error);
    return false;
  }
}
