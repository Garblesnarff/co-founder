/**
 * Application-wide constants
 *
 * Centralizes magic numbers and configuration values used across the codebase.
 * Prefer using these constants over hardcoded values.
 */

// ============================================================================
// Pagination Defaults
// ============================================================================

/** Default limit for queue listing */
export const DEFAULT_QUEUE_LIMIT = 10;

/** Default limit for search results and learnings */
export const DEFAULT_SEARCH_LIMIT = 20;

/** Default limit for tool listing */
export const DEFAULT_TOOL_LIMIT = 50;

/** Default limit for issue listing */
export const DEFAULT_ISSUE_LIMIT = 10;

/** Default limit for completed tasks listing */
export const DEFAULT_COMPLETED_LIMIT = 10;

/** Default limit for decision listing */
export const DEFAULT_DECISION_LIMIT = 20;

/** Default limit for dispatch job listing */
export const DEFAULT_DISPATCH_LIMIT = 10;

/** Default limit for Slack messages */
export const DEFAULT_SLACK_MESSAGE_LIMIT = 20;

/** Maximum pagination limit across all tools */
export const MAX_PAGINATION_LIMIT = 100;

/** Maximum issue pagination limit */
export const MAX_ISSUE_LIMIT = 50;

// ============================================================================
// Business Metrics / Goals
// ============================================================================

/** Target number of subscribers for the goal */
export const TARGET_SUBSCRIBERS = 60;

/** Target weekly revenue (in dollars) */
export const TARGET_REVENUE_WEEKLY = 900;

/** Default subscriber count */
export const DEFAULT_SUBSCRIBER_COUNT = 0;

// ============================================================================
// Priority Configuration
// ============================================================================

/** Default task priority */
export const DEFAULT_PRIORITY = 5;

/** Minimum task priority */
export const MIN_PRIORITY = 0;

/** Maximum task priority */
export const MAX_PRIORITY = 10;

/** Minimum issue priority (issues use 1-10 range) */
export const MIN_ISSUE_PRIORITY = 1;

/** Maximum issue priority */
export const MAX_ISSUE_PRIORITY = 10;

// ============================================================================
// Dispatch Configuration
// ============================================================================

/** Default maximum dispatch chain depth */
export const DEFAULT_DISPATCH_MAX_DEPTH = 5;

/** Default dispatch timeout in milliseconds (5 minutes) */
export const DEFAULT_DISPATCH_TIMEOUT_MS = 300000;

/** Maximum length for dispatch result display */
export const DISPATCH_RESULT_MAX_LENGTH = 3000;

/** Truncation suffix for long results */
export const TRUNCATION_SUFFIX = '\n... (truncated)';

// ============================================================================
// Session Configuration
// ============================================================================

/** Session warning threshold in minutes (suggest break) */
export const SESSION_WARNING_MINUTES = 90;

/** Milliseconds in one minute */
export const MS_PER_MINUTE = 60 * 1000;

/** Milliseconds in one hour */
export const MS_PER_HOUR = 60 * 60 * 1000;

/** Milliseconds in one day */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ============================================================================
// Task Display
// ============================================================================

/** Maximum length for task preview in dispatch list */
export const TASK_PREVIEW_MAX_LENGTH = 100;

/** Ellipsis suffix for truncated text */
export const ELLIPSIS = '...';

// ============================================================================
// Database Configuration
// ============================================================================

/** Default founder state ID (singleton row) */
export const FOUNDER_STATE_ID = 1;

// ============================================================================
// Status Values
// ============================================================================

/** Default founder status */
export const DEFAULT_FOUNDER_STATUS = 'active';

/** Founder status options */
export const FOUNDER_STATUSES = ['active', 'blocked', 'paused'] as const;
export type FounderStatus = typeof FOUNDER_STATUSES[number];

/** Issue statuses */
export const ISSUE_STATUSES = ['open', 'in_progress', 'resolved', 'wontfix'] as const;
export type IssueStatusType = typeof ISSUE_STATUSES[number];

/** Dispatch statuses */
export const DISPATCH_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
export type DispatchStatusType = typeof DISPATCH_STATUSES[number];

// ============================================================================
// Project Types
// ============================================================================

/** Available project types */
export const PROJECT_TYPES = ['infinite_realms', 'infrastructure', 'sanctuary', 'other'] as const;
export type ProjectType = typeof PROJECT_TYPES[number];

// ============================================================================
// Agent Configuration
// ============================================================================

/** Available AI agents */
export const AI_AGENTS = ['claude', 'gemini', 'qwen', 'cline'] as const;
export type AgentType = typeof AI_AGENTS[number];

/** Available dispatch targets */
export const DISPATCH_TARGETS = ['hetzner', 'mac', 'cold_storage'] as const;
export type DispatchTargetType = typeof DISPATCH_TARGETS[number];

/** Agents available on Hetzner (local) */
export const HETZNER_AGENTS: AgentType[] = ['claude'];

/** Agents that require Mac target */
export const MAC_ONLY_AGENTS: AgentType[] = ['gemini', 'qwen', 'cline'];

// ============================================================================
// Note Types
// ============================================================================

/** Task note types */
export const NOTE_TYPES = ['progress', 'attempt', 'blocker', 'learning'] as const;
export type NoteType = typeof NOTE_TYPES[number];

/** Default note type */
export const DEFAULT_NOTE_TYPE: NoteType = 'progress';

// ============================================================================
// Energy Levels
// ============================================================================

/** Session energy levels */
export const ENERGY_LEVELS = ['high', 'medium', 'low'] as const;
export type EnergyLevel = typeof ENERGY_LEVELS[number];

// ============================================================================
// Issue Types
// ============================================================================

/** Issue types */
export const ISSUE_TYPES = ['bug', 'feature'] as const;
export type IssueType = typeof ISSUE_TYPES[number];

// ============================================================================
// Learning Categories
// ============================================================================

/** Learning categories */
export const LEARNING_CATEGORIES = ['tech', 'process', 'personal', 'workflow'] as const;
export type LearningCategoryType = typeof LEARNING_CATEGORIES[number];
