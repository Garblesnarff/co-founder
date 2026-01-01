import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { slackChannels, slackMessages } from '../db/schema/index.js';
import { slackClient } from './client.js';
import { parseDispatchCommand, isDispatchCommand } from '../dispatch/parser.js';
import { queueDispatch } from '../dispatch/orchestrator.js';

export const slackRouter = Router();

// Slack signature verification middleware
function verifySlackSignature(req: Request, res: Response, next: Function) {
  if (!env.SLACK_SIGNING_SECRET) {
    console.error('SLACK_SIGNING_SECRET not configured');
    return res.status(500).send('Slack not configured');
  }

  const timestamp = req.headers['x-slack-request-timestamp'] as string;
  const signature = req.headers['x-slack-signature'] as string;

  if (!timestamp || !signature) {
    return res.status(400).send('Missing Slack headers');
  }

  // Check for replay attacks (request older than 5 minutes)
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return res.status(400).send('Request too old');
  }

  // Verify signature
  const sigBaseString = `v0:${timestamp}:${req.rawBody}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', env.SLACK_SIGNING_SECRET)
    .update(sigBaseString)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature))) {
    return res.status(400).send('Invalid signature');
  }

  next();
}

// Main event handler
slackRouter.post('/events', async (req: Request, res: Response, next) => {
  const body = req.body;

  // URL verification challenge (Slack sends this when setting up event subscriptions)
  // This happens before we verify signature since it's needed for initial setup
  if (body.type === 'url_verification') {
    console.log('Slack URL verification challenge received');
    return res.json({ challenge: body.challenge });
  }

  // For all other events, verify the signature
  verifySlackSignature(req, res, () => {
    handleSlackEvent(req, res);
  });
});

async function handleSlackEvent(req: Request, res: Response) {
  const body = req.body;

  // Immediately respond to Slack (they retry if we don't respond quickly)
  res.status(200).send('OK');

  // Process event asynchronously
  try {
    await processSlackEvent(body);
  } catch (error) {
    console.error('Error processing Slack event:', error);
  }
}

async function processSlackEvent(body: any) {
  const event = body.event;
  if (!event) return;

  switch (event.type) {
    case 'message':
      await handleMessageEvent(event);
      break;
    case 'channel_created':
      await handleChannelCreatedEvent(event);
      break;
    case 'app_mention':
      await handleAppMentionEvent(event);
      break;
  }
}

async function handleMessageEvent(event: any) {
  // Ignore bot messages to prevent loops
  if (event.bot_id || event.subtype === 'bot_message') {
    return;
  }

  // Store message in database
  try {
    await db.insert(slackMessages).values({
      slackId: event.ts,
      channelSlackId: event.channel,
      userId: event.user,
      text: event.text || '',
      threadTs: event.thread_ts || null,
      hasAttachments: !!(event.files && event.files.length > 0),
    }).onConflictDoUpdate({
      target: slackMessages.slackId,
      set: {
        text: event.text || '',
      },
    });
  } catch (error) {
    console.error('Error storing message:', error);
  }

  // Check for dispatch commands
  if (event.text && isDispatchCommand(event.text)) {
    await handleDispatchCommand(event);
  }
}

async function handleChannelCreatedEvent(event: any) {
  const channel = event.channel;
  try {
    await db.insert(slackChannels).values({
      slackId: channel.id,
      name: channel.name,
      isPrivate: channel.is_private || false,
    }).onConflictDoNothing();
  } catch (error) {
    console.error('Error storing channel:', error);
  }
}

async function handleAppMentionEvent(event: any) {
  // When the bot is @mentioned, check if it's a dispatch command
  if (event.text && isDispatchCommand(event.text)) {
    await handleDispatchCommand(event);
  }
}

async function handleDispatchCommand(event: any) {
  try {
    const command = parseDispatchCommand(event.text);
    if (!command) {
      await slackClient.postThreadReply(
        event.channel,
        event.thread_ts || event.ts,
        '❌ Could not parse dispatch command. Format: `@dispatch [--track] [--repo=/path] [target:]agent: task`'
      );
      return;
    }

    // React to show we received the command
    await slackClient.addReaction(event.channel, event.ts, 'eyes');

    // Queue the dispatch
    const job = await queueDispatch({
      agent: command.agent,
      target: command.target,
      task: command.task,
      repoPath: command.repoPath,
      trackAsTask: command.trackAsTask,
      slackMessageTs: event.ts,
      slackChannelId: event.channel,
      slackThreadTs: event.thread_ts || event.ts,
      dispatchedBy: event.user,
    });

    await slackClient.postThreadReply(
      event.channel,
      event.thread_ts || event.ts,
      `🚀 Dispatching to **${command.target}:${command.agent}**...\n\`Job ID: ${job.id}\``
    );
  } catch (error) {
    console.error('Error handling dispatch command:', error);
    await slackClient.postThreadReply(
      event.channel,
      event.thread_ts || event.ts,
      `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Export function to sync channels on startup
export async function syncSlackChannels() {
  if (!slackClient.isConfigured()) {
    console.log('Slack not configured, skipping channel sync');
    return;
  }

  try {
    const channels = await slackClient.listChannels();
    for (const channel of channels) {
      if (channel.id && channel.name) {
        await db.insert(slackChannels).values({
          slackId: channel.id,
          name: channel.name,
          isPrivate: channel.is_private || false,
        }).onConflictDoUpdate({
          target: slackChannels.slackId,
          set: {
            name: channel.name,
            isPrivate: channel.is_private || false,
          },
        });
      }
    }
    console.log(`Synced ${channels.length} Slack channels`);
  } catch (error) {
    console.error('Error syncing Slack channels:', error);
  }
}
