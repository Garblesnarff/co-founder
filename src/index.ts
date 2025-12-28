import express from 'express';
import { env } from './config/env.js';
import healthRouter from './routes/health.js';
import mcpRouter from './routes/mcp.js';
import oauthRouter from './routes/oauth.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for MCP clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Routes
app.use(healthRouter);
app.use(oauthRouter);
app.use(mcpRouter);

// Root
app.get('/', (_req, res) => {
  res.json({
    name: 'Co-Founder MCP Server',
    description: 'AI Co-Founder accountability system for Rob',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      mcp: '/mcp (POST)',
      oauth: {
        authorize: '/authorize',
        token: '/token',
        register: '/register',
        metadata: '/.well-known/oauth-authorization-server',
      },
    },
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
const port = parseInt(env.PORT, 10);
app.listen(port, () => {
  console.log(`Co-Founder MCP server running on port ${port}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Base URL: ${env.BASE_URL}`);
});
