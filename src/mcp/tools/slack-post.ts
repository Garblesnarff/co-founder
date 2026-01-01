import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import { db } from '../../db/client.js';
import { slackChannels } from '../../db/schema/index.js';
import { slackClient } from '../../slack/client.js';
import { eq } from 'drizzle-orm';

export const slackPostMessageTool = {
  name: 'slack_post_message',
  description: 'Post a message to a Slack channel.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      channelName: {
        type: 'string',
        description: 'Channel name (without #)',
      },
      message: {
        type: 'string',
        description: 'Message to post',
      },
      threadTs: {
        type: 'string',
        description: 'Optional: thread timestamp to reply to',
      },
    },
    required: ['channelName', 'message'],
  },
};

const inputSchema = z.object({
  channelName: z.string(),
  message: z.string(),
  threadTs: z.string().optional(),
});

export async function handleSlackPostMessage(args: unknown, auth: AuthContext) {
  if (auth.isAnonymous) {
    throw new Error('Authentication required');
  }

  if (!slackClient.isConfigured()) {
    throw new Error('Slack is not configured');
  }

  const input = inputSchema.parse(args);

  // Find channel by name
  const [channel] = await db.select()
    .from(slackChannels)
    .where(eq(slackChannels.name, input.channelName));

  if (!channel) {
    throw new Error(`Channel "${input.channelName}" not found`);
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
