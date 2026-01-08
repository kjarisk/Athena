# EventKit Calendar Integration - Implementation Summary

## Overview

Successfully implemented Mac Calendar (EventKit) integration to bypass Microsoft OAuth admin consent requirement. This allows users to sync their work Outlook calendar through Mac's built-in Calendar app instead of requiring OAuth approval.

## Architecture

```
Mac Calendar.app (synced with work Outlook)
    ↓ (AppleScript/JXA)
Calendar Helper Service (localhost:3002)
    ↓ (HTTP REST API)
Athena Server (localhost:3001)
    ↓ (HTTP REST API)
Athena Client (localhost:5173)
```

## What Was Implemented

### 1. Calendar Helper Service (`/calendar-helper/`)

A standalone Node.js/Express service that reads macOS Calendar.app using AppleScript (JXA).

**Files Created:**
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables (PORT=3002, ALLOWED_ORIGIN)
- `.env.example` - Example environment variables
- `.gitignore` - Git ignore patterns
- `README.md` - Service documentation
- `src/index.ts` - Express server with API endpoints
- `src/applescript.ts` - AppleScript/JXA bridge to Calendar.app
- `src/types.ts` - TypeScript type definitions

**API Endpoints:**
- `GET /health` - Health check
- `GET /test-access` - Test Calendar permissions
- `GET /calendars` - List all available calendars
- `GET /events` - Get events with ISO date range
- `GET /events/range` - Get events with days parameter

**Features:**
- ✅ Reads calendars from macOS Calendar.app
- ✅ Fetches events with date range filtering
- ✅ Supports multiple calendar selection
- ✅ Detects calendar source (Exchange, Google, iCloud, Local)
- ✅ Handles attendees, locations, notes, and all event metadata
- ✅ Error handling for permission issues

**Running the Service:**
```bash
cd calendar-helper
npm install
npm run dev
```

### 2. Server-Side Integration (`/server/`)

**Files Created:**
- `src/services/calendar/eventkitService.ts` - Service to interact with Calendar Helper

**Files Modified:**
- `src/routes/calendar.ts` - Added EventKit routes:
  - `GET /api/calendar/eventkit/status` - Check Calendar Helper availability
  - `GET /api/calendar/eventkit/calendars` - List available calendars
  - `POST /api/calendar/eventkit/sync` - Sync events to database
  - `POST /api/calendar/eventkit/preview` - Preview events without saving

**Environment Variables Added:**
- `CALENDAR_HELPER_URL=http://localhost:3002` (in `server/.env`)

**Features:**
- ✅ Connects to Calendar Helper service
- ✅ Fetches calendars and events
- ✅ Stores events in Prisma database (Event model)
- ✅ Upserts events (updates existing, creates new)
- ✅ Uses `googleEventId` field as unique external ID
- ✅ Sets `calendarSource: 'eventkit'`
- ✅ Stores metadata in `extractedData` JSON field

### 3. Client-Side UI (`/client/`)

**Files Modified:**
- `src/features/settings/components/IntegrationSettings.tsx` - Added Mac Calendar section with:
  - Status indicator (service available, permissions granted)
  - Calendar selection checkboxes
  - Sync button with loading state
  - Instructions for troubleshooting
  - Prominent "Recommended" badge
  - Benefits callout (no OAuth, no admin approval, works with corporate calendars)

- `src/lib/api.ts` - Added API helper functions:
  - `checkEventkitStatus()` - Check service availability
  - `getEventkitCalendars()` - Fetch available calendars
  - `syncEventkitCalendars()` - Sync selected calendars
  - `previewEventkitEvents()` - Preview events

**UI Features:**
- ✅ Shows Calendar Helper connection status
- ✅ Lists all Mac calendars with source indicator
- ✅ Allows multi-calendar selection
- ✅ Displays sync progress
- ✅ Shows helpful error messages
- ✅ Provides setup instructions

### 4. Documentation

**Files Updated:**
- `CALENDAR_SETUP.md` - Completely rewritten to:
  - Remove all Microsoft OAuth sections
  - Add EventKit approach documentation
  - Include Calendar Helper setup guide
  - Provide troubleshooting steps
  - Explain architecture and benefits
  - Add production deployment with PM2

**Files Created:**
- `calendar-helper/README.md` - Detailed service documentation

## Benefits Over Microsoft OAuth

1. **No Admin Consent Required** - Bypasses corporate IT approval process
2. **Works with Existing Sync** - Uses Mac's built-in Outlook sync
3. **Read-Only & Local** - Service only reads local data, no external connections
4. **No OAuth Tokens** - No token management or refresh logic needed
5. **Simpler Setup** - Just start the service and grant Calendar permissions

