/**
 * AI Service - Meeting & Extraction Features
 * Handles note extraction, meeting prep, and message generation
 */
import { AIProviderBase, AIProviderType, ExtractionResult, MeetingPrep } from './base';

export class MeetingAIService extends AIProviderBase {
  constructor(provider: AIProviderType = 'openai', ollamaModel: string = 'mistral:latest') {
    super(provider, ollamaModel);
  }

  /**
   * Extract actions, decisions, and insights from meeting notes
   */
  async extractActions(notes: string, context?: string, userContext?: string): Promise<ExtractionResult> {
    const basePrompt = `You are an AI assistant that helps extract action items, decisions, and insights from meeting notes.
Your task is to:
1. Provide a brief summary of the notes
2. Extract key points discussed
3. Identify action items with titles, descriptions, priorities, and suggested due dates
4. Identify decisions that were made during the meeting
5. Identify insights (observations, risks, opportunities, or feedback)

For actions, determine:
- If something is blocking progress, mark isBlocker as true
- Type should be "action" for tasks, "decision" for choices made, "insight" for observations

Respond in JSON format:
{
  "summary": "Brief summary",
  "keyPoints": ["point1", "point2"],
  "actions": [
    {
      "title": "Action title",
      "description": "Optional description",
      "priority": "low|medium|high|urgent",
      "dueDate": "YYYY-MM-DD or null",
      "type": "action|decision|insight",
      "isBlocker": false,
      "assignee": "Person name or null"
    }
  ],
  "decisions": [
    {
      "title": "Decision made",
      "description": "Context and rationale",
      "context": "What led to this decision",
      "participants": ["person1", "person2"]
    }
  ],
  "insights": [
    {
      "title": "Insight title",
      "description": "Details",
      "category": "observation|risk|opportunity|feedback"
    }
  ]
}`;

    const systemPrompt = this.buildSystemPrompt(basePrompt, userContext);
    const userPrompt = context 
      ? `Context: ${context}\n\nNotes:\n${notes}`
      : `Notes:\n${notes}`;

    try {
      const response = await this.call(systemPrompt, userPrompt);
      return this.parseJsonResponse(response, {
        summary: 'Could not extract summary',
        keyPoints: [],
        actions: [],
        decisions: [],
        insights: []
      });
    } catch (error) {
      console.error('AI extraction error:', error);
      return {
        summary: 'Error extracting data',
        keyPoints: [],
        actions: [],
        decisions: [],
        insights: []
      };
    }
  }

  /**
   * Prepare for a meeting by analyzing participant history
   */
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
      return this.parseJsonResponse(response, {
        summary: 'Unable to generate preparation',
        keyTopics: [],
        previousFollowUps: [],
        suggestedQuestions: [],
        context: ''
      });
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

  /**
   * Generate professional messages
   */
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

  /**
   * Summarize text
   */
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
}
