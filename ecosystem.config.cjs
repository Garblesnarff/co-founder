module.exports = {
  apps: [
    {
      name: 'cofounder-mcp',
      script: 'bun',
      args: 'run src/index.ts',
      cwd: '/var/www/co-founder',
      env: {
        NODE_ENV: 'production',
        PORT: '8890',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
