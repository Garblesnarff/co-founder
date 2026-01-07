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

  async createChannel(name: string, isPrivate: boolean = false) {
    const result = await this.getClient().conversations.create({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      is_private: isPrivate,
    });
    return result.channel;
  }

  async inviteToChannel(channel: string, users: string[]) {
    const result = await this.getClient().conversations.invite({
      channel,
      users: users.join(','),
    });
    return result.channel;
  }

  async setChannelTopic(channel: string, topic: string) {
    const result = await this.getClient().conversations.setTopic({
      channel,
      topic,
    });
    return result.channel;
  }
}

export const slackClient = new SlackClient();
