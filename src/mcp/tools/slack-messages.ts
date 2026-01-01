import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { db } from '../../db/client.js';
import { slackMessages, slackChannels } from '../../db/schema/index.js';
import { desc, eq, like, and } from 'drizzle-orm';

export const slackGetMessagesTool = {
  name: 'slack_get_messages',
  description: 'Get recent messages from a Slack channel.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      channelName: {
        type: 'string',
        description: 'Channel name (without #)',
      },
      limit: {
        type: 'number',
        description: 'Max messages to return (default 20)',
      },
    },
    required: ['channelName'],
  },
};

export const slackSearchMessagesTool = {
  name: 'slack_search_messages',
  description: 'Search Slack messages by keyword.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      channelName: {
        type: 'string',
        description: 'Optional: limit to specific channel',
      },
      limit: {
        type: 'number',
        description: 'Max messages to return (default 20)',
      },
    },
    required: ['query'],
  },
};

const getMessagesSchema = z.object({
  channelName: z.string(),
  limit: z.number().optional().default(20),
});

const searchMessagesSchema = z.object({
  query: z.string(),
  channelName: z.string().optional(),
  limit: z.number().optional().default(20),
});

export async function handleSlackGetMessages(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = getMessagesSchema.parse(args);

  // Find channel by name
  const [channel] = await db.select()
    .from(slackChannels)
    .where(eq(slackChannels.name, input.channelName));

  if (!channel) {
    throw new Error(`Channel "${input.channelName}" not found`);
  }

  const messages = await db.select()
    .from(slackMessages)
    .where(eq(slackMessages.channelSlackId, channel.slackId))
    .orderBy(desc(slackMessages.createdAt))
    .limit(input.limit);

  return {
    channel: channel.name,
    messages: messages.map(m => ({
      id: m.id,
      slackId: m.slackId,
      userId: m.userId,
      text: m.text,
      threadTs: m.threadTs,
      hasAttachments: m.hasAttachments,
      createdAt: m.createdAt,
    })),
    total: messages.length,
  };
}

export async function handleSlackSearchMessages(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  const input = searchMessagesSchema.parse(args);

  let conditions = [like(slackMessages.text, `%${input.query}%`)];

  // If channel specified, add channel filter
  if (input.channelName) {
    const [channel] = await db.select()
      .from(slackChannels)
      .where(eq(slackChannels.name, input.channelName));

    if (channel) {
      conditions.push(eq(slackMessages.channelSlackId, channel.slackId));
    }
  }

  const messages = await db.select()
    .from(slackMessages)
    .where(and(...conditions))
    .orderBy(desc(slackMessages.createdAt))
    .limit(input.limit);

  return {
    query: input.query,
    messages: messages.map(m => ({
      id: m.id,
      slackId: m.slackId,
      channelSlackId: m.channelSlackId,
      userId: m.userId,
      text: m.text,
      createdAt: m.createdAt,
    })),
    total: messages.length,
  };
}
