import { z } from 'zod';
import { getBlockedTasks } from '../../services/task-blocker-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({});

// Generate MCP tool definition from Zod schema
export const cofounderBlockedTasksTool = createMcpToolDefinition(
  'cofounder_blocked_tasks',
  'Get all blocked tasks with their blockers.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderBlockedTasks = createToolHandler(
  inputSchema,
  async () => {
    const blockedTasks = await getBlockedTasks();

    return {
      blockedTasks: blockedTasks.map(t => ({
        id: t.id,
        task: t.task,
        priority: t.priority,
        project: t.project,
        blockedBy: t.blockedBy,
        blockerDetails: t.blockerDetails,
        dueDate: t.dueDate,
      })),
      count: blockedTasks.length,
      message: blockedTasks.length > 0
        ? `Found ${blockedTasks.length} blocked task(s).`
        : 'No blocked tasks.',
    };
  }
);
