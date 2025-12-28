import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { getState, recordCheckin } from '../../services/state-service.js';
import { getQueueDepth } from '../../services/queue-service.js';
import { getActiveBlockers } from '../../services/blocker-service.js';
import { incrementCheckins } from '../../services/daily-log-service.js';
import { getActiveSession } from '../../services/session-service.js';
import { getTaskNoteCount } from '../../services/task-notes-service.js';

export const cofounderCheckinTool = {
  name: 'cofounder_checkin',
  description: 'Check in at the start of any conversation about work. Returns current goal, task, streak, and status.',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: [],
  },
};

export async function handleCofounderCheckin(_args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const state = await getState();
  if (!state) {
    throw new Error('Founder state not initialized. Run seed script.');
  }

  await recordCheckin();
  await incrementCheckins();

  const queueDepth = await getQueueDepth();
  const activeBlockers = await getActiveBlockers();
  const activeSession = await getActiveSession();
  const taskNoteCount = state.currentTaskId
    ? await getTaskNoteCount(state.currentTaskId)
    : 0;

  const hoursSinceAssigned = state.currentTaskAssignedAt
    ? (Date.now() - new Date(state.currentTaskAssignedAt).getTime()) / (1000 * 60 * 60)
    : null;

  const sessionMinutes = activeSession
    ? Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / (1000 * 60))
    : null;

  // Determine contextual guidance
  let suggestedAction: string;
  let hint: string;

  if (!state.currentTask && queueDepth > 0) {
    suggestedAction = 'cofounder_claim_task';
    hint = 'No active task. Call cofounder_claim_task to start working.';
  } else if (!state.currentTask && queueDepth === 0) {
    suggestedAction = 'cofounder_add_task';
    hint = 'Queue empty. Add tasks or update_progress if work was done outside the system.';
  } else if (state.currentTask && activeBlockers.length > 0) {
    suggestedAction = 'cofounder_get_task_notes';
    hint = 'This task has active blockers. Check notes before continuing.';
  } else if (state.currentTask && sessionMinutes !== null && sessionMinutes > 90) {
    suggestedAction = 'cofounder_end_session';
    hint = `Session at ${sessionMinutes} minutes. Consider a break or end_session.`;
  } else if (state.currentTask && !activeSession) {
    suggestedAction = 'cofounder_start_session';
    hint = 'Task claimed but no session. Call cofounder_start_session to track this work block.';
  } else if (state.currentTask && taskNoteCount > 0) {
    suggestedAction = 'cofounder_get_task_notes';
    hint = `Task ${state.currentTaskId} has ${taskNoteCount} notes from previous work. Call cofounder_get_task_notes to see history.`;
  } else {
    suggestedAction = 'cofounder_add_task_note';
    hint = `Working on: ${state.currentTask}. Log progress with cofounder_add_task_note.`;
  }

  return {
    goal: state.goal,
    goalMetric: state.goalMetric,
    currentTask: state.currentTask,
    currentTaskId: state.currentTaskId,
    currentTaskContext: state.currentTaskContext,
    assignedAt: state.currentTaskAssignedAt?.toISOString() || null,
    hoursSinceAssigned: hoursSinceAssigned ? Math.round(hoursSinceAssigned * 10) / 10 : null,
    streakDays: state.streakDays,
    status: state.status,
    queueDepth,
    blockers: activeBlockers.map(b => b.blocker),
    sessionActive: !!activeSession,
    sessionMinutes,
    suggestedAction,
    hint,
  };
}
