import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { AuthContext } from '../middleware/auth.js';
import { tools, handleToolCall } from './tools/index.js';

/**
 * Deep clone an object to strip any internal metadata or circular references.
 * Drizzle-orm can add internal Symbol properties to query results.
 * This ensures we return a clean, serializable object.
 */
function sanitize<T>(obj: T): T {
  const seen = new WeakSet();
  const safe = JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  });
  return JSON.parse(safe);
}

export class CofounderMcpServer {
  private server: Server;
  private auth: AuthContext;

  constructor(auth: AuthContext) {
    this.auth = auth;
    this.server = new Server(
      {
        name: 'cofounder-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await handleToolCall(name, args || {}, this.auth);
        // Sanitize to strip any drizzle-orm internal metadata that could cause cycles
        const cleanResult = sanitize(result);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(cleanResult, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: true, message }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  getServer(): Server {
    return this.server;
  }
}
