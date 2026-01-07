import { z } from 'zod';
import { db } from '../../db/client.js';
import { slackChannels } from '../../db/schema/index.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  includePrivate: z.boolean().optional().default(false).describe('Include private channels (default false)'),
});

// Generate MCP tool definition from Zod schema
export const slackListChannelsTool = createMcpToolDefinition(
  'slack_list_channels',
  'List all Slack channels from the cached database.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleSlackListChannels = createToolHandler(
  inputSchema,
  async (input) => {
    const channels = await db.select().from(slackChannels);

    const filtered = input.includePrivate
      ? channels
      : channels.filter(c => !c.isPrivate);

    return {
      channels: filtered.map(c => ({
        id: c.id,
        slackId: c.slackId,
        name: c.name,
        isPrivate: c.isPrivate,
      })),
      total: filtered.length,
    };
  }
);
