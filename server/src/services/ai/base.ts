/**
 * Shared types and base class for AI service
 */
import OpenAI from 'openai';

export type AIProviderType = 'openai' | 'ollama';

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

export interface ExtractionResult {
  summary: string;
  keyPoints: string[];
  actions: {
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
  }[];
}

export interface FocusSuggestion {
  type: 'focus' | 'delegation' | 'skip_meeting';
  title: string;
  description: string;
  priority: number;
}

export interface MeetingPrep {
  summary: string;
  keyTopics: string[];
  previousFollowUps: string[];
  suggestedQuestions: string[];
  context: string;
}

export interface DailyBriefing {
  greeting: string;
  priorities: { title: string; reason: string; type: string }[];
  teamInsights: { title: string; description: string; type: string }[];
  suggestions: { title: string; description: string; actionable: boolean }[];
}

export interface OneOnOneAnalysis {
  actions: { title: string; priority: string; description?: string }[];
  insights: { type: string; content: string }[];
  competencySuggestions: { name: string; category: string; change: number; reason: string }[];
  developmentNotes: string[];
  mood: number;
  keyTakeaways: string[];
}

export interface CompetencyAnalysis {
  competencies: { 
    name: string; 
    category: string; 
    suggestedRating: number; 
    currentRating: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    evidence: string[];
  }[];
  summary: string;
  focusAreas: string[];
}

export interface DevelopmentPlan {
  summary: string;
  goals: {
    id: string;
    title: string;
    description: string;
    category: 'skill' | 'career' | 'project' | 'behavior';
    priority: 'high' | 'medium' | 'low';
    timeframe: string;
    milestones: { title: string; targetDate: string; completed: boolean }[];
    suggestedActions: string[];
    successCriteria: string[];
  }[];
  quickWins: string[];
  longTermVision: string;
}

export interface TimeManagementAnalysis {
  summary: string;
  insights: Array<{
    type: 'warning' | 'info' | 'success';
    category: string;
    message: string;
  }>;
  suggestions: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  timeAllocation: Array<{
    workArea: string;
    hours: number;
    percentage: number;
  }>;
}

/**
 * Base AI Provider with common functionality for calling OpenAI or Ollama
 */
export class AIProviderBase {
  protected provider: AIProviderType;
  protected openai: OpenAI | null = null;
  protected ollamaBaseUrl: string;
  protected ollamaModel: string;

  constructor(provider: AIProviderType = 'openai', ollamaModel: string = 'mistral:latest') {
    this.provider = provider;
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.ollamaModel = ollamaModel;

    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * List available Ollama models
   */
  static async listOllamaModels(baseUrl?: string): Promise<OllamaModel[]> {
    const url = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    try {
      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      throw new Error('Could not connect to Ollama. Make sure Ollama is running.');
    }
  }

  /**
   * Build system prompt with user's AI context
   */
  protected buildSystemPrompt(basePrompt: string, userContext?: string): string {
    if (!userContext || userContext.trim() === '') {
      return basePrompt;
    }
    
    return `${basePrompt}

USER'S LEADERSHIP PHILOSOPHY AND PREFERENCES:
${userContext}

Please consider these preferences when providing your response.`;
  }

  protected async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return response.choices[0]?.message?.content || '';
  }

  protected async callOllama(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ollama API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          model: this.ollamaModel,
          url: this.ollamaBaseUrl
        });
        throw new Error(`Ollama API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data: any = await response.json();
      return data.response || '';
    } catch (error: any) {
      if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.ollamaBaseUrl}. Is Ollama running? Try: ollama serve`);
      }
      throw error;
    }
  }

  protected async call(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.provider === 'openai') {
      return this.callOpenAI(systemPrompt, userPrompt);
    }
    return this.callOllama(systemPrompt, userPrompt);
  }

  /**
   * Parse JSON from AI response (handles markdown code blocks)
   */
  protected parseJsonResponse<T>(response: string, fallback: T): T {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }

  protected getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
}
