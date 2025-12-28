import { Router } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { extractAuthContext, type AuthContext } from '../middleware/auth.js';
import { CofounderMcpServer } from '../mcp/server.js';

const router = Router();

router.post('/mcp', async (req, res) => {
  try {
    const auth = await extractAuthContext(req);

    // All tools require authentication
    if (auth.isAnonymous) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Authentication required. Use API key.',
        },
        id: null,
      });
      return;
    }

    const mcpServer = new CofounderMcpServer(auth);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      transport.close();
    });

    await transport.handleRequest(req, res, mcpServer.getServer());
  } catch (error) {
    console.error('MCP request error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
      },
      id: null,
    });
  }
});

// Handle GET for SSE (if needed)
router.get('/mcp', (_req, res) => {
  res.status(405).json({
    error: 'Method not allowed. Use POST for MCP requests.',
  });
});

export default router;
