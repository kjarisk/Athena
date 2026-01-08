# Calendar Integration Setup Guide

This guide will help you set up calendar integrations for the Athena Leadership Assistant.

## Prerequisites

- macOS (for Mac Calendar/EventKit integration with work Outlook)
- Text editor for environment variables
- Access to Google Cloud Console (for personal Google Calendar - optional)
- Work calendar synced to Mac Calendar app via System Settings

---

## Step 1: Create Your Admin User

1. **Set environment variables** in your server `.env` file:

```bash
# Admin User Bootstrap
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=your-secure-password
ADMIN_NAME=Your Name
```

2. **Run the seed script** to create your admin account:

```bash
cd server
npm run db:seed
```

3. **Login** to the application with your admin credentials.

---

## Step 2: Google Calendar Integration (Personal Calendar)

### A. Create Google OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com)

2. **Create a new project** (or select existing):
   - Click "Select a project" → "New Project"
   - Name: "Athena Leadership Assistant"
   - Click "Create"

3. **Enable Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" (for personal use)
   - Fill in required fields:
     - App name: "Athena Leadership Assistant"
     - User support email: Your email
     - Developer contact: Your email
   - Add scope: `../auth/calendar.readonly`
   - Add yourself as a test user
   - Click "Save and Continue"

5. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Name: "Athena Web Client"
   - Authorized redirect URIs:
     - `http://localhost:3001/api/calendar/auth/google/callback`
     - (Add production URL later: `https://your-domain.com/api/calendar/auth/google/callback`)
   - Click "Create"
   - **Copy the Client ID and Client Secret**

### B. Add Google Credentials to Environment

Add to your `server/.env` file:

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/calendar/auth/google/callback
```

### C. Test Google Connection

1. Restart your server
2. Go to Settings → Integrations
3. Click "Connect" on Google Calendar
4. Authorize the application
5. You should be redirected back with a success message

---

## Step 3: Mac Calendar Integration (Work Calendar via EventKit)

**Recommended for corporate calendars** - This approach syncs your work Outlook calendar through macOS Calendar app, bypassing the need for Microsoft admin consent.

### Features

- ✅ **Auto-sync every 15 minutes** (just like Google Calendar)
- ✅ **No OAuth or admin approval** needed
- ✅ **Works with any calendar** synced to Mac (Outlook, Exchange, Google, iCloud)
- ✅ **Manual sync available** anytime via Settings

### A. Verify Calendar Sync (Prerequisites)

1. **Add work account to Mac**:
   - Open System Settings → Internet Accounts
   - Click "+" and add your Microsoft 365 work account
   - Enable "Calendars" toggle
   - Wait for sync to complete

2. **Verify in Calendar app**:
   - Open Calendar.app
   - You should see your work meetings
   - Confirm events are up to date

### B. Set Up Calendar Helper Service

The Calendar Helper is a local Node.js service that reads your Mac Calendar app and provides events to Athena.

1. **Create the service**:
   ```bash
   cd /Users/kjartan.kristjansson/Projects/PersonalApps/Athena
   mkdir calendar-helper
   cd calendar-helper
   npm init -y
   ```

2. **Install dependencies**:
   ```bash
   npm install express cors dotenv
   npm install --save-dev typescript @types/node @types/express ts-node nodemon
   ```

3. **Initialize TypeScript**:
   ```bash
   npx tsc --init
   ```

4. **The calendar-helper service code will be generated automatically** (see implementation files in `calendar-helper/src/`)

5. **Update package.json scripts**:
   ```json
   "scripts": {
     "dev": "nodemon --exec ts-node src/index.ts",
     "build": "tsc",
     "start": "node dist/index.js"
   }
   ```

### C. Configure Athena Server

Add to your `server/.env` file:

```bash
# Mac Calendar Helper (EventKit)
CALENDAR_HELPER_URL=http://localhost:3002
```

### D. Grant Calendar Permissions

On first run of the Calendar Helper:
1. macOS will prompt for Calendar access
2. Click "OK" to grant permission
3. If you miss it, go to System Settings → Privacy & Security → Calendars
4. Enable access for "Terminal" or "calendar-helper"

### E. Start the Services

You'll need three terminal windows:

**TGoogle and Mac Calendar should show "Connected" status
3. Check "Last synced" timestamp
4. Verify all three services are running (Helper, Server, Client)
cd calendar-helper
npm run dev
# Should see: "📅 Calendar Helper Service running on http://localhost:3002"
```

**Terminal 2 - Athena Server**:
```bash
cd server
npm run dev
# Should see server start on port 3001
```

**Terminal 3 - Athena Client**:
```bash
cd client
npm run dev
# Should see Vite dev server on port 5173
```

### F. Test Connection

1. Go to Settings → Integrations in Athena
2. Look for "Mac Calendar (EventKit)" section
3. The system is configured to show only your "Calendar" (work Exchange calendar)
4. Check the calendar checkbox and click "Sync Now"
5. Events from your work calendar should appear in your Events list

---

## Step 4: Verify Setup

### A. Check Calendar Status

1. Go to Settings → Integrations
2. Both calendars should show "Connected" status
3. Check "Last synced" timestamp

### B. View Synced Events

1. Go to Dashboard
2. Check upcoming events in the calendar sectioneventkit'`
4. EventKit events come from your Mac Calendar (including work Outlook)
3. Events should have `calendarSource: 'google'` or `'microsoft'`

### C. Test Time Insights (AI Feature)

