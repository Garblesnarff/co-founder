import { z } from 'zod';
import { db } from '../../db/client.js';
import { slackMessages, slackChannels } from '../../db/schema/index.js';
import { desc, eq, like, and } from 'drizzle-orm';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { nonEmptyStringSchema, optionalStringSchema, searchLimitSchema } from '../../schemas/common.js';
import { NotFoundError } from '../../lib/errors.js';

// Schema for get messages
const getMessagesSchema = z.object({
  channelName: nonEmptyStringSchema.describe('Channel name (without #)'),
  limit: searchLimitSchema.describe('Max messages to return (default 20)'),
});

// Schema for search messages
const searchMessagesSchema = z.object({
  query: nonEmptyStringSchema.describe('Search query'),
  channelName: optionalStringSchema.describe('Optional: limit to specific channel'),
  limit: searchLimitSchema.describe('Max messages to return (default 20)'),
});

// Generate MCP tool definitions from Zod schemas
export const slackGetMessagesTool = createMcpToolDefinition(
  'slack_get_messages',
  'Get recent messages from a Slack channel.',
  getMessagesSchema
);

export const slackSearchMessagesTool = createMcpToolDefinition(
  'slack_search_messages',
  'Search Slack messages by keyword.',
  searchMessagesSchema
);

// Handler for getting messages with automatic auth check and schema validation
export const handleSlackGetMessages = createToolHandler(
  getMessagesSchema,
  async (input) => {
    // Find channel by name
    const [channel] = await db.select()
      .from(slackChannels)
      .where(eq(slackChannels.name, input.channelName));

    if (!channel) {
      throw new NotFoundError('Channel', input.channelName);
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
);

// Handler for searching messages with automatic auth check and schema validation
export const handleSlackSearchMessages = createToolHandler(
  searchMessagesSchema,
  async (input) => {
    const conditions = [like(slackMessages.text, `%${input.query}%`)];

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
);
