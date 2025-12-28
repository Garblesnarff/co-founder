import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Seeding founder_state...');

    // Check if already seeded
    const existing = await client.query('SELECT * FROM founder_state WHERE id = 1');
    if (existing.rows.length > 0) {
      console.log('founder_state already seeded, skipping...');
      return;
    }

    await client.query(`
      INSERT INTO founder_state (id, goal, goal_metric, status, streak_days)
      VALUES (
        1,
        '$900/week from Infinite Realms',
        '~60 subscribers at $15/month',
        'active',
        0
      )
    `);

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
