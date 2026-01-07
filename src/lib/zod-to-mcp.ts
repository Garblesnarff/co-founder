/**
 * Zod to MCP Schema Converter
 *
 * Converts Zod schemas to MCP inputSchema format (JSON Schema).
 * This allows tools to define schema once in Zod and auto-generate
 * the MCP inputSchema for tool registration.
 */

import { z } from 'zod';

/**
 * MCP JSON Schema types
 */
export interface MCPJsonSchema {
  type: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'null';
  properties?: Record<string, MCPPropertySchema>;
  required?: string[];
  items?: MCPPropertySchema;
  enum?: (string | number | boolean)[];
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  anyOf?: MCPPropertySchema[];
  oneOf?: MCPPropertySchema[];
}

export type MCPPropertySchema = MCPJsonSchema;

/**
 * Result of converting a Zod schema to MCP format
 */
export interface MCPInputSchema {
  type: 'object';
  properties: Record<string, MCPPropertySchema>;
  required: string[];
}

/**
 * Convert a Zod schema to MCP inputSchema format.
 *
 * @param schema - Zod object schema to convert
 * @returns MCP-compatible JSON Schema
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   task: z.string().describe('Task description'),
 *   priority: z.number().min(0).max(10).optional().default(5),
 *   tags: z.array(z.string()).optional(),
 * });
 *
 * const mcpSchema = zodToMcpSchema(schema);
 * // Result:
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     task: { type: 'string', description: 'Task description' },
 * //     priority: { type: 'number', minimum: 0, maximum: 10, default: 5 },
 * //     tags: { type: 'array', items: { type: 'string' } },
 * //   },
 * //   required: ['task'],
 * // }
 * ```
 */
export function zodToMcpSchema<T extends z.ZodObject<any>>(schema: T): MCPInputSchema {
  const shape = schema._def.shape();
  const properties: Record<string, MCPPropertySchema> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny;
    const { schema: propSchema, isOptional } = convertZodType(zodType);
    properties[key] = propSchema;

    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    required,
  };
}

/**
 * Result of converting a single Zod type
 */
interface ConvertedType {
  schema: MCPPropertySchema;
  isOptional: boolean;
}

/**
 * Convert a single Zod type to JSON Schema format
 */
function convertZodType(zodType: z.ZodTypeAny): ConvertedType {
  let isOptional = false;
  let currentType = zodType;
  let defaultValue: unknown = undefined;
  let description: string | undefined;

  // Unwrap and track modifiers
  while (true) {
    // Extract description at any level
    if (currentType._def.description) {
      description = currentType._def.description;
    }

    if (currentType instanceof z.ZodOptional) {
      isOptional = true;
      currentType = currentType._def.innerType;
    } else if (currentType instanceof z.ZodNullable) {
      isOptional = true;
      currentType = currentType._def.innerType;
    } else if (currentType instanceof z.ZodDefault) {
      isOptional = true; // Fields with defaults are effectively optional
      defaultValue = currentType._def.defaultValue();
      currentType = currentType._def.innerType;
    } else {
      break;
    }
  }

  const baseSchema = convertBaseType(currentType);

  // Add description if present
  if (description) {
    baseSchema.description = description;
  }

  // Add default value if present
  if (defaultValue !== undefined) {
    baseSchema.default = defaultValue;
  }

  return { schema: baseSchema, isOptional };
}

/**
 * Convert a base Zod type (after unwrapping Optional/Default/Nullable)
 */
