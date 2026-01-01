import { env } from '../../config/env.js';
import { existsSync } from 'fs';

/**
 * Run an AI agent locally on Hetzner
 * Currently supports: claude
 * Future: gemini (needs auth), qwen, cline
 */
export async function runLocalAgent(
  agent: string,
  task: string,
  repoPath?: string
): Promise<string> {
  const timeout = parseInt(env.DISPATCH_TIMEOUT_MS || '300000');

  switch (agent.toLowerCase()) {
    case 'claude':
      return runClaude(task, repoPath, timeout);
    case 'gemini':
      throw new Error('Gemini CLI not authenticated on Hetzner. Use mac:gemini: instead.');
    case 'qwen':
      throw new Error('Qwen CLI not installed on Hetzner. Use mac:qwen: instead.');
    case 'cline':
      throw new Error('Cline CLI not installed on Hetzner. Use mac:cline: instead.');
    default:
      throw new Error(`Unknown agent: ${agent}`);
  }
}

/**
 * Run Claude Code CLI
 * Uses: claude -p "task" --print
 * Note: Uses --project flag to set working directory since cwd alone doesn't override
 * Claude Code's allowed-directories configuration.
 */
async function runClaude(task: string, repoPath?: string, timeout: number = 300000): Promise<string> {
  // Validate repoPath exists if provided
  const validRepoPath = repoPath && existsSync(repoPath) ? repoPath : undefined;

  if (repoPath && !validRepoPath) {
    throw new Error(`Repository path does not exist: ${repoPath}`);
  }

  // Build args - use --project flag to explicitly set the working directory
  const args = validRepoPath
    ? ['-p', task, '--print', '--project', validRepoPath]
    : ['-p', task, '--print'];

  // Use Bun.spawn for subprocess execution
  // Note: Don't change cwd as it can break PATH resolution for 'claude' binary
  const proc = Bun.spawn(['claude', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      // Ensure we don't get interactive prompts
      CLAUDE_CODE_HEADLESS: '1',
    },
  });

  // Set up timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      proc.kill();
      reject(new Error(`Claude execution timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    // Wait for process to complete or timeout
    const result = await Promise.race([
      (async () => {
        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;

        if (exitCode !== 0) {
          throw new Error(`Claude exited with code ${exitCode}: ${stderr}`);
        }

        return stdout || stderr || 'No output';
      })(),
      timeoutPromise,
    ]);

    return result;
  } finally {
    // Ensure process is killed if still running
    try {
      proc.kill();
    } catch {
      // Process already exited
    }
  }
}

/**
 * Future: Run Gemini CLI
 * Uses: gemini -p "task"
 */
// async function runGemini(task: string, repoPath?: string, timeout: number = 300000): Promise<string> {
//   // Similar implementation to runClaude
// }
