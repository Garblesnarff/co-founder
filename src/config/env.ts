import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('8890'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BASE_URL: z.string().default('http://localhost:8890'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().default('dev_secret_change_me'),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Environment validation failed:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
