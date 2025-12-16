// Shared types between client and server

// ============================================
// User Types
// ============================================
export interface User {
  id: string;
  email: string;
  name: string;
  settings: UserSettings;
  gamificationStats: GamificationStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  aiProvider: 'openai' | 'ollama';
  notificationsEnabled: boolean;
  calendarSyncEnabled: boolean;
}

export interface GamificationStats {
  level: number;
  currentXp: number;
  totalXp: number;
  streak: number;
  longestStreak: number;
  achievements: string[];
  lastActivityDate: string;
}

// ============================================
// Employee Types
// ============================================
export interface Employee {
  id: string;
  userId: string;
  name: string;
  email?: string;
  role: string;
  team: string;
  startDate: Date;
  status: EmployeeStatus;
  avatarUrl?: string;
  strengths: string[];
  growthAreas: string[];
  developmentPlan?: DevelopmentPlan;
  skills: EmployeeSkill[];
  createdAt: Date;
  updatedAt: Date;
}

export type EmployeeStatus = 'active' | 'on_leave' | 'offboarding' | 'offboarded';

export interface DevelopmentPlan {
  shortTermGoals: Goal[];
  longTermGoals: Goal[];
  learningPath: string[];
  nextCareerStep?: string;
  notes: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
}

export interface EmployeeSkill {
  skillId: string;
  name: string;
  level: number;
  maxLevel: number;
  category: string;
}

// ============================================
// Event Types
// ============================================
export interface Event {
  id: string;
  userId: string;
  eventTypeId: string;
  title: string;
  description?: string;
  rawNotes?: string;
  startTime: Date;
  endTime: Date;
  outlookEventId?: string;
  extractedData?: ExtractedEventData;
  participants: EventParticipant[];
  actions: Action[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EventType {
  id: string;
  name: string;
  category: EventCategory;
  color: string;
  icon: string;
  defaultTemplate?: string;
}

export type EventCategory = 
  | 'one_on_one'
  | 'workshop'
  | 'team_meeting'
  | 'competence_forum'
  | 'planning'
  | 'review'
  | 'other';

export interface EventParticipant {
  employeeId: string;
  employee?: Employee;
  role: 'organizer' | 'required' | 'optional';
}

export interface ExtractedEventData {
  summary?: string;
  keyPoints: string[];
  decisions: string[];
  suggestedActions: SuggestedAction[];
}

export interface SuggestedAction {
  title: string;
  assignee?: string;
  dueDate?: string;
  priority?: ActionPriority;
  accepted: boolean;
}

// ============================================
// Action Types
// ============================================
export interface Action {
  id: string;
  userId: string;
  eventId?: string;
  employeeId?: string;
  delegatedToId?: string;
  responsibilityAreaId?: string;
  title: string;
  description?: string;
  status: ActionStatus;
  priority: ActionPriority;
  dueDate?: Date;
  xpValue: number;
  completedAt?: Date;
  source: ActionSource;
  attachments: Attachment[];
  links: ActionLink[];
  createdAt: Date;
  updatedAt: Date;
}

export type ActionStatus = 'pending' | 'in_progress' | 'delegated' | 'completed' | 'cancelled';
export type ActionPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ActionSource = 'manual' | 'ai_extracted' | 'calendar' | 'workshop' | 'one_on_one';

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface ActionLink {
  id: string;
  url: string;
  title?: string;
  description?: string;
}

// ============================================
// Responsibility Types
// ============================================
export interface Responsibility {
  id: string;
  roleType: ResponsibilityRole;
  name: string;
  areas: ResponsibilityArea[];
}

export type ResponsibilityRole = 'team_lead' | 'competence_leader' | 'department_manager';

export interface ResponsibilityArea {
  id: string;
  responsibilityId: string;
  category: string;
  name: string;
  description?: string;
  isMandatory: boolean;
  linkedActions?: Action[];
}

// ============================================
// Skill Tree Types
// ============================================
export interface SkillTree {
  id: string;
  name: string;
  description?: string;
  type: 'leadership' | 'employee';
  nodes: SkillNode[];
  connections: SkillConnection[];
}

export interface SkillNode {
  id: string;
  name: string;
  description?: string;
  category: string;
  level: number;
  maxLevel: number;
  xpRequired: number;
  unlocked: boolean;
  position: { x: number; y: number };
  prerequisites: string[];
  benefits: string[];
}

export interface SkillConnection {
  fromNodeId: string;
  toNodeId: string;
}

// ============================================
// Gamification Types
// ============================================
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  condition: AchievementCondition;
  unlockedAt?: Date;
}

export interface AchievementCondition {
  type: 'count' | 'streak' | 'milestone';
  target: number;
  metric: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  startDate: Date;
  endDate: Date;
  progress: number;
  target: number;
  completed: boolean;
}

// ============================================
// AI Types
// ============================================
export interface AIProvider {
  type: 'openai' | 'ollama';
  model: string;
}

export interface AIExtractionResult {
  actions: SuggestedAction[];
  summary: string;
  keyPoints: string[];
}

export interface AISuggestion {
  type: 'focus' | 'delegation' | 'message' | 'skip_meeting';
  title: string;
  description: string;
  actionable: boolean;
  data?: Record<string, unknown>;
}

// ============================================
// Calendar Types
// ============================================
export interface CalendarEvent {
  id: string;
  outlookId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  isOnline: boolean;
  importance: 'low' | 'normal' | 'high';
  hasAgenda: boolean;
}

export interface CalendarInsight {
  type: 'free_slot' | 'skip_suggestion' | 'prep_reminder' | 'overbooked';
  title: string;
  description: string;
  relatedEventId?: string;
  suggestedAction?: string;
}

// ============================================
// API Response Types
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

