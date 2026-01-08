import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { eventkitService } from '../services/calendar/eventkitService';

const router = Router();
const prisma = new PrismaClient();

// Temporary store for OAuth state (userId keyed by a random state string)
const oauthStateStore = new Map<string, { userId: string, timestamp: number }>();

// Clean up expired state entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStateStore.entries()) {
    if (now - data.timestamp > 600000) { // 10 minutes
      oauthStateStore.delete(state);
    }
  }
}, 60000);

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use('google-calendar', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/calendar/auth/google/callback',
    passReqToCallback: true,
    scope: ['openid', 'profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly']
  } as any,
  async (req: any, accessToken: string, refreshToken: string, params: any, profile: any, done: any) => {
    try {
      console.log('=== Google OAuth Strategy Callback ===');
      console.log('Profile ID:', profile?.id);
      console.log('Profile email:', profile?.emails?.[0]?.value);
      console.log('Access token length:', accessToken?.length);
      console.log('Refresh token present:', !!refreshToken);
      console.log('Query params:', req.query);
      
      // Get userId from state parameter
      const state = req.query.state;
      if (!state) {
        console.error('ERROR: No state parameter in callback');
        return done(new Error('No state parameter found'));
      }

      const stateData = oauthStateStore.get(state);
      if (!stateData) {
        console.error('ERROR: Invalid or expired state parameter:', state);
        console.error('Available states in store:', Array.from(oauthStateStore.keys()));
        return done(new Error('Invalid or expired OAuth state'));
      }

      const userId = stateData.userId;
      console.log('Successfully extracted userId from state:', userId);
      
      // Clean up the state
      oauthStateStore.delete(state);

      // Calculate token expiry
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + (params.expires_in || 3600));

      console.log('Attempting to store tokens in database for userId:', userId);
      
      // Store tokens in database
      await prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: accessToken,
          googleRefreshToken: refreshToken || undefined,
          googleTokenExpiry: expiryDate
        }
      });

      console.log('✓ Successfully stored Google OAuth tokens for user:', userId);
      
      // Clean up the state
      oauthStateStore.delete(state);
      console.log('✓ Cleaned up OAuth state');
      
      done(null, { userId, provider: 'google' });
    } catch (error) {
      console.error('❌ ERROR in Google OAuth strategy:', error);
      console.error('Error details:', (error as Error).message);
      console.error('Error stack:', (error as Error).stack);
      done(error);
    }
  }));
}

// Google OAuth initiate
router.get('/auth/google', (req, res, next) => {
  console.log('Google OAuth initiate - query params:', req.query);
  console.log('Google OAuth initiate - token present:', !!req.query.token);
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      error: 'Google Calendar integration not configured',
      message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required'
    });
  }
  
  // Get userId from JWT token in query params
  const token = req.query.token as string;
  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  // Verify JWT and extract userId
  const jwt = require('jsonwebtoken');
  let userId: string;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-secret') as any;
    userId = payload.userId;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  // Generate a random state parameter and store userId
  const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
  oauthStateStore.set(state, { userId, timestamp: Date.now() });
  console.log('Created OAuth state:', state, 'for userId:', userId);
  
  passport.authenticate('google-calendar', {
    session: false,
    accessType: 'offline',
    prompt: 'consent',
    state: state
  } as any)(req, res, next);
});

