import { z } from 'zod';
import { addTool, getToolByName, updateTool } from '../../services/toolchain-service.js';
import { createToolHandler } from '../../lib/tool-handler.js';
import { createMcpToolDefinition } from '../../lib/zod-to-mcp.js';
import { nonEmptyStringSchema, optionalStringSchema, tagsSchema } from '../../schemas/common.js';

// Define schema once with descriptions for MCP
const inputSchema = z.object({
  name: nonEmptyStringSchema.describe('Tool name (e.g., "ImageFX", "Grok Imagine", "Whisk")'),
  category: nonEmptyStringSchema.describe('Category: image-gen, video-gen, audio, coding, research, etc.'),
  purpose: optionalStringSchema.describe('What the tool does'),
  cost: optionalStringSchema.describe('Pricing: "free", "$8/mo", "$0.14/image", etc.'),
  whenToUse: optionalStringSchema.describe('Conditions/triggers for when to use this tool'),
  limitations: optionalStringSchema.describe('What it can\'t do or common failures'),
  url: optionalStringSchema.describe('Link to the tool'),
  workflowNotes: optionalStringSchema.describe('How it fits into larger pipelines with other tools'),
  project: optionalStringSchema.describe('Which project uses this tool (optional)'),
  inputFormat: optionalStringSchema.describe('What it accepts (text prompt, image, URL, etc.)'),
  outputFormat: optionalStringSchema.describe('What it produces (PNG, MP4, text, etc.)'),
  qualityNotes: optionalStringSchema.describe('Quality observations ("best for X", "struggles with Y")'),
  exampleUsage: optionalStringSchema.describe('Sample prompts/commands that work well'),
  fallbackTool: optionalStringSchema.describe('What to use if this tool fails'),
  authMethod: optionalStringSchema.describe('How to authenticate (API key, browser, OAuth)'),
  repoPath: optionalStringSchema.describe('For codebases: directory path on server (e.g., "/var/www/co-founder")'),
  tags: tagsSchema.describe('Tags for filtering (optional)'),
});

// Generate MCP tool definition from Zod schema
export const cofounderAddToolTool = createMcpToolDefinition(
  'cofounder_add_tool',
  'Add a tool to the toolchain. If a tool with the same name exists, updates it instead.',
  inputSchema
);

// Handler with automatic auth check and schema validation
export const handleCofounderAddTool = createToolHandler(
  inputSchema,
  async (input, auth) => {
    // Check if tool already exists
    const existing = await getToolByName(input.name);

    if (existing) {
      // Update existing tool
      const updated = await updateTool(existing.id, {
        category: input.category,
        purpose: input.purpose || null,
        cost: input.cost || null,
        whenToUse: input.whenToUse || null,
        limitations: input.limitations || null,
        url: input.url || null,
        workflowNotes: input.workflowNotes || null,
        project: input.project || null,
        inputFormat: input.inputFormat || null,
        outputFormat: input.outputFormat || null,
        qualityNotes: input.qualityNotes || null,
        exampleUsage: input.exampleUsage || null,
        fallbackTool: input.fallbackTool || null,
        authMethod: input.authMethod || null,
        repoPath: input.repoPath || null,
        tags: input.tags,
      });

      return {
        action: 'updated',
        tool: updated,
        message: `Tool "${input.name}" updated successfully.`,
      };
    }

    // Create new tool
    const tool = await addTool({
      name: input.name,
      category: input.category,
      purpose: input.purpose,
      cost: input.cost,
      whenToUse: input.whenToUse,
      limitations: input.limitations,
      url: input.url,
      workflowNotes: input.workflowNotes,
      project: input.project,
      inputFormat: input.inputFormat,
      outputFormat: input.outputFormat,
      qualityNotes: input.qualityNotes,
      exampleUsage: input.exampleUsage,
      fallbackTool: input.fallbackTool,
      authMethod: input.authMethod,
      repoPath: input.repoPath,
      tags: input.tags,
      createdBy: auth.userId || 'ai',
    });

    return {
      action: 'created',
      tool,
      message: `Tool "${input.name}" added to toolchain.`,
    };
  }
);
