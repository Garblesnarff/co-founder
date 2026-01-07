import { z } from 'zod';
import { slackClient } from '../../slack/client.js';
import { db } from '../../db/client.js';
import { slackChannels } from '../../db/schema/index.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { nonEmptyStringSchema, optionalStringSchema } from '../../schemas/common.js';
import { ExternalServiceError, ValidationError } from '../../lib/errors.js';

// Define schema once - used for both MCP registration and runtime validation
const inputSchema = z.object({
  name: nonEmptyStringSchema.describe('Channel name (will be lowercased, spaces become hyphens)'),
  isPrivate: z.boolean().optional().default(false).describe('Create as private channel (default: false)'),
  topic: optionalStringSchema.describe('Optional channel topic/description'),
});

// Generate MCP tool definition from Zod schema
export const slackCreateChannelTool = createMcpToolDefinition(
  'slack_create_channel',
  'Create a new Slack channel. Returns the channel ID and name.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleSlackCreateChannel = createToolHandler(
  inputSchema,
  async (input) => {
    if (!slackClient.isConfigured()) {
      throw new ExternalServiceError('Slack', 'configuration', new Error('Slack is not configured'));
    }

    // Create the channel
    const channel = await slackClient.createChannel(input.name, input.isPrivate);

    if (!channel || !channel.id) {
      throw new ValidationError('Failed to create channel');
    }

    // Set topic if provided
    if (input.topic) {
      await slackClient.setChannelTopic(channel.id, input.topic);
    }

    // Cache in database
    await db.insert(slackChannels).values({
      slackId: channel.id,
      name: channel.name || input.name.toLowerCase().replace(/\s+/g, '-'),
      isPrivate: input.isPrivate,
    }).onConflictDoNothing();

    return {
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
        isPrivate: input.isPrivate,
        topic: input.topic || null,
      },
      message: `Channel #${channel.name} created successfully.`,
    };
  }
);
