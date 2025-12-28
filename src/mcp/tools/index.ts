import type { AuthContext } from '../../middleware/auth.js';

import { cofounderCheckinTool, handleCofounderCheckin } from './checkin.js';
import { cofounderCompleteTool, handleCofounderComplete } from './complete.js';
import { cofounderBlockedTool, handleCofounderBlocked } from './blocked.js';
import { cofounderAddTaskTool, handleCofounderAddTask } from './add-task.js';
import { cofounderQueueTool, handleCofounderQueue } from './queue.js';
import { cofounderStatsTool, handleCofounderStats } from './stats.js';
import { cofounderReprioritizeTool, handleCofounderReprioritize } from './reprioritize.js';
import { cofounderLogMoodTool, handleCofounderLogMood } from './log-mood.js';
import { cofounderUpdateTaskTool, handleCofounderUpdateTask } from './update-task.js';
import { cofounderDeleteTaskTool, handleCofounderDeleteTask } from './delete-task.js';
import { cofounderClaimTaskTool, handleCofounderClaimTask } from './claim-task.js';

export const tools = [
  cofounderCheckinTool,
  cofounderCompleteTool,
  cofounderBlockedTool,
  cofounderAddTaskTool,
  cofounderQueueTool,
  cofounderStatsTool,
  cofounderReprioritizeTool,
  cofounderLogMoodTool,
  cofounderUpdateTaskTool,
  cofounderDeleteTaskTool,
  cofounderClaimTaskTool,
];

export async function handleToolCall(
  name: string,
  args: unknown,
  auth: AuthContext
): Promise<unknown> {
  switch (name) {
    case 'cofounder_checkin':
      return handleCofounderCheckin(args, auth);
    case 'cofounder_complete':
      return handleCofounderComplete(args, auth);
    case 'cofounder_blocked':
      return handleCofounderBlocked(args, auth);
    case 'cofounder_add_task':
      return handleCofounderAddTask(args, auth);
    case 'cofounder_queue':
      return handleCofounderQueue(args, auth);
    case 'cofounder_stats':
      return handleCofounderStats(args, auth);
    case 'cofounder_reprioritize':
      return handleCofounderReprioritize(args, auth);
    case 'cofounder_log_mood':
      return handleCofounderLogMood(args, auth);
    case 'cofounder_update_task':
      return handleCofounderUpdateTask(args, auth);
    case 'cofounder_delete_task':
      return handleCofounderDeleteTask(args, auth);
    case 'cofounder_claim_task':
      return handleCofounderClaimTask(args, auth);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
