export interface DispatchCommand {
  agent: 'claude' | 'gemini' | 'qwen' | 'cline';
  target: 'hetzner' | 'mac' | 'cold_storage';
  task: string;
  repoPath?: string;
  trackAsTask: boolean;
}

const VALID_AGENTS = ['claude', 'gemini', 'qwen', 'cline'] as const;
const VALID_TARGETS = ['hetzner', 'mac', 'cold_storage'] as const;

/**
 * Check if a message contains a dispatch command
 * Format: @dispatch [--track] [--repo=/path] [target:]agent: task
 */
export function isDispatchCommand(text: string): boolean {
  return text.toLowerCase().includes('@dispatch');
}

/**
 * Parse a dispatch command from message text
 * Format: @dispatch [--track] [--repo=/path] [target:]agent: task
 *
 * Examples:
 *   @dispatch claude: fix the bug in auth.ts
 *   @dispatch mac:gemini: review this PR
 *   @dispatch --track --repo=/var/www/myapp claude: add tests
 */
export function parseDispatchCommand(text: string): DispatchCommand | null {
  // Remove any user mentions that might precede the command
  const dispatchIndex = text.toLowerCase().indexOf('@dispatch');
  if (dispatchIndex === -1) return null;

  let remaining = text.slice(dispatchIndex + '@dispatch'.length).trim();

  // Parse flags
  let trackAsTask = false;
  let repoPath: string | undefined;

  // Parse --track flag
  if (remaining.startsWith('--track')) {
    trackAsTask = true;
    remaining = remaining.slice('--track'.length).trim();
  }

  // Parse --repo=/path flag
  const repoMatch = remaining.match(/^--repo=(\S+)/);
  if (repoMatch) {
    repoPath = repoMatch[1];
    remaining = remaining.slice(repoMatch[0].length).trim();
  }

  // Check for --track after --repo (order shouldn't matter)
  if (remaining.startsWith('--track')) {
    trackAsTask = true;
    remaining = remaining.slice('--track'.length).trim();
  }

  // Parse [target:]agent: task
  // Pattern: optional_target:agent: task
  const commandMatch = remaining.match(/^(?:([a-z_]+):)?([a-z]+):\s*(.+)$/i);
  if (!commandMatch) return null;

  const [, targetStr, agentStr, task] = commandMatch;

  // Validate agent
  const agent = agentStr.toLowerCase() as typeof VALID_AGENTS[number];
  if (!VALID_AGENTS.includes(agent)) {
    return null;
  }

  // Validate target (default to 'hetzner')
  let target: typeof VALID_TARGETS[number] = 'hetzner';
  if (targetStr) {
    const normalizedTarget = targetStr.toLowerCase() as typeof VALID_TARGETS[number];
    if (VALID_TARGETS.includes(normalizedTarget)) {
      target = normalizedTarget;
    } else {
      return null; // Invalid target
    }
  }

  return {
    agent,
    target,
    task: task.trim(),
    repoPath,
    trackAsTask,
  };
}

/**
 * Format a dispatch command for posting to Slack (for remote targets)
 */
export function formatDispatchMessage(command: DispatchCommand, jobId: number): string {
  const flags = [];
  if (command.trackAsTask) flags.push('--track');
  if (command.repoPath) flags.push(`--repo=${command.repoPath}`);

  const flagStr = flags.length > 0 ? flags.join(' ') + ' ' : '';
  return `@dispatch ${flagStr}${command.target}:${command.agent}: ${command.task}\n[Job ID: ${jobId}]`;
}
