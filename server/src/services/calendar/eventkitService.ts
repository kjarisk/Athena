/**
 * EventKit Calendar Service
 * 
 * Service to interact with the Calendar Helper (local macOS Calendar.app bridge)
 * Provides functions to fetch calendars and events from Mac Calendar
 */

const CALENDAR_HELPER_URL = process.env.CALENDAR_HELPER_URL || 'http://localhost:3002';

interface CalendarHelperResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
}

interface EventKitCalendar {
  id: string;
  title: string;
  type: string;
  source: string;
  isSubscribed: boolean;
  color?: string;
}

interface EventKitEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  location?: string;
  notes?: string;
  url?: string;
  calendar: {
    id: string;
    title: string;
    source: string;
  };
  attendees?: string[];
  status?: string;
}

export class EventKitService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = CALENDAR_HELPER_URL;
  }

  /**
   * Test if Calendar Helper service is available
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      return response.ok;
    } catch (error) {
      console.error('Calendar Helper connection test failed:', error);
      return false;
    }
  }

  /**
   * Test calendar access permissions
   */
  async testAccess(): Promise<{ hasAccess: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/test-access`);
      const data = await response.json() as any;

      return {
        hasAccess: data.success,
        message: data.message || data.error,
      };
    } catch (error: any) {
      return {
        hasAccess: false,
        message: error.message || 'Failed to connect to Calendar Helper service',
      };
    }
  }

  /**
   * Fetch all available calendars from Mac Calendar
   */
  async getCalendars(): Promise<EventKitCalendar[]> {
    try {
      const response = await fetch(`${this.baseUrl}/calendars`);
      
      if (!response.ok) {
        throw new Error(`Calendar Helper returned ${response.status}`);
      }

      const data = await response.json() as any;

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch calendars');
      }

      return data.calendars || [];
    } catch (error: any) {
      console.error('Error fetching EventKit calendars:', error);
      throw new Error(`EventKit calendar fetch failed: ${error.message}`);
    }
  }

  /**
   * Fetch events from Mac Calendar within a date range
   */
  async getEvents(
    startDate: Date,
    endDate: Date,
    calendarIds?: string[]
  ): Promise<EventKitEvent[]> {
    try {
      const params = new URLSearchParams({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });

      if (calendarIds && calendarIds.length > 0) {
        params.append('calendarIds', calendarIds.join(','));
      }

      const response = await fetch(`${this.baseUrl}/events?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Calendar Helper returned ${response.status}`);
      }

      const data = await response.json() as any;

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      return data.events || [];
    } catch (error: any) {
      console.error('Error fetching EventKit events:', error);
      throw new Error(`EventKit events fetch failed: ${error.message}`);
    }
  }

  /**
   * Convert EventKit event to Athena Event format
   */
  convertToEvent(event: EventKitEvent, userId: string, eventTypeId: string) {
    return {
      userId,
      eventTypeId,
      title: event.title,
      description: event.notes || null,
      rawNotes: event.notes || null,
      startTime: new Date(event.startDate),
      endTime: new Date(event.endDate),
      googleEventId: event.id, // Using googleEventId as generic external ID field
      calendarSource: 'eventkit',
      extractedData: {
        isAllDay: event.isAllDay,
        location: event.location,
        attendees: event.attendees || [],
        calendar: event.calendar,
        url: event.url
      },
      needsAction: false // Calendar events don't need action by default
    };
  }

  /**
   * Sync events from Mac Calendar to Athena database
   * Returns the number of events synced
   */
  async syncEvents(
    userId: string,
    calendarIds: string[],
    daysBack: number = 7,
    daysAhead: number = 30
  ): Promise<{ synced: number; events: EventKitEvent[] }> {
    try {
      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);
      endDate.setHours(23, 59, 59, 999);

      console.log(`[EventKit] Syncing events for user ${userId}`);
      console.log(`[EventKit] Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      console.log(`[EventKit] Calendar IDs: ${calendarIds.join(', ')}`);

      // Fetch events from Mac Calendar
      const events = await this.getEvents(startDate, endDate, calendarIds);

      console.log(`[EventKit] Fetched ${events.length} events from Mac Calendar`);

      return {
        synced: events.length,
        events,
      };
    } catch (error: any) {
      console.error('[EventKit] Sync failed:', error);
      throw new Error(`EventKit sync failed: ${error.message}`);
    }
  }
}

export const eventkitService = new EventKitService();
