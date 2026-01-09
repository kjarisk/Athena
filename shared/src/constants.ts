/**
 * Shared constants between client and server
 * Centralizes color schemes, role definitions, and other shared values
 */

// ============================================
// Role Colors & Labels
// ============================================

/**
 * Colors for different team roles
 * Uses the Ori + Hades inspired aesthetic with warm, ethereal colors
 */
export const ROLE_COLORS: Record<string, string> = {
  PROJECT_LEADER: '#A67C93', // Mauve (external leadership)
  PRODUCT_OWNER: '#7EB8C9',  // Ocean blue (external stakeholder)
  TEAM_LEAD: '#D4A574',      // Warm sand/gold
  QA: '#CD7F6E',             // Terracotta
  REFINEMENT_LEADER: '#C9A86C', // Honey gold (special role)
  FRONTEND: '#7BA087',       // Forest green
  BACKEND: '#8FBC8F',        // Light sage
  FULLSTACK: '#9B7BB8',      // Soft purple
  DESIGNER: '#E8B86D',       // Golden amber
  DEVOPS: '#DAA520',         // Goldenrod
  OTHER: '#9CA89D'           // Neutral sage
};

/**
 * Human-readable labels for team roles
 */
export const ROLE_LABELS: Record<string, string> = {
  PROJECT_LEADER: 'Project Leader',
  PRODUCT_OWNER: 'Product Owner',
  TEAM_LEAD: 'Team Lead',
  QA: 'QA',
  REFINEMENT_LEADER: 'Refinement Leader',
  FRONTEND: 'Frontend',
  BACKEND: 'Backend',
  FULLSTACK: 'Full Stack',
  DESIGNER: 'Designer',
  DEVOPS: 'DevOps',
  OTHER: 'Other'
};

/**
 * Order for displaying roles (hierarchical order)
 * Project Leader > Product Owner > Team Lead > QA > Refinement Leader > Developers
 */
export const ROLE_ORDER = [
  'PROJECT_LEADER',
  'PRODUCT_OWNER',
  'TEAM_LEAD',
  'QA',
  'REFINEMENT_LEADER',
  'FRONTEND',
  'BACKEND',
  'FULLSTACK',
  'DESIGNER',
  'DEVOPS',
  'OTHER'
];

/**
 * Roles that are typically external stakeholders (not part of the core team)
 */
export const EXTERNAL_ROLES = ['PROJECT_LEADER', 'PRODUCT_OWNER'];

/**
 * Roles that can be assigned as a secondary role
 */
export const SECONDARY_ROLES = ['REFINEMENT_LEADER', 'QA'];

// ============================================
// Job Title Suggestions
// ============================================

/**
 * Predefined job titles for employee roles with autocomplete
 * Organized by category for easier selection
 */
export const JOB_TITLE_SUGGESTIONS = [
  // Frontend
  'Junior Frontend Developer',
  'Mid-Level Frontend Developer',
  'Senior Frontend Developer',
  'Lead Frontend Developer',
  // Backend  
  'Junior Backend Developer',
  'Mid-Level Backend Developer',
  'Senior Backend Developer',
  'Lead Backend Developer',
  // Full Stack
  'Junior Full Stack Developer',
  'Mid-Level Full Stack Developer',
  'Senior Full Stack Developer',
  'Lead Full Stack Developer',
  // Design
  'Junior Designer',
  'Mid-Level Designer',
  'Senior Designer',
  'Lead Designer',
  'UX Designer',
  'UI Designer',
  'Product Designer',
  // QA
  'Junior QA Engineer',
  'Mid-Level QA Engineer',
  'Senior QA Engineer',
  'QA Lead',
  // DevOps
  'Junior DevOps Engineer',
  'Mid-Level DevOps Engineer',
  'Senior DevOps Engineer',
  'DevOps Lead',
  'SRE Engineer',
  'Platform Engineer',
  // Leadership
  'Team Lead',
  'Tech Lead',
  'Engineering Manager',
  'Architect',
  'Principal Engineer'
];

// ============================================
// Status Colors
// ============================================

/**
 * Colors for different action/task statuses
 */
export const STATUS_COLORS: Record<string, string> = {
  pending: '#E8B86D',         // Golden amber
  in_progress: '#7BA087',     // Forest green
  delegated: '#9B7BB8',       // Soft purple
  completed: '#7EB8C9',       // Ocean blue
  cancelled: '#9CA89D',       // Neutral sage
  blocked: '#CD7F6E'          // Terracotta
};

/**
 * Colors for priority levels
 */
export const PRIORITY_COLORS: Record<string, string> = {
  low: '#9CA89D',             // Neutral sage
  medium: '#E8B86D',          // Golden amber
  high: '#D4A574',            // Warm sand/gold
  urgent: '#CD7F6E'           // Terracotta (alert)
};

// ============================================
// Competency Categories
// ============================================

/**
 * Colors for competency categories on radar charts
 */
export const COMPETENCY_CATEGORY_COLORS: Record<string, string> = {
  SOFT_SKILL: '#7BA087',      // Forest green
  TECHNICAL: '#7EB8C9',       // Ocean blue
  LEADERSHIP: '#D4A574',      // Warm sand/gold
  DOMAIN: '#9B7BB8'           // Soft purple
};

/**
 * Default competencies for employee assessment
 */
export const DEFAULT_COMPETENCIES = [
  { name: 'Communication', category: 'SOFT_SKILL' },
  { name: 'Problem Solving', category: 'SOFT_SKILL' },
  { name: 'Collaboration', category: 'SOFT_SKILL' },
  { name: 'Initiative', category: 'SOFT_SKILL' },
  { name: 'Adaptability', category: 'SOFT_SKILL' },
  { name: 'Leadership', category: 'LEADERSHIP' },
  { name: 'Technical Skills', category: 'TECHNICAL' },
  { name: 'Time Management', category: 'SOFT_SKILL' },
  { name: 'Creativity', category: 'SOFT_SKILL' },
  { name: 'Accountability', category: 'LEADERSHIP' }
];

// ============================================
// Time & Date Constants
// ============================================

/**
 * Working hours for scheduling calculations
 */
export const WORKING_HOURS = {
  start: 9,   // 9:00 AM
  end: 17,    // 5:00 PM
  hoursPerDay: 8
};

/**
 * Days of the week (for cadence rules)
 */
export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday'
];

// ============================================
// AI Constants
// ============================================

/**
 * Default AI models
 */
export const DEFAULT_AI_MODELS = {
  openai: 'gpt-4-turbo-preview',
  ollama: 'mistral:latest'
};

/**
 * AI analysis confidence levels
 */
export const CONFIDENCE_LEVELS = {
  high: 0.8,
  medium: 0.5,
  low: 0.3
};
