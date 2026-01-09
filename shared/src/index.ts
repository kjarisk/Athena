// Shared types between client and server

// Re-export constants
export * from './constants';

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
  teamId?: string;
  workAreaId?: string;
  title: string;
  description?: string;
  status: ActionStatus;
  priority: ActionPriority;
  type: ActionType;
  isBlocker: boolean;
  riskLevel?: RiskLevel;
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
export type ActionType = 'action' | 'decision' | 'insight';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

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

// ============================================
// Meeting Template Types
// ============================================
export interface MeetingTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: EventCategory;
  agenda: AgendaItem[];
  checkpoints: string[];
  defaultDuration: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgendaItem {
  id: string;
  title: string;
  duration: number; // minutes
  description?: string;
  order: number;
}

// ============================================
// Weekly Report Types
// ============================================
export interface WeeklyReport {
  id: string;
  userId: string;
  weekStart: Date;
  weekEnd: Date;
  
  // Metrics
  actionsCompleted: number;
  actionsCreated: number;
  meetingHours: number;
  focusHours: number;
  decisionsCount: number;
  
  // Breakdowns
  breakdownByArea?: Record<string, AreaBreakdown>;
  breakdownByTeam?: Record<string, TeamBreakdown>;
  
  // AI content
  summary?: string;
  highlights: string[];
  challenges: string[];
  recommendations: string[];
  
  // Top items
  topAccomplishments?: AccomplishmentSummary[];
  decisionsLogged?: DecisionSummary[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface AreaBreakdown {
  name: string;
  actionsCompleted: number;
  hoursSpent: number;
}

export interface TeamBreakdown {
  name: string;
  actionsCompleted: number;
  hoursSpent: number;
  meetingsHeld: number;
}

export interface AccomplishmentSummary {
  title: string;
  completedAt: Date;
  xpEarned: number;
}

export interface DecisionSummary {
  title: string;
  description?: string;
  madeAt: Date;
  context?: string;
}

// ============================================
// Team Metrics Types
// ============================================
export interface TeamMetrics {
  id: string;
  teamId: string;
  date: Date;
  
  // Action metrics
  openActions: number;
  completedThisWeek: number;
  overdueActions: number;
  blockerCount: number;
  avgCompletionDays?: number;
  
  // Engagement metrics
  avgMood?: number;
  oneOnOnesConducted: number;
  teamMeetingsHeld: number;
  
  // Scores
  velocityScore?: number;
  healthScore?: number;
  engagementScore?: number;
}

export interface TeamInsights {
  team: {
    id: string;
    name: string;
  };
  metrics: TeamMetrics;
  
  // AI-generated insights
  discussionTopics: DiscussionTopic[];
  risks: TeamRisk[];
  recommendations: string[];
  
  // Per-role talking points
  talkingPoints: {
    productLead?: string[];
    productOwner?: string[];
    departmentManager?: string[];
  };
}

export interface DiscussionTopic {
  topic: string;
  priority: 'high' | 'medium' | 'low';
  context?: string;
  relatedEmployeeId?: string;
  relatedActionId?: string;
}

export interface TeamRisk {
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  mitigation?: string;
}

// ============================================
// Employee Report Types
// ============================================
export type ReportPeriod = 'quarterly' | 'yearly';

export interface EmployeeReport {
  id: string;
  employeeId: string;
  reportType: ReportPeriod;
  periodStart: Date;
  periodEnd: Date;
  
  // Metrics
  actionsCompleted: number;
  oneOnOnesCount: number;
  avgMood?: number;
  
  // Changes
  competencyChanges?: Record<string, { from: number; to: number }>;
  skillsGained: string[];
  
  // Feedback
  feedbackSummary?: string;
  strengths: string[];
  growthAreas: string[];
  
  // AI content
  narrative?: string;
  recommendations: string[];
  
  createdAt: Date;
}

// ============================================
// Statistics Types
// ============================================
export interface DashboardStatistics {
  // Action stats
  totalActions: number;
  completedActions: number;
  pendingActions: number;
  overdueActions: number;
  blockers: number;
  
  // Decision stats
  decisionsThisWeek: number;
  decisionsThisMonth: number;
  
  // Meeting stats
  meetingsThisWeek: number;
  meetingHoursThisWeek: number;
  oneOnOnesThisWeek: number;
  
  // Team stats
  teamsManaged: number;
  employeesManaged: number;
  
  // Velocity
  weeklyVelocity: number; // actions completed / created
  monthlyTrend: 'up' | 'down' | 'stable';
  
  // Breakdowns
  actionsByTeam: Record<string, number>;
  actionsByArea: Record<string, number>;
  actionsByEmployee: Record<string, number>;
}

export interface TimeAllocation {
  areaId: string;
  areaName: string;
  hoursThisWeek: number;
  percentageOfTotal: number;
  trend: 'up' | 'down' | 'stable';
}

