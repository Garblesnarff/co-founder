import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const initialTasks = [
  // Priority 10 (Critical)
  { task: 'Set up Stripe account', priority: 10, project: 'infinite_realms', context: 'Need business banking and EIN first' },
  { task: 'Connect Stripe to Infinite Realms', priority: 10, project: 'infinite_realms', context: 'Use Stripe React components. IR is at infiniterealms.tech' },
  { task: 'Create beta signup page', priority: 10, project: 'infinite_realms', context: 'Simple landing page with email capture' },
  { task: 'Open signups (post to X)', priority: 10, project: 'infinite_realms', context: 'Announce beta, link to signup page' },

  // Priority 8 (High)
  { task: 'Write 3 beta invite tweets', priority: 8, project: 'infinite_realms', context: 'Schedule for different times' },
  { task: 'DM 10 D&D players about beta', priority: 8, project: 'infinite_realms', context: 'Find active D&D communities on X' },
  { task: 'Set up basic analytics', priority: 8, project: 'infinite_realms', context: 'Plausible or similar, privacy-focused' },

  // Priority 5 (Medium)
  { task: 'Finish Terminus SSH to Hetzner', priority: 5, project: 'infrastructure', context: 'For mobile access to servers' },
  { task: 'Create feedback form for beta users', priority: 5, project: 'infinite_realms', context: 'Simple Google Form or Tally' },

  // Priority 3 (Low)
  { task: 'Write first blog post about IR', priority: 3, project: 'infinite_realms', context: 'Behind-the-scenes of building with AI' },
];

async function seedTasks() {
  const client = await pool.connect();

  try {
    console.log('Seeding task queue...');

    // Check if already seeded
    const existing = await client.query('SELECT COUNT(*) FROM task_queue');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('task_queue already has tasks, skipping...');
      return;
    }

    for (const task of initialTasks) {
      await client.query(`
        INSERT INTO task_queue (task, priority, project, context, added_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [task.task, task.priority, task.project, task.context, 'initial_seed']);
    }

    console.log(`Seeded ${initialTasks.length} tasks`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedTasks();
