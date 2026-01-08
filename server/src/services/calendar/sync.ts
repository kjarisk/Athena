import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

// Sync window: past 30 days, future 60 days
const SYNC_PAST_DAYS = 30;
const SYNC_FUTURE_DAYS = 60;

/**
 * Refresh Google access token using refresh token
 */
async function refreshGoogleToken(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true }
    });

    if (!user?.googleRefreshToken) {
      throw new Error('No refresh token available');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/calendar/auth/google/callback'
    );

    oauth2Client.setCredentials({
      refresh_token: user.googleRefreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    const newAccessToken = credentials.access_token;
    const expiryDate = credentials.expiry_date ? new Date(credentials.expiry_date) : null;

    if (newAccessToken) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: newAccessToken,
          googleTokenExpiry: expiryDate
        }
      });

      return newAccessToken;
    }

    return null;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

/**
 * Map calendar event to WorkArea based on title, participants, and time
 */
async function inferWorkArea(
  userId: string,
  title: string,
  participants: string[],
  startTime: Date
): Promise<string | null> {
  try {
    const workAreas = await prisma.workArea.findMany({
      where: { userId, isHidden: false },
      select: { id: true, name: true, employees: { select: { email: true } } }
    });

    if (workAreas.length === 0) return null;

    // Strategy 1: Match by participant work areas
    for (const area of workAreas) {
      const areaEmails = area.employees.map(e => e.email ? e.email.toLowerCase() : '');
      const matchingParticipants = participants.filter(p => 
        areaEmails.some(email => p.toLowerCase().includes(email))
      );
      
      if (matchingParticipants.length > 0) {
        return area.id;
      }
    }

    // Strategy 2: Fuzzy match title with area name
    const lowerTitle = title.toLowerCase();
    for (const area of workAreas) {
      const areaNameWords = area.name.toLowerCase().split(/\s+/);
      if (areaNameWords.some(word => lowerTitle.includes(word) && word.length > 3)) {
        return area.id;
      }
    }

    // Strategy 3: Default to first/primary area (optional)
    // return workAreas[0].id;

    // No match - leave unassigned for manual tagging
    return null;
  } catch (error) {
    console.error('Error inferring work area:', error);
    return null;
  }
}

/**
 * Sync Google Calendar events
 */
export async function syncGoogleCalendar(userId: string): Promise<void> {
  try {
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleTokenExpiry: true,
        googleRefreshToken: true
      }
    });

    if (!user?.googleAccessToken) {
      throw new Error('Google Calendar not connected');
    }

    // Check if token is expired and refresh if needed
    if (user.googleTokenExpiry && new Date() >= user.googleTokenExpiry) {
      const newToken = await refreshGoogleToken(userId);
      if (!newToken) {
        throw new Error('Failed to refresh Google token');
      }
      user.googleAccessToken = newToken;
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/calendar/auth/google/callback'
    );

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Calculate sync window
    const now = new Date();
    const timeMin = new Date(now);
    timeMin.setDate(timeMin.getDate() - SYNC_PAST_DAYS);
    const timeMax = new Date(now);
    timeMax.setDate(timeMax.getDate() + SYNC_FUTURE_DAYS);

    // Fetch events from Google Calendar
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 500
    });

    const events = response.data.items || [];
    console.log(`Fetched ${events.length} events from Google Calendar for user ${userId}`);

    // Get default event type (Other)
    const defaultEventType = await prisma.eventType.findFirst({
      where: { name: 'Other' }
    });

    if (!defaultEventType) {
      throw new Error('Default event type not found');
    }

    // Upsert events
    for (const event of events) {
      if (!event.id || !event.start || !event.summary) continue;

      const startTime = event.start.dateTime 
        ? new Date(event.start.dateTime)
        : new Date(event.start.date!);
      
      const endTime = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
        ? new Date(event.end.date)
        : new Date(startTime.getTime() + 60 * 60 * 1000); // Default 1 hour

      // Extract participant emails
      const participants = (event.attendees || [])
        .filter(a => a.email)
        .map(a => a.email!);

      // Infer work area
      const workAreaId = await inferWorkArea(userId, event.summary, participants, startTime);

      await prisma.event.upsert({
        where: { googleEventId: event.id },
        update: {
          title: event.summary,
          description: event.description || null,
          startTime,
          endTime,
          workAreaId,
          calendarSource: 'google'
        },
        create: {
          userId,
          eventTypeId: defaultEventType.id,
          googleEventId: event.id,
          title: event.summary,
          description: event.description || null,
          startTime,
          endTime,
          workAreaId,
          calendarSource: 'google',
          needsAction: false // Calendar events don't need action by default
        }
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastCalendarSync: new Date() }
    });

    console.log(`Successfully synced ${events.length} Google Calendar events for user ${userId}`);
  } catch (error) {
    console.error('Error syncing Google Calendar:', error);
    throw error;
  }
}

/**
 * Sync all calendars for a user
 */
export async function syncAllCalendars(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      settings: true
    }
  });

  const promises: Promise<void>[] = [];

  if (user?.googleAccessToken) {
    promises.push(syncGoogleCalendar(userId).catch(err => {
      console.error(`Google sync failed for user ${userId}:`, err);
    }));
  }

  // Add EventKit sync if user has selected calendars
  const settings = user?.settings as any || {};
  if (settings.eventkitCalendarIds && Array.isArray(settings.eventkitCalendarIds) && settings.eventkitCalendarIds.length > 0) {
    promises.push(syncEventKitCalendar(userId, settings.eventkitCalendarIds).catch(err => {
      console.error(`EventKit sync failed for user ${userId}:`, err);
    }));
  }

  await Promise.all(promises);
}

async function syncEventKitCalendar(userId: string, calendarIds: string[]): Promise<void> {
  const { eventkitService } = await import('./eventkitService.js');
  
  try {
    // Check if Calendar Helper is available
    const isAvailable = await eventkitService.testConnection();
    if (!isAvailable) {
      console.log(`EventKit service not available for user ${userId}`);
      return;
    }

    // Sync events (today only, 40 days ahead)
    const result = await eventkitService.syncEvents(userId, calendarIds, 0, 40);
    
    // Get or create calendar event type
    let calendarEventType = await prisma.eventType.findFirst({
      where: {
        name: 'Calendar Event',
        category: 'OTHER'
      }
    });

    if (!calendarEventType) {
      calendarEventType = await prisma.eventType.create({
        data: {
          name: 'Calendar Event',
          category: 'OTHER',
          color: '#6366F1',
          icon: 'calendar'
        }
      });
    }

    // Store events in database
    for (const event of result.events) {
      const eventData = eventkitService.convertToEvent(event, userId, calendarEventType.id);
      
      await prisma.event.upsert({
        where: {
          googleEventId: event.id
        },
        update: {
          title: eventData.title,
          description: eventData.description,
          rawNotes: eventData.rawNotes,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
          calendarSource: eventData.calendarSource,
          extractedData: eventData.extractedData,
          needsAction: eventData.needsAction
        },
        create: eventData
      });
    }

    console.log(`Synced ${result.events.length} EventKit events for user ${userId}`);
  } catch (error) {
    console.error(`EventKit sync error for user ${userId}:`, error);
    throw error;
  }
}