1. Go to Dashboard
2. Look for time management insights
3. Or call the API directly:
   ```bash
   curl -X POST http://localhost:3001/api/ai/time-insights \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Automatic Syncing

The server automatically syncs calendars:
- **Google Calendar syncs every 15 minutes** (OAuth tokens refreshed as needed)
- **Mac Calendar syncs every 15 minutes** (auto-sync for selected calendars)
- **Syncs today and future 40 days** for Mac Calendar
- **Syncs past 30 days and future 60 days** for Google Calendar

Check server logs for sync activity:
```
Running scheduled calendar sync...
Calendar sync completed for 1 users
Synced 25 EventKit events for user xxx
```

**Note**: Mac Calendar auto-sync only runs for calendars you've selected in Settings. The Calendar Helper service must be running.

---

## Troubleshooting

### Google Calendar Issues

**Error: "Access blocked: This app's request is invalid"**
- Make sure you've enabled the Google Calendar API
- Check that your redirect URI exactly matches what's in the console

**Error: "Access denied"**
- Add yourself as a test user in the OAuth consent screen

### Mac Calendar (EventKit) Issues

**Error: "Calendar Helper not responding"**
- Check if Calendar Helper service is running on port 3002
- Run: `lsof -i :3002` to verify
- Restart: `cd calendar-helper && npm run dev`

**Error: "Permission denied"**
- Grant Calendar access in System Settings → Privacy & Security → Calendars
- Add "Terminal" or "Node" to allowed apps
- Restart Calendar Helper after granting permission

**Events not syncing from work calendar**
- Open Calendar.app and verify events are visible there
- Check if work account is still connected in System Settings
- Try removing and re-adding the work account
- Ensure "Calendars" toggle is ON in Internet Accounts

**Wrong calendar syncing**
- Use "Select Calendars" option in Settings → Integrations
- Deselect personal calendars you don't want synced
- Only select your work calendar for work events
**Error: Token refresh fails**
- Check that you included `offline_access` scope
- Reconnect the calendar integration

### General Issues

**Events not appearing**
- Check that sync completed successfully (Settings → Integrations → Last synced)
- Look for errors in server logs
- Try manual "Sync Now" button

**Calendar disconnects frequently**
- Token may be expiring without refresh
- Check `refreshToken` is stored in database
- Reconnect and ensure `offline_access` scope is granted

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use different credentials** for development vs production
3. **Rotate secrets** periodicaGoogle Cloud Console to match your domain
2. **Update environment variables**:
   ```bash
   GOOGLE_CALLBACK_URL=https://your-domain.com/api/calendar/auth/google/callback
   CLIENT_URL=https://your-domain.com
   ```
3. **Request Google OAuth verification** if making app public
4. **Calendar Helper must run on same machine** as Athena (macOS requirement)
5. **Use process manager** (PM2) to keep Calendar Helper running:
   ```bash
   npm install -g pm2
   pm2 start calendar-helper/dist/index.js --name calendar-helper
   pm2 save
   pm2 startup
   ```

1. **Update redirect URIs** in both Google and Azure to match your domain
2. **Update environment variables**:
   ```bash
   GOOGLE_CALLBACK_URL=https://your-domain.com/api/calendar/auth/google/callback
   MICROSOFT_CALLBACK_URL=https://your-domain.com/api/calendar/auth/microsoft/callback
   CLIENT_URL=https://your-domain.com
   ```
3. **Request Google OAuth verification** if making app public
4. **Request Microsoft admin consent** from IT for organization-wide deployment

---

## Next Steps

Once calendars are connected:

## Why EventKit Instead of Microsoft OAuth?

**The Problem**: Corporate Microsoft 365 calendars require admin consent for third-party app access. This can take days or weeks to get approved, or may be blocked entirely by IT policy.

**The Solution**: Your Mac already has access to your work calendar through System Settings → Internet Accounts. We use macOS Calendar.app via JXA (JavaScript for Automation) to read events locally, bypassing the need for Microsoft admin approval.

**Implementation Notes**:
- Calendar names are used as identifiers (JXA doesn't expose uid() method)
- Events are identified by composite keys (title + startDate)
- The service uses `.map()` and `.forEach()` instead of for-loops for JXA compatibility

**Trade-offs**:
- ✅ No admin approval needed
- ✅ Works immediately
- ✅ Reads all Mac-synced calendars (Outlook, Exchange, Google, iCloud)
- ✅ All data stays local
- ❌ Requires macOS (not Windows/Linux)
- ❌ Requires Calendar Helper service to run
- ❌ Manual sync (click button) vs automatic for Google Calendar

## Architecture

```
Your Mac Calendar.app
  ↓ (syncs via Internet Accounts)
Work Outlook Calendar

Calendar Helper Service (localhost:3002)
  ↓ (reads via AppleScript/EventKit)
Mac Calendar.app

Athena Server (localhost:3001)
  ↓ (HTTP requests)
Calendar Helper Service

Athena Client (localhost:5173)
  ↓ (displays events)
User Interface
```

## Support

If you encounter issues not covered here:

1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure database migrations ran successfully
4. Test OAuth flow in incognito/private browsing to rule out cache issues

For Microsoft calendar issues with admin consent, prepare this information for your IT team:
- **App Purpose**: Personal productivity tool for leadership tasks
- **Data Access**: Read-only calendar access
- **Data Storage**: Local database only, no cloud storage
- **Permissions**: `Calendars.Read`, `offline_access`
- **Vendor**: Self-hosted application
