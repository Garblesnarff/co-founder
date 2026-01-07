import { slackClient } from '../src/slack/client.js';
import { db } from '../src/db/client.js';
import { slackChannels } from '../src/db/schema/index.js';

async function main() {
  console.log('Creating #dev-dispatch channel...');

  const channel = await slackClient.createChannel('dev-dispatch', false);
  console.log('Created channel:', channel);

  if (channel?.id) {
    await slackClient.setChannelTopic(
      channel.id,
      'AI dispatch commands. Format: @dispatch [--track] [--repo=/path] [target:]agent: task'
    );
    console.log('Topic set!');

    // Cache in database
    await db.insert(slackChannels).values({
      slackId: channel.id,
      name: channel.name || 'dev-dispatch',
      isPrivate: false,
    }).onConflictDoNothing();
    console.log('Cached in database');
  }

  console.log('Done!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
