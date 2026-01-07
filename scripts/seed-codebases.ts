import { addTool } from '../src/services/toolchain-service.js';

const codebases = [
  {
    name: 'Infinite Realms App',
    category: 'codebase',
    purpose: 'Main TTRPG AI game master application - infiniterealms.app',
    url: 'https://infiniterealms.app',
    repoPath: '/var/www/infiniterealms/ai-adventure-scribe-main',
    inputFormat: 'TypeScript/React frontend, Bun backend',
    outputFormat: 'Web application',
    workflowNotes: 'Main product. Uses Supabase for DB, Bun for server, React for frontend.',
    project: 'infinite_realms',
    tags: ['frontend', 'backend', 'product', 'main'],
    createdBy: 'claude-opus'
  },
  {
    name: 'Infinite Realms Tech',
    category: 'codebase',
    purpose: 'Marketing/landing site - infiniterealms.tech',
    url: 'https://infiniterealms.tech',
    repoPath: '/var/www/infiniterealms/infinite-realms',
    inputFormat: 'Static site',
    outputFormat: 'Marketing website',
    workflowNotes: 'Marketing site for the product.',
    project: 'infinite_realms',
    tags: ['marketing', 'frontend'],
    createdBy: 'claude-opus'
  },
  {
    name: 'Pearls MCP',
    category: 'codebase',
    purpose: 'AI-to-AI transmission system for cross-instance memory',
    url: null,
    repoPath: '/var/www/pearls',
    inputFormat: 'TypeScript MCP server',
    outputFormat: 'MCP tools for pearl creation/retrieval',
    workflowNotes: 'Allows AI instances to leave messages for future instances. Uses PostgreSQL.',
    project: 'infrastructure',
    tags: ['mcp', 'ai-memory', 'backend'],
    createdBy: 'claude-opus'
  },
  {
    name: 'Co-founder MCP',
    category: 'codebase',
    purpose: 'AI co-founder task management and dispatch system',
    url: null,
    repoPath: '/var/www/co-founder',
    inputFormat: 'TypeScript MCP server',
    outputFormat: 'MCP tools for task tracking, dispatch, Slack integration',
    workflowNotes: 'Central hub for task management, AI dispatch, toolchain storage. Uses PostgreSQL + Drizzle ORM.',
    project: 'infrastructure',
    tags: ['mcp', 'task-management', 'backend', 'dispatch'],
    createdBy: 'claude-opus'
  }
];

async function main() {
  for (const codebase of codebases) {
    const result = await addTool(codebase);
    console.log('Added:', result.name, '- ID:', result.id);
  }
  console.log('Done! Added', codebases.length, 'codebases to toolchain.');
}

main().catch(console.error);
