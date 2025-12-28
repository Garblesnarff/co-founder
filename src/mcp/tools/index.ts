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
import { cofounderUpdateProgressTool, handleCofounderUpdateProgress } from './update-progress.js';
import { cofounderAddTaskNoteTool, handleCofounderAddTaskNote } from './add-task-note.js';
import { cofounderGetTaskNotesTool, handleCofounderGetTaskNotes } from './get-task-notes.js';
import { cofounderStartSessionTool, handleCofounderStartSession } from './start-session.js';
import { cofounderEndSessionTool, handleCofounderEndSession } from './end-session.js';
import { cofounderGetSessionTool, handleCofounderGetSession } from './get-session.js';
import { cofounderGetProjectContextTool, handleCofounderGetProjectContext } from './get-project-context.js';
import { cofounderUpdateProjectContextTool, handleCofounderUpdateProjectContext } from './update-project-context.js';
import { cofounderLogDecisionTool, handleCofounderLogDecision } from './log-decision.js';
import { cofounderGetDecisionsTool, handleCofounderGetDecisions } from './get-decisions.js';
import { cofounderListCompletedTool, handleCofounderListCompleted } from './list-completed.js';
import { cofounderReportIssueTool, handleCofounderReportIssue } from './report-issue.js';
import { cofounderGetIssuesTool, handleCofounderGetIssues } from './get-issues.js';
import { cofounderUpdateIssueTool, handleCofounderUpdateIssue } from './update-issue.js';
import { cofounderMarkDoneTool, handleCofounderMarkDone } from './mark-done.js';

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
  cofounderUpdateProgressTool,
  cofounderAddTaskNoteTool,
  cofounderGetTaskNotesTool,
  cofounderStartSessionTool,
  cofounderEndSessionTool,
  cofounderGetSessionTool,
  cofounderGetProjectContextTool,
  cofounderUpdateProjectContextTool,
  cofounderLogDecisionTool,
  cofounderGetDecisionsTool,
  cofounderListCompletedTool,
  cofounderReportIssueTool,
  cofounderGetIssuesTool,
  cofounderUpdateIssueTool,
  cofounderMarkDoneTool,
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
    case 'cofounder_update_progress':
      return handleCofounderUpdateProgress(args, auth);
    case 'cofounder_add_task_note':
      return handleCofounderAddTaskNote(args, auth);
    case 'cofounder_get_task_notes':
      return handleCofounderGetTaskNotes(args, auth);
    case 'cofounder_start_session':
      return handleCofounderStartSession(args, auth);
    case 'cofounder_end_session':
      return handleCofounderEndSession(args, auth);
    case 'cofounder_get_session':
      return handleCofounderGetSession(args, auth);
    case 'cofounder_get_project_context':
      return handleCofounderGetProjectContext(args, auth);
    case 'cofounder_update_project_context':
      return handleCofounderUpdateProjectContext(args, auth);
    case 'cofounder_log_decision':
      return handleCofounderLogDecision(args, auth);
    case 'cofounder_get_decisions':
      return handleCofounderGetDecisions(args, auth);
    case 'cofounder_list_completed':
      return handleCofounderListCompleted(args, auth);
    case 'cofounder_report_issue':
      return handleCofounderReportIssue(args, auth);
    case 'cofounder_get_issues':
      return handleCofounderGetIssues(args, auth);
    case 'cofounder_update_issue':
      return handleCofounderUpdateIssue(args, auth);
    case 'cofounder_mark_done':
      return handleCofounderMarkDone(args, auth);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