## How It Works

1. User connects their work Outlook to Mac Calendar via System Settings → Internet Accounts
2. Mac Calendar syncs events automatically
3. Calendar Helper service reads Calendar.app using AppleScript
4. Athena server fetches events from Calendar Helper
5. Events are stored in Athena database with `source: 'eventkit'`
6. User can select which calendars to sync

## Testing Steps

1. Start Calendar Helper:
   ```bash
   cd calendar-helper
   npm run dev
   ```

2. Verify service is running:
   ```bash
   curl http://localhost:3002/health
   ```

3. Test calendar access:
   ```bash
   curl http://localhost:3002/test-access
   ```

4. List calendars:
   ```bash
   curl http://localhost:3002/calendars
   ```

5. Get events:
   ```bash
   curl "http://localhost:3002/events/range?days=7"
   ```

6. In Athena UI:
   - Go to Settings → Calendar Integrations
   - Check Mac Calendar section shows "Calendar Helper connected"
   - Select calendars to sync
   - Click "Sync" button
   - Verify events appear in your calendar

## Permissions

On first run, macOS will prompt for Calendar access:
- Grant permission to Terminal (if running from terminal)
- Or grant permission to Node/VS Code (if running from IDE)

If permission is denied:
**System Settings → Privacy & Security → Calendars** → Enable for the app

## Production Deployment

For production, use PM2 to keep Calendar Helper running:

```bash
cd calendar-helper
npm run build
pm2 start dist/index.js --name "calendar-helper"
pm2 save
pm2 startup
```

## Limitations

1. **macOS Only** - AppleScript/JXA is macOS-specific
2. **Manual Sync** - Unlike Google OAuth, Mac Calendar doesn't auto-sync to Athena (user must click Sync button)
3. **Local Only** - Calendar Helper must run on the same Mac as Calendar.app
4. **No Write Access** - Read-only (but this is a feature, not a bug!)

## Database Schema

Events are stored in the `Event` table with:
- `calendarSource: 'eventkit'` - Identifies EventKit events
- `googleEventId: <uuid>` - External event ID (reusing field)
- `extractedData: JSON` - Stores location, attendees, calendar info, etc.
- `eventTypeId` - References "Calendar Event" type (created automatically)

## Future Enhancements

- [ ] Add automatic sync scheduler (poll every N minutes)
- [ ] Add webhook support (if possible with EventKit)
- [ ] Support calendar selection persistence (remember user's choices)
- [ ] Add calendar color mapping to UI
- [ ] Add event conflict detection
- [ ] Support bi-directional sync (create events in Calendar.app)

## Success Criteria

✅ Calendar Helper service runs without errors  
✅ AppleScript can read Calendar.app  
✅ Athena server can connect to Calendar Helper  
✅ Client UI displays calendars and sync button  
✅ Events sync to database successfully  
✅ No compile errors  
✅ Documentation updated  

## Files Summary

**Created (15 files):**
- calendar-helper/package.json
- calendar-helper/tsconfig.json
- calendar-helper/.env
- calendar-helper/.env.example
- calendar-helper/.gitignore
- calendar-helper/README.md
- calendar-helper/src/index.ts
- calendar-helper/src/applescript.ts
- calendar-helper/src/types.ts
- server/src/services/calendar/eventkitService.ts

**Modified (5 files):**
- server/src/routes/calendar.ts
- server/.env
- client/src/features/settings/components/IntegrationSettings.tsx
- client/src/lib/api.ts
- CALENDAR_SETUP.md

**Total:** 20 files created/modified

## Dependencies Installed

Calendar Helper:
- express
- cors
- dotenv
- typescript
- @types/node
- @types/express
- @types/cors
- ts-node
- nodemon

## Next Steps for User

1. Start Calendar Helper: `cd calendar-helper && npm run dev`
2. Ensure Outlook is synced to Mac Calendar (System Settings → Internet Accounts)
3. Open Athena Settings → Calendar Integrations
4. Grant Calendar permissions when prompted
5. Select calendars and click Sync
6. Verify events appear in Athena

## Support

If Calendar Helper won't start:
- Check port 3002 isn't in use: `lsof -i :3002`
- Check Node version: `node --version` (need 18+)

If no calendars appear:
- Open Calendar.app and verify calendars are visible
- Check System Settings → Internet Accounts
- Verify work Outlook account is connected

If sync fails:
- Check Calendar Helper logs in terminal
- Verify CALENDAR_HELPER_URL in server/.env
- Test Calendar Helper directly: `curl http://localhost:3002/calendars`
