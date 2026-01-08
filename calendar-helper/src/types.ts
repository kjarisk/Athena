/**
 * Type definitions for Calendar Helper Service
 */

export interface Calendar {
  id: string;
  title: string;
  type: string;
  color?: string;
  source: string; // e.g., "Exchange", "Google", "iCloud", "CalDAV"
  isSubscribed: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
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
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export interface GetEventsOptions {
  startDate: Date;
  endDate: Date;
  calendarIds?: string[];
}

export interface AppleScriptCalendar {
  name: string;
  id: string;
  type: string;
}

export interface AppleScriptEvent {
  summary: string;
  uid: string;
  startDate: string;
  endDate: string;
  allDayEvent: boolean;
  location: string;
  description: string;
  url: string;
  calendar: string;
  attendees: string;
}
