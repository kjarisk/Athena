/**
 * AI Service - Employee Development Features
 * Handles 1:1 analysis, competency assessment, and development planning
 */
import { 
  AIProviderBase, 
  AIProviderType, 
  OneOnOneAnalysis, 
  CompetencyAnalysis, 
  DevelopmentPlan 
} from './base';

export class EmployeeAIService extends AIProviderBase {
  constructor(provider: AIProviderType = 'openai', ollamaModel: string = 'mistral:latest') {
    super(provider, ollamaModel);
  }

  /**
   * Analyze 1:1 meeting notes to extract insights and actions
   */
  async analyzeOneOnOne(notes: string, employeeContext?: {
    name: string;
    role: string;
    recentTopics?: string[];
    strengths?: string[];
    growthAreas?: string[];
  }): Promise<OneOnOneAnalysis> {
    const systemPrompt = `You are analyzing a 1:1 meeting between a manager and their team member.
Your task is to extract valuable insights from the meeting notes.

Please analyze and provide:
1. Action items that should be created (with title, priority: low/medium/high/urgent, and optional description)
2. Key insights about the employee (type: mood|concern|win|growth|feedback, content)
3. Competency observations (suggest rating changes: +1 or -1 for skills like Communication, Problem Solving, Initiative, etc.)
4. Development notes (things to add to their development plan)
5. Overall mood assessment (1-5 scale, 5 being most positive)
6. Key takeaways from the conversation

Respond in JSON format:
{
  "actions": [{"title": "string", "priority": "low|medium|high|urgent", "description": "optional"}],
  "insights": [{"type": "mood|concern|win|growth|feedback", "content": "string"}],
  "competencySuggestions": [{"name": "Communication|Problem Solving|Collaboration|Initiative|Adaptability|Leadership", "category": "SOFT_SKILL", "change": 1 or -1, "reason": "why"}],
  "developmentNotes": ["string"],
  "mood": 1-5,
  "keyTakeaways": ["string"]
}`;

    let contextInfo = '';
    if (employeeContext) {
      contextInfo = `
Employee: ${employeeContext.name}
Role: ${employeeContext.role}
Recent discussion topics: ${employeeContext.recentTopics?.join(', ') || 'None'}
Known strengths: ${employeeContext.strengths?.join(', ') || 'Not documented'}
Growth areas: ${employeeContext.growthAreas?.join(', ') || 'Not documented'}
`;
    }

    const userPrompt = `${contextInfo}

1:1 Meeting Notes:
${notes}

Please analyze these notes:`;

    try {
      const response = await this.call(systemPrompt, userPrompt);
      const parsed = this.parseJsonResponse(response, {
        actions: [],
        insights: [],
        competencySuggestions: [],
        developmentNotes: [],
        mood: 3,
        keyTakeaways: []
      });
      
      return {
        actions: parsed.actions || [],
        insights: parsed.insights || [],
        competencySuggestions: parsed.competencySuggestions || [],
        developmentNotes: parsed.developmentNotes || [],
        mood: parsed.mood || 3,
        keyTakeaways: parsed.keyTakeaways || []
      };
    } catch (error) {
      console.error('AI 1:1 analysis error:', error);
      return {
        actions: [],
        insights: [],
        competencySuggestions: [],
        developmentNotes: [],
        mood: 3,
        keyTakeaways: []
      };
    }
  }

  /**
   * Analyze employee competencies based on available data
   */
  async analyzeCompetencies(employeeData: {
    name: string;
    role: string;
    strengths: string[];
    growthAreas: string[];
    recentOneOnOnes: { notes: string; mood: number; topics: string[] }[];
    currentCompetencies: { name: string; rating: number; category: string }[];
  }, userContext?: string): Promise<CompetencyAnalysis> {
    const basePrompt = `You are an expert at analyzing employee competencies based on available data.
Your task is to:
1. Analyze the employee's strengths, growth areas, and recent 1:1 discussions
2. Suggest competency ratings (1-5 scale) for key leadership and technical skills
3. Provide reasoning and evidence for each rating
4. Identify focus areas for development

Core competencies to assess:
- Communication: How well they express ideas and listen to others
- Problem Solving: Analytical thinking and solution finding
- Collaboration: Working effectively with team members
- Initiative: Taking proactive action without being asked
- Adaptability: Handling change and learning new things
- Leadership: Influencing and guiding others
- Technical Skills: Role-specific technical abilities
- Time Management: Prioritizing and meeting deadlines
- Creativity: Innovative thinking and approach
- Accountability: Taking ownership of work and results

Respond in JSON format:
{
  "competencies": [
    {
      "name": "Communication",
      "category": "SOFT_SKILL",
      "suggestedRating": 4,
      "currentRating": 3,
      "confidence": "high|medium|low",
      "reasoning": "Why this rating",
      "evidence": ["Specific example 1", "Specific example 2"]
    }
  ],
  "summary": "Overall assessment summary",
  "focusAreas": ["Area 1 to focus on", "Area 2"]
}`;

    const systemPrompt = this.buildSystemPrompt(basePrompt, userContext);

    const oneOnOneContext = employeeData.recentOneOnOnes.slice(0, 5).map(o => 
      `- Topics: ${o.topics.join(', ')} | Mood: ${o.mood}/5 | Notes: ${o.notes.substring(0, 200)}...`
    ).join('\n') || 'No recent 1:1s';

    const currentCompetencies = employeeData.currentCompetencies.length > 0
      ? employeeData.currentCompetencies.map(c => `- ${c.name}: ${c.rating}/5`).join('\n')
      : 'No existing competency ratings';

    const userPrompt = `
Employee: ${employeeData.name}
Role: ${employeeData.role}

STRENGTHS:
${employeeData.strengths.join(', ') || 'Not documented'}

GROWTH AREAS:
${employeeData.growthAreas.join(', ') || 'Not documented'}

CURRENT COMPETENCY RATINGS:
${currentCompetencies}

RECENT 1:1 MEETINGS:
${oneOnOneContext}

Please analyze and provide competency ratings with reasoning:`;

    try {
      const response = await this.call(systemPrompt, userPrompt);
      return this.parseJsonResponse(response, { 
        competencies: [], 
        summary: '', 
        focusAreas: [] 
      });
    } catch (error) {
      console.error('AI competency analysis error:', error);
      return { competencies: [], summary: '', focusAreas: [] };
    }
  }

