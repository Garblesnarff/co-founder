import { z } from 'zod';
import { db } from '../../db/client.js';
import { slackChannels } from '../../db/schema/index.js';
import { slackClient } from '../../slack/client.js';
import { eq } from 'drizzle-orm';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { nonEmptyStringSchema, optionalStringSchema } from '../../schemas/common.js';
import { NotFoundError, ExternalServiceError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  channelName: nonEmptyStringSchema.describe('Channel name (without #)'),
  message: nonEmptyStringSchema.describe('Message to post'),
  threadTs: optionalStringSchema.describe('Optional: thread timestamp to reply to'),
});

// Generate MCP tool definition from Zod schema
export const slackPostMessageTool = createMcpToolDefinition(
  'slack_post_message',
  'Post a message to a Slack channel.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleSlackPostMessage = createToolHandler(
  inputSchema,
  async (input) => {
    if (!slackClient.isConfigured()) {
      throw new ExternalServiceError('Slack', 'configuration', new Error('Slack is not configured'));
    }

    // Find channel by name
    const [channel] = await db.select()
      .from(slackChannels)
      .where(eq(slackChannels.name, input.channelName));

    if (!channel) {
      throw new NotFoundError('Channel', input.channelName);
    }

    let result;
    if (input.threadTs) {
      result = await slackClient.postThreadReply(channel.slackId, input.threadTs, input.message);
    } else {
      result = await slackClient.postMessage(channel.slackId, input.message);
    }

    return {
      success: true,
      channel: channel.name,
      messageTs: result.ts,
      threadTs: input.threadTs || null,
    };
  }
);
