/**
 * Calendar service for macOS Calendar.app
 * Uses Python/EventKit for event fetching (fast, reliable)
 * Uses JXA for simple operations (list calendars, test access)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Calendar, CalendarEvent, GetEventsOptions } from './types';

const execAsync = promisify(exec);

export class AppleScriptCalendarService {
  /**
   * Execute JXA script from temporary file with timeout
   */
  private async execJXA(script: string, timeoutMs: number = 30000): Promise<string> {
    const tempFile = join(tmpdir(), `calendar-script-${Date.now()}.js`);
    try {
      await writeFile(tempFile, script, 'utf-8');
      const { stdout } = await execAsync(`osascript -l JavaScript "${tempFile}"`, {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large event lists
      });
      return stdout.trim();
    } finally {
      await unlink(tempFile).catch(() => {});
    }
  }

  /**
   * Get list of all calendars in Calendar.app
   * Only returns the 'Calendar' calendar (work Exchange calendar)
   */
  async getCalendars(): Promise<Calendar[]> {
    const script = `function run() {
  const app = Application('Calendar');
  const calendars = app.calendars();
  
  // Filter to only show 'Calendar' (work Exchange calendar)
  const result = calendars
    .filter(cal => cal.name() === 'Calendar')
    .map(cal => {
      return {
        id: 'Calendar',
        title: 'Calendar',
        type: 'calendar',
        source: 'Exchange'  // Mark as Exchange (work calendar)
      };
    });
  
  return JSON.stringify(result);
}

run();`;

    try {
      const stdout = await this.execJXA(script);
      const calendars = JSON.parse(stdout);
      
      return calendars.map((cal: any) => ({
        id: cal.id,
        title: cal.title,
        type: cal.type || 'calendar',
        source: cal.source,
        isSubscribed: false
      }));
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw new Error('Failed to fetch calendars from Calendar.app. Make sure Calendar permissions are granted.');
    }
  }

  /**
   * Get events within a date range
   * Uses Python/EventKit for much better performance with Exchange calendars
   */
  async getEvents(options: GetEventsOptions): Promise<CalendarEvent[]> {
    const { startDate, endDate, calendarIds } = options;
    
    console.log('[CALENDAR] Fetching events using Python/EventKit...');
    console.log('[CALENDAR] Options:', { startDate, endDate, calendarIds });
    
    const calendarName = calendarIds && calendarIds.length > 0 ? calendarIds[0] : 'Calendar';
    
    // Calculate days back and ahead from today
    const now = new Date();
    const daysBack = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysAhead = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('[CALENDAR] Date range:', { daysBack, daysAhead });
    
    try {
      const scriptPath = join(__dirname, '..', 'fetch-events.py');
      const command = `python3 "${scriptPath}" "${calendarName}" ${daysBack} ${daysAhead}`;
      
      console.log('[CALENDAR] Executing command:', command);
      console.log('[CALENDAR] Script path:', scriptPath);
      
      const { stdout } = await execAsync(command, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      });
      
      console.log('[CALENDAR] Python execution completed');
      
      const rawEvents = JSON.parse(stdout);
      
      // Convert to our format
      const events: CalendarEvent[] = rawEvents.map((evt: any) => ({
        id: evt.id,
        title: evt.title,
        startDate: new Date(evt.startDate * 1000).toISOString(),
        endDate: new Date(evt.endDate * 1000).toISOString(),
        isAllDay: evt.isAllDay || false,
        location: evt.location || '',
        notes: evt.notes || '',
        url: evt.url || '',
        calendar: evt.calendar,
        attendees: [],
        status: 'confirmed'
      }));
      
      console.log(`[CALENDAR] Successfully fetched ${events.length} events using EventKit`);
      return events;
    } catch (error: any) {
      console.error('Error fetching events:', error);
      
      if (error.killed || error.signal === 'SIGTERM') {
        throw new Error('Calendar query timed out.');
      }
      
      if (error.message?.includes('execution error') || error.message?.includes('not found')) {
        throw new Error('Calendar access denied or calendar not found. Check System Settings.');
      }
      
      throw new Error('Failed to fetch events: ' + error.message);
    }
  }

  /**
   * Format date for AppleScript
   */
  private formatAppleScriptDate(date: Date): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  }

  /**
   * Test calendar access by checking if Calendar.app is accessible
   */
  async testAccess(): Promise<boolean> {
    const script = 'function run() { return Application("Calendar").calendars().length; } run();';

    try {
      await this.execJXA(script);
      return true;
    } catch (error) {
      return false;
    }
  }

}
