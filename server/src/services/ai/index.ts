/**
 * AI Service - Main Entry Point
 * 
 * This module provides a unified AIService class that combines all AI features.
 * For new code, consider importing the specific service modules directly:
 * - MeetingAIService - Note extraction, meeting prep, message generation
 * - ProductivityAIService - Daily briefings, focus suggestions, time management
 * - EmployeeAIService - 1:1 analysis, competency assessment, development plans
 */

// Re-export types
export * from './base';

// Re-export individual services for modular usage
export { MeetingAIService } from './meetingAI';
export { ProductivityAIService } from './productivityAI';
export { EmployeeAIService } from './employeeAI';

// Import for combined service
import { 
  AIProviderBase, 
  AIProviderType, 
  OllamaModel,
  ExtractionResult, 
  FocusSuggestion, 
  MeetingPrep, 
  DailyBriefing,
  OneOnOneAnalysis,
  CompetencyAnalysis,
  DevelopmentPlan,
  TimeManagementAnalysis
} from './base';
import { MeetingAIService } from './meetingAI';
import { ProductivityAIService } from './productivityAI';
import { EmployeeAIService } from './employeeAI';

/**
 * Unified AI Service that combines all AI capabilities
 * Maintains backward compatibility with existing code
 */
export class AIService {
  private meetingAI: MeetingAIService;
  private productivityAI: ProductivityAIService;
  private employeeAI: EmployeeAIService;

  constructor(provider: AIProviderType = 'openai', ollamaModel: string = 'mistral:latest') {
    this.meetingAI = new MeetingAIService(provider, ollamaModel);
    this.productivityAI = new ProductivityAIService(provider, ollamaModel);
    this.employeeAI = new EmployeeAIService(provider, ollamaModel);
  }

  // ============================================
  // Static Methods
  // ============================================

  /**
   * List available Ollama models
   */
  static async listOllamaModels(baseUrl?: string): Promise<OllamaModel[]> {
    return AIProviderBase.listOllamaModels(baseUrl);
  }

  // ============================================
  // Meeting & Extraction Methods
  // ============================================

  async extractActions(notes: string, context?: string, userContext?: string): Promise<ExtractionResult> {
    return this.meetingAI.extractActions(notes, context, userContext);
  }

  async prepareMeeting(event: any, userContext?: string): Promise<MeetingPrep> {
    return this.meetingAI.prepareMeeting(event, userContext);
  }

  async generateMessage(
    type: 'followup' | 'feedback' | 'delegation' | 'reminder',
    context: string,
    tone: 'formal' | 'casual' | 'friendly' = 'friendly',
    userContext?: string
  ): Promise<string> {
    return this.meetingAI.generateMessage(type, context, tone, userContext);
  }

  async summarize(text: string, format: 'bullets' | 'paragraph' = 'bullets'): Promise<string> {
    return this.meetingAI.summarize(text, format);
  }

  // ============================================
  // Productivity & Focus Methods
  // ============================================

  async generateFocusSuggestions(data: {
    overdueActions: any[];
    upcomingEvents: any[];
    urgentActions: any[];
  }, userContext?: string): Promise<FocusSuggestion[]> {
    return this.productivityAI.generateFocusSuggestions(data, userContext);
  }

  async generateDailyBriefing(data: {
    userName: string;
    overdueActions: any[];
    todayEvents: any[];
    dueItems: any[];
    recentActivity: any[];
    actionStats: any;
  }, userContext?: string): Promise<DailyBriefing> {
    return this.productivityAI.generateDailyBriefing(data, userContext);
  }

  async analyzeTimeManagement(data: {
    events: Array<{
      title: string;
      startTime: Date;
      endTime: Date;
      workAreaId?: string | null;
      workAreaName?: string;
    }>;
    actions: Array<{
      title: string;
      priority: string;
      dueDate?: Date | null;
      status: string;
      workAreaName?: string;
    }>;
    workAreas: Array<{
      name: string;
      description?: string;
    }>;
  }, userContext?: string): Promise<TimeManagementAnalysis> {
    return this.productivityAI.analyzeTimeManagement(data, userContext);
  }

  // ============================================
  // Employee Development Methods
  // ============================================

  async analyzeOneOnOne(notes: string, employeeContext?: {
    name: string;
    role: string;
    recentTopics?: string[];
    strengths?: string[];
    growthAreas?: string[];
  }): Promise<OneOnOneAnalysis> {
    return this.employeeAI.analyzeOneOnOne(notes, employeeContext);
  }

  async analyzeCompetencies(employeeData: {
    name: string;
    role: string;
    strengths: string[];
    growthAreas: string[];
    recentOneOnOnes: { notes: string; mood: number; topics: string[] }[];
    currentCompetencies: { name: string; rating: number; category: string }[];
  }, userContext?: string): Promise<CompetencyAnalysis> {
    return this.employeeAI.analyzeCompetencies(employeeData, userContext);
  }

  async generateDevelopmentPlan(employeeData: {
    name: string;
    role: string;
    strengths: string[];
    growthAreas: string[];
    competencies: { name: string; rating: number; category: string }[];
    recentOneOnOnes: { notes: string; topics: string[]; followUps: string[] }[];
    openActions: { title: string; status: string; priority: string }[];
    tenure: number;
  }, userContext?: string): Promise<DevelopmentPlan> {
    return this.employeeAI.generateDevelopmentPlan(employeeData, userContext);
  }
}
