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
  TEAM_LEAD: '#D4A574',       // Warm sand/gold
  FRONTEND: '#7BA087',        // Forest green
  BACKEND: '#8FBC8F',         // Light sage
  DESIGNER: '#E8B86D',        // Golden amber
  QA: '#CD7F6E',              // Terracotta
  DEVOPS: '#DAA520',          // Goldenrod
  FULLSTACK: '#9B7BB8',       // Soft purple
  PRODUCT: '#7EB8C9',         // Ocean blue
  DATA: '#C9A86C',            // Honey gold
  SECURITY: '#B87A7A',        // Dusty rose
  MOBILE: '#6B9B8A',          // Teal green
  ARCHITECT: '#A67C93',       // Mauve
  MANAGER: '#D4A574',         // Warm sand/gold (same as lead)
  INTERN: '#B5C4A8',          // Pale green
  OTHER: '#9CA89D'            // Neutral sage
};

/**
 * Human-readable labels for team roles
 */
export const ROLE_LABELS: Record<string, string> = {
  TEAM_LEAD: 'Team Lead',
  FRONTEND: 'Frontend',
  BACKEND: 'Backend',
  DESIGNER: 'Designer',
  QA: 'QA',
  DEVOPS: 'DevOps',
  FULLSTACK: 'Full Stack',
  PRODUCT: 'Product',
  DATA: 'Data',
  SECURITY: 'Security',
  MOBILE: 'Mobile',
  ARCHITECT: 'Architect',
  MANAGER: 'Manager',
  INTERN: 'Intern',
  OTHER: 'Other'
};

/**
 * Order for displaying roles (most senior first)
 */
export const ROLE_ORDER = [
  'TEAM_LEAD',
  'MANAGER',
  'ARCHITECT',
  'FRONTEND',
  'BACKEND',
  'FULLSTACK',
  'MOBILE',
  'DESIGNER',
  'PRODUCT',
  'DATA',
  'SECURITY',
  'QA',
  'DEVOPS',
  'INTERN',
  'OTHER'
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
