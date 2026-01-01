import { WebClient } from '@slack/web-api';
import { env } from '../config/env.js';

class SlackClient {
  private client: WebClient | null = null;

  private getClient(): WebClient {
    if (!this.client) {
      if (!env.SLACK_BOT_TOKEN) {
        throw new Error('SLACK_BOT_TOKEN not configured');
      }
      this.client = new WebClient(env.SLACK_BOT_TOKEN);
    }
    return this.client;
  }

  isConfigured(): boolean {
    return !!env.SLACK_BOT_TOKEN;
  }

  async postMessage(channel: string, text: string, threadTs?: string) {
    const result = await this.getClient().chat.postMessage({
      channel,
      text,
      thread_ts: threadTs,
    });
    return result;
  }

  async postThreadReply(channel: string, threadTs: string, text: string) {
    return this.postMessage(channel, text, threadTs);
  }

  async getChannelHistory(channel: string, limit: number = 100) {
    const result = await this.getClient().conversations.history({
      channel,
      limit,
    });
    return result.messages || [];
  }

  async getThreadReplies(channel: string, threadTs: string) {
    const result = await this.getClient().conversations.replies({
      channel,
      ts: threadTs,
    });
    return result.messages || [];
  }

  async listChannels() {
    const result = await this.getClient().conversations.list({
      types: 'public_channel,private_channel',
      limit: 1000,
    });
    return result.channels || [];
  }

  async getChannelInfo(channel: string) {
    const result = await this.getClient().conversations.info({
      channel,
    });
    return result.channel;
  }

  async getUserInfo(userId: string) {
    const result = await this.getClient().users.info({
      user: userId,
    });
    return result.user;
  }

  async addReaction(channel: string, timestamp: string, emoji: string) {
    await this.getClient().reactions.add({
      channel,
      timestamp,
      name: emoji,
    });
  }
}

export const slackClient = new SlackClient();
