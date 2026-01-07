/**
 * Tool Handler Utility
 *
 * Higher-order function that wraps MCP tool handlers with:
 * - Authentication check (throws if anonymous)
 * - Zod schema parsing and validation
 * - Type-safe handler execution
 */

import { z } from 'zod';
import type { AuthContext } from '../middleware/auth.js';

/**
 * Error thrown when authentication is required but user is anonymous
 */
export class AuthenticationRequiredError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}

/**
 * Type for the wrapped handler function
 */
export type ToolHandler<T extends z.ZodType> = (
  args: unknown,
  auth: AuthContext
) => Promise<any>;

/**
 * Options for createToolHandler
 */
export interface CreateToolHandlerOptions {
  /**
   * If true, allows anonymous access (skips auth check)
   * Default: false
   */
  allowAnonymous?: boolean;
}

/**
 * Creates a type-safe MCP tool handler with auth check and schema validation.
 *
 * @param schema - Zod schema for validating and typing the input
 * @param handler - The actual handler function with typed input
 * @param options - Optional configuration
 * @returns A wrapped handler function for MCP tool registration
 *
 * @example
 * ```typescript
 * const inputSchema = z.object({
 *   task: z.string().describe('Task description'),
 *   priority: z.number().min(0).max(10).default(5),
 * });
 *
 * export const handler = createToolHandler(
 *   inputSchema,
 *   async (input, auth) => {
 *     // input is typed as { task: string; priority: number }
 *     // auth is guaranteed to be authenticated
 *     return { success: true, task: input.task };
 *   }
 * );
 * ```
 */
export function createToolHandler<T extends z.ZodType>(
  schema: T,
  handler: (input: z.infer<T>, auth: AuthContext) => Promise<any>,
  options: CreateToolHandlerOptions = {}
): ToolHandler<T> {
  const { allowAnonymous = false } = options;

  return async (args: unknown, auth: AuthContext) => {
    // Auth check (unless anonymous access is allowed)
    if (!allowAnonymous && auth.isAnonymous) {
      throw new AuthenticationRequiredError();
    }

    // Parse and validate input with Zod
    const input = schema.parse(args);

    // Execute the typed handler
    return handler(input, auth);
  };
}

/**
 * Creates a tool handler that allows anonymous access.
 * Convenience wrapper around createToolHandler with allowAnonymous: true
 *
 * @param schema - Zod schema for validating and typing the input
 * @param handler - The actual handler function with typed input
 * @returns A wrapped handler function for MCP tool registration
 *
 * @example
 * ```typescript
 * const inputSchema = z.object({
 *   query: z.string(),
 * });
 *
 * export const handler = createPublicToolHandler(
 *   inputSchema,
 *   async (input, auth) => {
 *     // Auth may be anonymous here
 *     return { results: [] };
 *   }
 * );
 * ```
 */
export function createPublicToolHandler<T extends z.ZodType>(
  schema: T,
  handler: (input: z.infer<T>, auth: AuthContext) => Promise<any>
): ToolHandler<T> {
  return createToolHandler(schema, handler, { allowAnonymous: true });
}

/**
 * Helper type to extract the input type from a Zod schema
 */
export type InferToolInput<T extends z.ZodType> = z.infer<T>;

/**
 * Helper type for defining tool handler functions
 */
export type TypedToolHandler<TInput, TOutput> = (
  input: TInput,
  auth: AuthContext
) => Promise<TOutput>;