  /**
   * Generate a comprehensive development plan for an employee
   */
  async generateDevelopmentPlan(employeeData: {
    name: string;
    role: string;
    strengths: string[];
    growthAreas: string[];
    competencies: { name: string; rating: number; category: string }[];
    recentOneOnOnes: { notes: string; topics: string[]; followUps: string[] }[];
    openActions: { title: string; status: string; priority: string }[];
    tenure: number; // months since start
  }, userContext?: string): Promise<DevelopmentPlan> {
    const basePrompt = `You are a career development coach helping create a personalized development plan.
Based on the employee's profile, competencies, and recent discussions, create an actionable plan.

The plan should:
1. Address growth areas while building on strengths
2. Include both quick wins and longer-term goals
3. Be specific and measurable
4. Consider their role and career trajectory

Respond in JSON format:
{
  "summary": "Brief overview of the development focus",
  "goals": [
    {
      "id": "goal-1",
      "title": "Goal title",
      "description": "Detailed description",
      "category": "skill|career|project|behavior",
      "priority": "high|medium|low",
      "timeframe": "3 months|6 months|1 year",
      "milestones": [
        {"title": "Milestone 1", "targetDate": "2024-03-01", "completed": false}
      ],
      "suggestedActions": ["Action to take"],
      "successCriteria": ["How to measure success"]
    }
  ],
  "quickWins": ["Easy wins to start with"],
  "longTermVision": "Where they could be in 1-2 years"
}`;

    const systemPrompt = this.buildSystemPrompt(basePrompt, userContext);

    const competencyInfo = employeeData.competencies.length > 0
      ? employeeData.competencies.map(c => `- ${c.name}: ${c.rating}/5`).join('\n')
      : 'No competency data';

    const oneOnOneInsights = employeeData.recentOneOnOnes.slice(0, 3).map(o =>
      `Topics: ${o.topics.join(', ')} | Follow-ups: ${o.followUps?.join(', ') || 'None'}`
    ).join('\n') || 'No recent 1:1s';

    const openActionsInfo = employeeData.openActions.slice(0, 5).map(a =>
      `- ${a.title} [${a.priority}]`
    ).join('\n') || 'No open actions';

    const userPrompt = `
Employee: ${employeeData.name}
Role: ${employeeData.role}
Tenure: ${employeeData.tenure} months

STRENGTHS:
${employeeData.strengths.join(', ') || 'Not documented'}

GROWTH AREAS:
${employeeData.growthAreas.join(', ') || 'Not documented'}

COMPETENCY RATINGS:
${competencyInfo}

RECENT 1:1 INSIGHTS:
${oneOnOneInsights}

CURRENT OPEN ACTIONS:
${openActionsInfo}

Please create a comprehensive development plan:`;

    try {
      const response = await this.call(systemPrompt, userPrompt);
      const parsed = this.parseJsonResponse<DevelopmentPlan>(response, { 
        summary: '', 
        goals: [], 
        quickWins: [], 
        longTermVision: '' 
      });
      
      return {
        summary: parsed.summary || '',
        goals: (parsed.goals || []).map((g: any, i: number) => ({
          ...g,
          id: g.id || `goal-${i + 1}`
        })),
        quickWins: parsed.quickWins || [],
        longTermVision: parsed.longTermVision || ''
      };
    } catch (error) {
      console.error('AI development plan error:', error);
      return { summary: '', goals: [], quickWins: [], longTermVision: '' };
    }
  }
}
