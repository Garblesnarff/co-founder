import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { db } from '../../db/client.js';
import { slackChannels } from '../../db/schema/index.js';

export const slackListChannelsTool = {
  name: 'slack_list_channels',
  description: 'List all Slack channels from the cached database.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      includePrivate: {
        type: 'boolean',
        description: 'Include private channels (default false)',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  includePrivate: z.boolean().optional().default(false),
});

export async function handleSlackListChannels(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = inputSchema.parse(args);

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
