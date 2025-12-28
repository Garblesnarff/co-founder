import { Router } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { extractAuthContext, type AuthContext } from '../middleware/auth.js';
import { CofounderMcpServer } from '../mcp/server.js';
import { env } from '../config/env.js';

const router = Router();

// Helper to return OAuth 401 with proper headers
function sendOAuthRequired(res: any) {
  const baseUrl = env.BASE_URL;
  res.setHeader(
    'WWW-Authenticate',
    `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`
  );
  res.status(401).json({
    jsonrpc: '2.0',
    error: {
      code: -32001,
      message: 'Authentication required. Use API key or OAuth.',
    },
    id: null,
  });
}

router.post('/mcp', async (req, res) => {
  try {
    const auth = await extractAuthContext(req);

    // All tools require authentication for Co-Founder
    if (auth.isAnonymous) {
      return sendOAuthRequired(res);
    }

    const mcpServer = new CofounderMcpServer(auth);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless
    });

    await mcpServer.getServer().connect(transport);

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('MCP request error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
      id: null,
    });
  }
});

// Handle GET for SSE (if needed)
router.get('/mcp', (_req, res) => {
  res.status(405).json({
    jsonrpc: '2.0',
    error: {
      code: -32601,
      message: 'Method not allowed. Use POST for MCP requests.',
    },
    id: null,
  });
});

// Handle DELETE for session cleanup
router.delete('/mcp', async (_req, res) => {
  res.status(200).json({ success: true });
});

export default router;