function convertBaseType(zodType: z.ZodTypeAny): MCPPropertySchema {
  // String
  if (zodType instanceof z.ZodString) {
    const schema: MCPPropertySchema = { type: 'string' };

    for (const check of zodType._def.checks) {
      if (check.kind === 'min') {
        schema.minLength = check.value;
      } else if (check.kind === 'max') {
        schema.maxLength = check.value;
      } else if (check.kind === 'regex') {
        schema.pattern = check.regex.source;
      }
    }

    if (zodType._def.description) {
      schema.description = zodType._def.description;
    }

    return schema;
  }

  // Number
  if (zodType instanceof z.ZodNumber) {
    const schema: MCPPropertySchema = { type: 'number' };

    for (const check of zodType._def.checks) {
      if (check.kind === 'min') {
        schema.minimum = check.value;
      } else if (check.kind === 'max') {
        schema.maximum = check.value;
      } else if (check.kind === 'int') {
        schema.type = 'integer';
      }
    }

    if (zodType._def.description) {
      schema.description = zodType._def.description;
    }

    return schema;
  }

  // Boolean
  if (zodType instanceof z.ZodBoolean) {
    const schema: MCPPropertySchema = { type: 'boolean' };

    if (zodType._def.description) {
      schema.description = zodType._def.description;
    }

    return schema;
  }

  // Enum
  if (zodType instanceof z.ZodEnum) {
    const schema: MCPPropertySchema = {
      type: 'string',
      enum: zodType._def.values,
    };

    if (zodType._def.description) {
      schema.description = zodType._def.description;
    }

    return schema;
  }

  // Native enum
  if (zodType instanceof z.ZodNativeEnum) {
    const enumValues = Object.values(zodType._def.values).filter(
      (v) => typeof v === 'string' || typeof v === 'number'
    );
    const schema: MCPPropertySchema = {
      type: typeof enumValues[0] === 'number' ? 'number' : 'string',
      enum: enumValues,
    };

    if (zodType._def.description) {
      schema.description = zodType._def.description;
    }

    return schema;
  }

  // Array
  if (zodType instanceof z.ZodArray) {
    const itemType = convertBaseType(zodType._def.type);
    const schema: MCPPropertySchema = {
      type: 'array',
      items: itemType,
    };

    if (zodType._def.description) {
      schema.description = zodType._def.description;
    }

    return schema;
  }

  // Object (nested)
  if (zodType instanceof z.ZodObject) {
    const nestedSchema = zodToMcpSchema(zodType);
    const schema: MCPPropertySchema = {
      type: 'object',
      properties: nestedSchema.properties,
    };

    if (nestedSchema.required.length > 0) {
      schema.required = nestedSchema.required;
    }

    if (zodType._def.description) {
      schema.description = zodType._def.description;
    }

    return schema;
  }

  // Literal
  if (zodType instanceof z.ZodLiteral) {
    const value = zodType._def.value;
    const schema: MCPPropertySchema = {
      type: typeof value === 'number' ? 'number' :
            typeof value === 'boolean' ? 'boolean' : 'string',
      enum: [value],
    };

    if (zodType._def.description) {
      schema.description = zodType._def.description;
    }

    return schema;
  }

  // Union
  if (zodType instanceof z.ZodUnion) {
    const options = zodType._def.options.map((opt: z.ZodTypeAny) =>
      convertBaseType(opt)
    );
    const schema: MCPPropertySchema = {
      type: 'string', // Fallback, anyOf handles the actual types
      anyOf: options,
    };

    if (zodType._def.description) {
      schema.description = zodType._def.description;
    }

    return schema;
  }

  // Null
  if (zodType instanceof z.ZodNull) {
    return { type: 'null' };
  }

  // Any/Unknown - fallback to object
  if (zodType instanceof z.ZodAny || zodType instanceof z.ZodUnknown) {
    return { type: 'object' };
  }

  // Record
  if (zodType instanceof z.ZodRecord) {
    const schema: MCPPropertySchema = {
      type: 'object',
    };

    if (zodType._def.description) {
      schema.description = zodType._def.description;
    }

    return schema;
  }

  // Fallback for unsupported types
  console.warn(`Unsupported Zod type: ${zodType.constructor.name}, falling back to object`);
  return { type: 'object' };
}

/**
 * Create a complete MCP tool definition from a Zod schema.
 *
 * @param name - Tool name
 * @param description - Tool description
 * @param schema - Zod object schema
 * @returns Complete MCP tool definition object
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   task: z.string().describe('Task description'),
 *   priority: z.number().min(0).max(10).optional().default(5),
 * });
 *
 * export const addTaskTool = createMcpToolDefinition(
 *   'cofounder_add_task',
 *   'Add a new task to the queue',
 *   schema
 * );
 * ```
 */
export function createMcpToolDefinition<T extends z.ZodObject<any>>(
  name: string,
  description: string,
  schema: T
): { name: string; description: string; inputSchema: MCPInputSchema } {
  return {
    name,
    description,
    inputSchema: zodToMcpSchema(schema),
  };
}
