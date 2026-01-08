/**
 * AI Service - Productivity & Focus Features
 * Handles daily briefings, focus suggestions, and time management
 */
import { 
  AIProviderBase, 
  AIProviderType, 
  FocusSuggestion, 
  DailyBriefing, 
  TimeManagementAnalysis 
} from './base';

export class ProductivityAIService extends AIProviderBase {
  constructor(provider: AIProviderType = 'openai', ollamaModel: string = 'mistral:latest') {
    super(provider, ollamaModel);
  }

  /**
   * Generate focus suggestions based on current workload
   */
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
      const parsed = this.parseJsonResponse<{ suggestions: FocusSuggestion[] }>(response, { suggestions: [] });
      return parsed.suggestions || [];
    } catch (error) {
      console.error('AI suggestions error:', error);
      return [];
    }
  }

  /**
   * Generate personalized daily briefing
   */
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
      return this.parseJsonResponse(response, {
        greeting: `Good ${this.getTimeOfDay()}, ${data.userName}!`,
        priorities: [],
        teamInsights: [],
        suggestions: []
      });
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

  /**
   * Analyze time management and provide insights
   */
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
    const systemPrompt = this.buildSystemPrompt(`You are an AI assistant specialized in time management and productivity for leaders.
Analyze the user's calendar, tasks, and work areas to provide actionable insights about time allocation, meeting load, and focus time.

Return your analysis as a JSON object with this structure:
{
  "summary": "Brief overview of time management situation",
  "insights": [
    {
      "type": "warning" | "info" | "success",
      "category": "meetings" | "focus" | "balance" | "urgency",
      "message": "Specific insight message"
    }
  ],
  "suggestions": [
    {
      "title": "Action title",
      "description": "Detailed suggestion",
      "priority": "high" | "medium" | "low"
    }
  ],
  "timeAllocation": [
    {
      "workArea": "Area name",
      "hours": 15.5,
      "percentage": 35
    }
  ]
}`, userContext);

    // Calculate time statistics
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingEvents = data.events.filter(e => 
      e.startTime >= now && e.startTime <= nextWeek
    );

    const totalMeetingHours = upcomingEvents.reduce((sum, e) => {
      const duration = (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60 * 60);
      return sum + duration;
    }, 0);

    // Group events by day
    const eventsByDay = upcomingEvents.reduce((acc, e) => {
      const day = e.startTime.toISOString().split('T')[0];
      if (!acc[day]) acc[day] = [];
      acc[day].push(e);
      return acc;
    }, {} as Record<string, typeof upcomingEvents>);

    const busiestDay = Object.entries(eventsByDay).reduce((max, [day, events]) => {
      const dayHours = events.reduce((sum, e) => {
        const duration = (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60 * 60);
        return sum + duration;
      }, 0);
      return dayHours > max.hours ? { day, hours: dayHours } : max;
    }, { day: '', hours: 0 });

    // Calculate work area time allocation
    const areaTimeMap = new Map<string, number>();
    upcomingEvents.forEach(e => {
      const area = e.workAreaName || 'Unassigned';
      const duration = (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60 * 60);
      areaTimeMap.set(area, (areaTimeMap.get(area) || 0) + duration);
    });

    // Upcoming urgent actions
    const urgentActions = data.actions.filter(a => 
      a.status !== 'completed' && 
      (a.priority === 'urgent' || a.priority === 'high')
    );

    const userPrompt = `
UPCOMING WEEK CALENDAR (Next 7 days):
- Total events: ${upcomingEvents.length}
- Total meeting hours: ${totalMeetingHours.toFixed(1)} hours
- Busiest day: ${busiestDay.day || 'N/A'} with ${busiestDay.hours.toFixed(1)} hours

EVENTS BY DAY:
${Object.entries(eventsByDay).map(([day, events]) => {
  const dayHours = events.reduce((sum, e) => {
    const duration = (e.endTime.getTime() - e.startTime.getTime()) / (1000 * 60 * 60);
    return sum + duration;
  }, 0);
  return `${day}: ${events.length} events, ${dayHours.toFixed(1)} hours`;
}).join('\n')}

TIME ALLOCATION BY WORK AREA:
${Array.from(areaTimeMap.entries())
  .map(([area, hours]) => `- ${area}: ${hours.toFixed(1)} hours`)
  .join('\n')}

OPEN TASKS:
- Total open actions: ${data.actions.filter(a => a.status !== 'completed').length}
- Urgent/High priority: ${urgentActions.length}
${urgentActions.slice(0, 5).map(a => `  - ${a.title} [${a.priority}]`).join('\n')}

WORK AREAS:
${data.workAreas.map(a => `- ${a.name}: ${a.description || 'No description'}`).join('\n')}

Analyze this data and provide:
1. Overall assessment of time management
2. Insights about meeting load, focus time, and balance
3. Specific suggestions for optimizing time allocation
4. Warning if any days are overloaded or if there's insufficient focus time
5. Recommendations for work area balance`;

    try {
      const response = await this.call(systemPrompt, userPrompt);
      const parsed = this.parseJsonResponse<TimeManagementAnalysis>(response, {
        summary: 'Unable to generate AI analysis',
        insights: [],
        suggestions: [],
        timeAllocation: []
      });
      
      // Ensure timeAllocation has real data
      if (!parsed.timeAllocation || parsed.timeAllocation.length === 0) {
        parsed.timeAllocation = Array.from(areaTimeMap.entries()).map(([area, hours]) => ({
          workArea: area,
          hours: parseFloat(hours.toFixed(1)),
          percentage: Math.round((hours / (totalMeetingHours || 1)) * 100)
        }));
      }
      
      return parsed;
    } catch (error) {
      console.error('AI time management analysis error:', error);
      return {
        summary: 'Error generating analysis',
        insights: [],
        suggestions: [],
        timeAllocation: Array.from(areaTimeMap.entries()).map(([area, hours]) => ({
          workArea: area,
          hours: parseFloat(hours.toFixed(1)),
          percentage: Math.round((hours / (totalMeetingHours || 1)) * 100)
        }))
      };
    }
  }
}
