import OpenAI from 'openai';

type AIProviderType = 'openai' | 'ollama';

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

interface ExtractionResult {
  summary: string;
  keyPoints: string[];
  actions: {
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string;
  }[];
}

interface FocusSuggestion {
  type: 'focus' | 'delegation' | 'skip_meeting';
  title: string;
  description: string;
  priority: number;
}

interface MeetingPrep {
  summary: string;
  keyTopics: string[];
  previousFollowUps: string[];
  suggestedQuestions: string[];
  context: string;
}

interface DailyBriefing {
  greeting: string;
  priorities: { title: string; reason: string; type: string }[];
  teamInsights: { title: string; description: string; type: string }[];
  suggestions: { title: string; description: string; actionable: boolean }[];
}

export class AIService {
  private provider: AIProviderType;
  private openai: OpenAI | null = null;
  private ollamaBaseUrl: string;
  private ollamaModel: string;

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

  // List available Ollama models
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

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      throw new Error('Could not connect to Ollama. Make sure Ollama is running.');
    }
  }

  // Build system prompt with user's AI context
  private buildSystemPrompt(basePrompt: string, userContext?: string): string {
    if (!userContext || userContext.trim() === '') {
      return basePrompt;
    }
    
    return `${basePrompt}

USER'S LEADERSHIP PHILOSOPHY AND PREFERENCES:
${userContext}

Please consider these preferences when providing your response.`;
  }

  private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
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

  private async callOllama(systemPrompt: string, userPrompt: string): Promise<string> {
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

      const data = await response.json();
      return data.response || '';
    } catch (error: any) {
      if (error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.ollamaBaseUrl}. Is Ollama running? Try: ollama serve`);
      }
      throw error;
    }
  }

  private async call(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.provider === 'openai') {
      return this.callOpenAI(systemPrompt, userPrompt);
    }
    return this.callOllama(systemPrompt, userPrompt);
  }

  async extractActions(notes: string, context?: string, userContext?: string): Promise<ExtractionResult> {
    const basePrompt = `You are an AI assistant that helps extract action items from meeting notes.
Your task is to:
1. Provide a brief summary of the notes
2. Extract key points discussed
3. Identify action items with titles, descriptions, priorities, and suggested due dates

Respond in JSON format:
{
  "summary": "Brief summary",
  "keyPoints": ["point1", "point2"],
  "actions": [
    {
      "title": "Action title",
      "description": "Optional description",
      "priority": "low|medium|high|urgent",
      "dueDate": "YYYY-MM-DD or null"
    }
  ]
}`;

    const systemPrompt = this.buildSystemPrompt(basePrompt, userContext);
    const userPrompt = context 
      ? `Context: ${context}\n\nNotes:\n${notes}`
      : `Notes:\n${notes}`;

    try {
      const response = await this.call(systemPrompt, userPrompt);
      
      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback
      return {
        summary: 'Could not extract summary',
        keyPoints: [],
        actions: []
      };
    } catch (error) {
      console.error('AI extraction error:', error);
      return {
        summary: 'Error extracting data',
        keyPoints: [],
        actions: []
      };
    }
  }

  async generateFocusSuggestions(data: {
    overdueActions: any[];
    upcomingEvents: any[];
    urgentActions: any[];
  }, userContext?: string): Promise<FocusSuggestion[]> {
    const basePrompt = `You are a productivity coach helping a team leader prioritize their day.
Based on their overdue actions, upcoming events, and urgent tasks, suggest what they should focus on.

Respond in JSON format:
{
  "suggestions": [
    {
      "type": "focus|delegation|skip_meeting",
      "title": "Suggestion title",
      "description": "Why this is important",
      "priority": 1-10
    }
  ]
}`;

    const systemPrompt = this.buildSystemPrompt(basePrompt, userContext);
    const userPrompt = `
Overdue Actions (${data.overdueActions.length}):
${data.overdueActions.map(a => `- ${a.title}${a.employee ? ` (${a.employee.name})` : ''}`).join('\n')}

Upcoming Events (next 24h):
${data.upcomingEvents.map(e => `- ${e.title} at ${new Date(e.startTime).toLocaleTimeString()}`).join('\n')}

Urgent/High Priority Actions:
${data.urgentActions.map(a => `- ${a.title} [${a.priority}]`).join('\n')}
`;

    try {
      const response = await this.call(systemPrompt, userPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.suggestions || [];
      }
      return [];
    } catch (error) {
      console.error('AI suggestions error:', error);
      return [];
    }
  }

  async generateDailyBriefing(data: {
    userName: string;
    overdueActions: any[];
    todayEvents: any[];
    dueItems: any[];
    recentActivity: any[];
    actionStats: any;
  }, userContext?: string): Promise<DailyBriefing> {
    const basePrompt = `You are a leadership assistant providing a daily briefing for a team leader.
Create a personalized, actionable briefing based on their current situation.

Consider:
- Overdue items that need immediate attention
- Cadence items that are due (1:1s, retros, etc.)
- Today's schedule
- Recent activity patterns

Respond in JSON format:
{
  "greeting": "Personalized greeting based on time of day and situation",
  "priorities": [
    {"title": "Priority item", "reason": "Why this is important", "type": "urgent|important|routine"}
  ],
  "teamInsights": [
    {"title": "Insight", "description": "Details", "type": "check_in|recognition|concern"}
  ],
  "suggestions": [
    {"title": "Suggestion", "description": "Why", "actionable": true}
  ]
}`;

    const systemPrompt = this.buildSystemPrompt(basePrompt, userContext);
    
    const userPrompt = `
Leader: ${data.userName}
Current time: ${new Date().toLocaleString()}

OVERDUE ACTIONS (${data.overdueActions.length}):
${data.overdueActions.slice(0, 5).map(a => `- ${a.title}${a.employee ? ` (re: ${a.employee.name})` : ''}`).join('\n') || 'None'}

TODAY'S EVENTS:
${data.todayEvents.map(e => `- ${e.title} at ${new Date(e.startTime).toLocaleTimeString()}`).join('\n') || 'No events scheduled'}

DUE CADENCE ITEMS:
${data.dueItems.map((d: any) => `- ${d.rule.name}: ${d.daysOverdue} days overdue (target: ${d.targetName})`).join('\n') || 'All cadence items up to date'}

RECENT ACTIVITY:
- Completed this week: ${data.actionStats?.completedThisWeek || 0} actions
- Pending: ${data.actionStats?.pending || 0}
- In progress: ${data.actionStats?.inProgress || 0}

Please provide a helpful daily briefing:`;

    try {
      const response = await this.call(systemPrompt, userPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        greeting: `Good ${this.getTimeOfDay()}, ${data.userName}!`,
        priorities: [],
        teamInsights: [],
        suggestions: []
      };
    } catch (error) {
      console.error('AI daily briefing error:', error);
      return {
        greeting: `Good ${this.getTimeOfDay()}, ${data.userName}!`,
        priorities: [],
        teamInsights: [],
        suggestions: []
      };
    }
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  async generateMessage(
    type: 'followup' | 'feedback' | 'delegation' | 'reminder',
    context: string,
    tone: 'formal' | 'casual' | 'friendly' = 'friendly',
    userContext?: string
  ): Promise<string> {
    const basePrompt = `You are helping a team leader write professional messages.
Write a ${tone} ${type} message based on the context provided.
Keep it concise but warm. The leader wants to maintain good relationships with their team.`;

    const systemPrompt = this.buildSystemPrompt(basePrompt, userContext);
    const userPrompt = `Type: ${type}\nContext: ${context}\n\nGenerate the message:`;

    try {
      return await this.call(systemPrompt, userPrompt);
    } catch (error) {
      console.error('AI message generation error:', error);
      return 'Unable to generate message. Please try again.';
    }
  }

  async prepareMeeting(event: any, userContext?: string): Promise<MeetingPrep> {
    const basePrompt = `You are helping a team leader prepare for a meeting.
Based on the meeting details and participant history, provide:
1. A brief summary of the context
2. Key topics to discuss
3. Previous follow-ups to check on
4. Suggested questions to ask

Respond in JSON format:
{
  "summary": "Context summary",
  "keyTopics": ["topic1", "topic2"],
  "previousFollowUps": ["followup1"],
  "suggestedQuestions": ["question1"],
  "context": "Additional context"
}`;

    const systemPrompt = this.buildSystemPrompt(basePrompt, userContext);

    const participants = event.participants || [];
    const participantInfo = participants.map((p: any) => {
      const emp = p.employee;
      if (!emp) return '';
      
      const recentOneOnOnes = emp.oneOnOnes?.slice(0, 3) || [];
      const pendingActions = emp.actions || [];
      const recentNotes = emp.notes?.slice(0, 3) || [];

      return `
Participant: ${emp.name}
Recent 1:1 topics: ${recentOneOnOnes.map((o: any) => o.topics?.join(', ')).join('; ')}
Pending actions: ${pendingActions.map((a: any) => a.title).join(', ')}
Recent notes: ${recentNotes.map((n: any) => n.content.substring(0, 100)).join('; ')}
`;
    }).join('\n');

    const userPrompt = `
Meeting: ${event.title}
Type: ${event.eventType?.name || 'Unknown'}
Time: ${new Date(event.startTime).toLocaleString()}

${participantInfo}

Previous meeting notes:
${event.rawNotes || 'No previous notes'}
`;

    try {
      const response = await this.call(systemPrompt, userPrompt);
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        summary: 'Unable to generate preparation',
        keyTopics: [],
        previousFollowUps: [],
        suggestedQuestions: [],
        context: ''
      };
    } catch (error) {
      console.error('AI meeting prep error:', error);
      return {
        summary: 'Error generating preparation',
        keyTopics: [],
        previousFollowUps: [],
        suggestedQuestions: [],
        context: ''
      };
    }
  }

  async summarize(text: string, format: 'bullets' | 'paragraph' = 'bullets'): Promise<string> {
    const systemPrompt = format === 'bullets'
      ? 'Summarize the following text as bullet points. Be concise.'
      : 'Summarize the following text in a brief paragraph.';

    try {
      return await this.call(systemPrompt, text);
    } catch (error) {
      console.error('AI summarize error:', error);
      return 'Unable to summarize text.';
    }
  }

  async analyzeOneOnOne(notes: string, employeeContext?: {
    name: string;
    role: string;
    recentTopics?: string[];
    strengths?: string[];
    growthAreas?: string[];
  }): Promise<{
    actions: { title: string; priority: string; description?: string }[];
    insights: { type: string; content: string }[];
    competencySuggestions: { name: string; category: string; change: number; reason: string }[];
    developmentNotes: string[];
    mood: number;
    keyTakeaways: string[];
  }> {
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
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          actions: parsed.actions || [],
          insights: parsed.insights || [],
          competencySuggestions: parsed.competencySuggestions || [],
          developmentNotes: parsed.developmentNotes || [],
          mood: parsed.mood || 3,
          keyTakeaways: parsed.keyTakeaways || []
        };
      }
      return {
        actions: [],
        insights: [],
        competencySuggestions: [],
        developmentNotes: [],
        mood: 3,
        keyTakeaways: []
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

  async analyzeCompetencies(employeeData: {
    name: string;
    role: string;
    strengths: string[];
    growthAreas: string[];
    recentOneOnOnes: { notes: string; mood: number; topics: string[] }[];
    currentCompetencies: { name: string; rating: number; category: string }[];
  }, userContext?: string): Promise<{
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
  }> {
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
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          competencies: parsed.competencies || [],
          summary: parsed.summary || '',
          focusAreas: parsed.focusAreas || []
        };
      }
      return { competencies: [], summary: '', focusAreas: [] };
    } catch (error) {
      console.error('AI competency analysis error:', error);
      return { competencies: [], summary: '', focusAreas: [] };
    }
  }

  async generateDevelopmentPlan(employeeData: {
    name: string;
    role: string;
    strengths: string[];
    growthAreas: string[];
    competencies: { name: string; rating: number; category: string }[];
    recentOneOnOnes: { notes: string; topics: string[]; followUps: string[] }[];
    openActions: { title: string; status: string; priority: string }[];
    tenure: number; // months since start
  }, userContext?: string): Promise<{
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
  }> {
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
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || '',
          goals: (parsed.goals || []).map((g: any, i: number) => ({
            ...g,
            id: g.id || `goal-${i + 1}`
          })),
          quickWins: parsed.quickWins || [],
          longTermVision: parsed.longTermVision || ''
        };
      }
      return { summary: '', goals: [], quickWins: [], longTermVision: '' };
    } catch (error) {
      console.error('AI development plan error:', error);
      return { summary: '', goals: [], quickWins: [], longTermVision: '' };
    }
  }
}