// Google OAuth callback
router.get('/auth/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    console.log('=== Google OAuth Callback Route Hit ===');
    console.log('Query params:', req.query);
    next();
  },
  passport.authenticate('google-calendar', { 
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/settings?calendar=error`,
    failureMessage: true
  }),
  (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err) {
      console.error('❌ Passport authentication error:', err);
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/settings?calendar=error&reason=${encodeURIComponent(err.message)}`);
    }
    next();
  },
  async (req: AuthRequest, res: Response) => {
    try {
      console.log('=== Google OAuth Callback Handler ===');
      console.log('req.user:', req.user);
      
      // passport.authenticate has already stored the tokens
      // Get userId from the user object set by passport
      const userId = (req.user as any)?.userId;
      if (!userId) {
        console.error('ERROR: No userId in req.user');
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/settings?calendar=error`);
      }
      
      console.log('Triggering initial calendar sync for userId:', userId);
      
      // Trigger initial sync
      const { syncGoogleCalendar } = await import('../services/calendar/sync.js');
      await syncGoogleCalendar(userId);
      
      console.log('✓ Calendar sync completed successfully');
      
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/settings?calendar=google-success`);
    } catch (error) {
      console.error('❌ ERROR during Google calendar initial sync:', error);
      console.error('Error message:', (error as Error).message);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/settings?calendar=sync-error`);
    }
  }
);

// Disconnect Google Calendar
router.post('/disconnect/google', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId! },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null
      }
    });

    res.json({ success: true, message: 'Google Calendar disconnected' });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
  }
});

// Trigger manual sync
router.post('/sync', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { syncGoogleCalendar } = await import('../services/calendar/sync.js');
    
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        googleAccessToken: true
      }
    });

    const results: any = {};

    if (user?.googleAccessToken) {
      try {
        await syncGoogleCalendar(req.userId!);
        results.google = 'success';
      } catch (error) {
        console.error('Google sync error:', error);
        results.google = 'error';
      }
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: { lastCalendarSync: new Date() }
    });

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error during manual sync:', error);
    res.status(500).json({ error: 'Failed to sync calendars' });
  }
});

// Get calendar connection status
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        googleAccessToken: true,
        googleTokenExpiry: true,
        lastCalendarSync: true
      }
    });

    res.json({
      google: {
        connected: !!user?.googleAccessToken,
        expired: user?.googleTokenExpiry ? new Date() > user.googleTokenExpiry : false
      },
      lastSync: user?.lastCalendarSync
    });
  } catch (error) {
    console.error('Error getting calendar status:', error);
    res.status(500).json({ error: 'Failed to get calendar status' });
  }
});

// ============= EventKit Calendar Routes (Mac Calendar) =============

/**
 * Test EventKit connection and permissions
 */
router.get('/eventkit/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Test if Calendar Helper service is running
    const isConnected = await eventkitService.testConnection();
    
    if (!isConnected) {
      return res.json({
        available: false,
        message: 'Calendar Helper service is not running. Start it with: cd calendar-helper && npm run dev'
      });
    }

    // Test calendar access permissions
    const accessCheck = await eventkitService.testAccess();
    
    res.json({
      available: true,
      hasAccess: accessCheck.hasAccess,
      message: accessCheck.message
    });
  } catch (error: any) {
    console.error('Error checking EventKit status:', error);
    res.status(500).json({ 
      error: 'Failed to check EventKit status',
      message: error.message 
    });
  }
});

/**
 * Get available calendars from Mac Calendar
 */
router.get('/eventkit/calendars', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const calendars = await eventkitService.getCalendars();
    
    res.json({
      success: true,
      calendars,
      count: calendars.length
    });
  } catch (error: any) {
    console.error('Error fetching EventKit calendars:', error);
    res.status(500).json({ 
      error: 'Failed to fetch calendars',
      message: error.message,
      hint: 'Make sure Calendar Helper service is running and has calendar permissions'
    });
  }
});

/**
 * Sync events from Mac Calendar to Athena
 */
router.post('/eventkit/sync', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { calendarIds, daysBack = 7, daysAhead = 30 } = req.body;

    if (!calendarIds || !Array.isArray(calendarIds) || calendarIds.length === 0) {
      return res.status(400).json({
        error: 'calendarIds is required and must be a non-empty array'
      });
    }

    console.log(`[EventKit Sync] User ${req.userId} requesting sync`);
    console.log(`[EventKit Sync] Calendar IDs: ${calendarIds.join(', ')}`);
    console.log(`[EventKit Sync] Range: ${daysBack} days back, ${daysAhead} days ahead`);

    // Get or create a calendar event type
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

    // Fetch events from Mac Calendar
    const result = await eventkitService.syncEvents(
      req.userId!,
      calendarIds,
      daysBack,
      daysAhead
    );

    // Store events in database
    const savedEvents = [];
    for (const event of result.events) {
      const eventData = eventkitService.convertToEvent(event, req.userId!, calendarEventType.id);
      
      // Upsert event (update if exists, create if not)
      const saved = await prisma.event.upsert({
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
      
      savedEvents.push(saved);
    }

    // Save selected calendar IDs to user settings for auto-sync
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { settings: true }
    });

    const settings = (user?.settings as any) || {};
    settings.eventkitCalendarIds = calendarIds;

    // Update last sync timestamp and save settings
    await prisma.user.update({
      where: { id: req.userId! },
      data: { 
        lastCalendarSync: new Date(),
        settings: settings
      }
    });

    console.log(`[EventKit Sync] Successfully synced ${savedEvents.length} events`);

    res.json({
      success: true,
      synced: savedEvents.length,
      message: `Successfully synced ${savedEvents.length} events from Mac Calendar`
    });
  } catch (error: any) {
    console.error('[EventKit Sync] Error:', error);
    res.status(500).json({
      error: 'Failed to sync Mac Calendar events',
      message: error.message
    });
  }
});

/**
 * Get preview of events from Mac Calendar (without saving to DB)
 */
router.post('/eventkit/preview', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { calendarIds, daysBack = 7, daysAhead = 30 } = req.body;

    if (!calendarIds || !Array.isArray(calendarIds) || calendarIds.length === 0) {
      return res.status(400).json({
        error: 'calendarIds is required and must be a non-empty array'
      });
    }

    const result = await eventkitService.syncEvents(
      req.userId!,
      calendarIds,
      daysBack,
      daysAhead
    );

    res.json({
      success: true,
      events: result.events,
      count: result.events.length
    });
  } catch (error: any) {
    console.error('Error previewing EventKit events:', error);
    res.status(500).json({
      error: 'Failed to preview events',
      message: error.message
    });
  }
});

export default router;
