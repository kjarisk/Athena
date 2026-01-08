/**
 * Calendar Helper Service
 * 
 * Local Node.js service that reads macOS Calendar.app via AppleScript/JXA
 * Provides HTTP API for Athena server to fetch calendar data
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppleScriptCalendarService } from './applescript';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3001';

let calendarService: AppleScriptCalendarService;

// Initialize calendar service lazily
function getCalendarService(): AppleScriptCalendarService {
  if (!calendarService) {
    calendarService = new AppleScriptCalendarService();
  }
  return calendarService;
}

// Middleware
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

/**
 * Health check endpoint (before logging middleware to avoid issues)
 */
app.get('/health', (req: Request, res: Response) => {
  console.log('Health check requested');
  res.json({ 
    status: 'ok', 
    service: 'calendar-helper',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Test calendar access permissions
 */
app.get('/test-access', async (req: Request, res: Response) => {
  try {
    const hasAccess = await getCalendarService().testAccess();
    
    if (hasAccess) {
      res.json({
        success: true,
        message: 'Calendar access granted',
        hint: 'Calendar.app is accessible'
      });
    } else {
      res.status(403).json({
        success: false,
        error: 'Calendar access denied',
        hint: 'Grant Calendar permissions in System Settings → Privacy & Security → Calendars'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get list of available calendars
 * GET /calendars
 */
app.get('/calendars', async (req: Request, res: Response) => {
  try {
    console.log('Fetching calendars from Calendar.app...');
    const calendars = await getCalendarService().getCalendars();
    
    console.log(`Found ${calendars.length} calendars`);
    
    res.json({ 
      success: true, 
      calendars,
      count: calendars.length
    });
  } catch (error: any) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      hint: 'Check Calendar permissions in System Settings → Privacy & Security → Calendars'
    });
  }
});

/**
 * Get events in date range
 * GET /events?start=2024-01-01T00:00:00Z&end=2024-01-31T23:59:59Z&calendarIds=cal1,cal2
 */
app.get('/events', async (req: Request, res: Response) => {
  try {
    const { start, end, calendarIds } = req.query;
    
    // Parse dates
    const startDate = start ? new Date(start as string) : new Date();
    const endDate = end 
      ? new Date(end as string) 
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 7 days ahead
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)'
      });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date must be before end date'
      });
    }
    
    // Parse calendar IDs
    const calendarIdArray = calendarIds 
      ? (calendarIds as string).split(',').filter(id => id.trim())
      : undefined;
    
    console.log(`Fetching events from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    if (calendarIdArray) {
      console.log(`Filtering by calendar IDs: ${calendarIdArray.join(', ')}`);
    }
    
    const events = await getCalendarService().getEvents({
      startDate,
      endDate,
      calendarIds: calendarIdArray
    });
    
    console.log(`Found ${events.length} events`);
    
    res.json({ 
      success: true, 
      events,
      count: events.length,
      query: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        calendarIds: calendarIdArray
      }
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Get events for a specific date range with more user-friendly parameters
 * GET /events/range?days=7&calendarIds=cal1,cal2
 */
app.get('/events/range', async (req: Request, res: Response) => {
  try {
    const { days, daysBack, calendarIds } = req.query;
    
    const daysAhead = days ? parseInt(days as string) : 7;
    const daysBehind = daysBack ? parseInt(daysBack as string) : 0;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBehind);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);
    endDate.setHours(23, 59, 59, 999);
    
    const calendarIdArray = calendarIds 
      ? (calendarIds as string).split(',').filter(id => id.trim())
      : undefined;
    
    console.log(`Fetching events: ${daysBehind} days back, ${daysAhead} days ahead`);
    
    const events = await calendarService.getEvents({
      startDate,
      endDate,
      calendarIds: calendarIdArray
    });
    
    res.json({ 
      success: true, 
      events,
      count: events.length,
      query: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysBack: daysBehind,
        daysAhead,
        calendarIds: calendarIdArray
      }
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   📅 Calendar Helper Service                  ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔐 Allowed origin: ${ALLOWED_ORIGIN}`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  /health           - Health check`);
  console.log(`  GET  /test-access      - Test calendar permissions`);
  console.log(`  GET  /calendars        - List all calendars`);
  console.log(`  GET  /events           - Get events (with start/end dates)`);
  console.log(`  GET  /events/range     - Get events (with days parameter)`);
  console.log('');
  console.log('⚠️  First run: macOS will prompt for Calendar permissions');
  console.log('    Grant access in System Settings → Privacy & Security → Calendars');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
