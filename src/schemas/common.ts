/**
 * Common Zod schemas used across multiple tools
 *
 * This file centralizes reusable validation schemas to ensure consistency
 * and reduce duplication across the codebase.
 */

import { z } from 'zod';

// ============================================================================
// IDs
// ============================================================================

/** Task ID - positive integer */
export const taskIdSchema = z.number().int().positive();

/** Issue ID - positive integer */
export const issueIdSchema = z.number().int().positive();

/** Dispatch job ID - positive integer */
export const dispatchJobIdSchema = z.number().int().positive();

/** Tool ID - positive integer */
export const toolIdSchema = z.number().int().positive();

/** Learning ID - positive integer */
export const learningIdSchema = z.number().int().positive();

/** Decision ID - positive integer */
export const decisionIdSchema = z.number().int().positive();

/** Session ID - positive integer */
export const sessionIdSchema = z.number().int().positive();

// ============================================================================
// Pagination
// ============================================================================

/** Standard pagination limit (1-100, optional) */
export const paginationLimitSchema = z.number().int().positive().max(100).optional();

/** Queue limit with default of 10 */
export const queueLimitSchema = z.number().int().positive().max(100).optional().default(10);

/** Search/learnings limit with default of 20 */
export const searchLimitSchema = z.number().int().positive().max(100).optional().default(20);

/** Tool list limit with default of 50 */
export const toolLimitSchema = z.number().int().positive().max(100).optional().default(50);

/** Issue list limit with default of 10, max 50 */
export const issueLimitSchema = z.number().int().positive().max(50).optional().default(10);

// ============================================================================
// Strings
// ============================================================================

/** Non-empty string (min 1 character) */
export const nonEmptyStringSchema = z.string().min(1);

/** Optional string */
export const optionalStringSchema = z.string().optional();

/** Nullable optional string */
export const nullableOptionalStringSchema = z.string().nullable().optional();

/** Search query (non-empty) */
export const searchQuerySchema = z.string().min(1);

// ============================================================================
// Enums
// ============================================================================

/** Project types */
export const projectEnum = z.enum(['infinite_realms', 'infrastructure', 'sanctuary', 'other']);
export type ProjectType = z.infer<typeof projectEnum>;

/** Optional project */
export const optionalProjectSchema = projectEnum.optional();
export const nullableProjectSchema = projectEnum.nullable().optional();

/** Issue types */
export const issueTypeEnum = z.enum(['bug', 'feature']);
export type IssueType = z.infer<typeof issueTypeEnum>;

/** Issue status */
export const issueStatusEnum = z.enum(['open', 'in_progress', 'resolved', 'wontfix']);
export type IssueStatus = z.infer<typeof issueStatusEnum>;

/** Dispatch status */
export const dispatchStatusEnum = z.enum(['pending', 'running', 'completed', 'failed']);
export type DispatchStatus = z.infer<typeof dispatchStatusEnum>;

/** AI agent types */
export const agentEnum = z.enum(['claude', 'gemini', 'qwen', 'cline']);
export type AgentType = z.infer<typeof agentEnum>;

/** Dispatch target machines */
export const dispatchTargetEnum = z.enum(['hetzner', 'mac', 'cold_storage']);
export type DispatchTarget = z.infer<typeof dispatchTargetEnum>;

/** Task note types */
export const noteTypeEnum = z.enum(['progress', 'attempt', 'blocker', 'learning']);
export type NoteType = z.infer<typeof noteTypeEnum>;

/** Energy levels for sessions */
export const energyLevelEnum = z.enum(['high', 'medium', 'low']);
export type EnergyLevel = z.infer<typeof energyLevelEnum>;

/** Learning categories */
export const learningCategoryEnum = z.enum(['tech', 'process', 'personal', 'workflow']);
export type LearningCategory = z.infer<typeof learningCategoryEnum>;

// ============================================================================
// Priority
// ============================================================================

/** Task priority (0-10, default 5) */
export const prioritySchema = z.number().int().min(0).max(10).optional().default(5);

/** Required priority (0-10, no default) */
export const requiredPrioritySchema = z.number().int().min(0).max(10);

/** Issue priority (1-10, default 5) - issues use 1-10 range */
export const issuePrioritySchema = z.number().int().min(1).max(10).optional().default(5);

// ============================================================================
// Arrays
// ============================================================================

/** Tags array (optional, defaults to empty) */
export const tagsSchema = z.array(z.string()).optional().default([]);

/** Required tags array */
export const requiredTagsSchema = z.array(z.string());

/** Blocked by task IDs (optional, defaults to empty) */
export const blockedBySchema = z.array(z.number().int().positive()).optional().default([]);

// ============================================================================
// Dates
// ============================================================================

/** ISO date string (optional) */
export const isoDateStringSchema = z.string().optional();

/** Due date - ISO string that can be null/cleared */
export const dueDateSchema = z.string().nullable().optional();

/** Since date filter - ISO string */
export const sinceDateSchema = z.string().optional();

// ============================================================================
// Numbers
// ============================================================================

/** Estimated minutes (optional, positive) */
export const estimatedMinutesSchema = z.number().int().positive().optional();

/** Nullable estimated minutes */
export const nullableEstimatedMinutesSchema = z.number().int().positive().nullable().optional();

/** Time taken in minutes (optional) */
export const timeTakenMinutesSchema = z.number().int().positive().optional();

/** Planned session duration in minutes */
export const plannedMinutesSchema = z.number().int().positive().optional();

// ============================================================================
// Composite Schemas
// ============================================================================

/** Common filter options for lists */
export const listFiltersSchema = z.object({
  project: optionalProjectSchema,
  tag: z.string().optional(),
  limit: paginationLimitSchema,
});

/** Common task update fields */
export const taskUpdateFieldsSchema = z.object({
  task: z.string().optional(),
  context: nullableOptionalStringSchema,
  estimatedMinutes: nullableEstimatedMinutesSchema,
  project: nullableProjectSchema,
  blockedBy: z.array(z.number()).optional(),
  dueDate: dueDateSchema,
  tags: z.array(z.string()).optional(),
});
