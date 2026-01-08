# Calendar Helper Service

Local Node.js service that provides HTTP API access to macOS Calendar.app via AppleScript/JXA.

## Purpose

This service acts as a bridge between Athena and your Mac's Calendar app, allowing Athena to read calendar events from any calendar synced to your Mac (including work Outlook calendars synced via System Settings → Internet Accounts).

## Why This Exists

Corporate Microsoft 365 calendars require admin consent for OAuth access. By using this local service, we bypass that requirement by reading from your Mac's Calendar app, which already has access to your work calendar.

## Requirements

- macOS (AppleScript/JXA is macOS-only)
- Node.js 18 or higher
- Calendar.app with calendars synced
- Calendar permissions granted to Terminal/Node

## Installation

```bash
cd calendar-helper
npm install
```

## Configuration

Create a `.env` file:

```bash
PORT=3002
ALLOWED_ORIGIN=http://localhost:3001
```

## Running

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Endpoints

### GET /health
Health check

Response:
```json
{
  "status": "ok",
  "service": "calendar-helper",
  "version": "1.0.0"
}
```

### GET /test-access
Test calendar permissions

Response:
```json
{
  "success": true,
  "message": "Calendar access granted"
}
```

### GET /calendars
List all available calendars

Response:
```json
{
  "success": true,
  "calendars": [
    {
      "id": "calendar-uuid",
      "title": "Work Calendar",
      "type": "calendar",
      "source": "Exchange",
      "isSubscribed": false
    }
  ],
  "count": 1
}
```

### GET /events
Get events in date range

Parameters:
- `start` (required): ISO 8601 date string (e.g., `2024-01-01T00:00:00Z`)
- `end` (required): ISO 8601 date string
- `calendarIds` (optional): Comma-separated calendar IDs

Example:
```
GET /events?start=2024-01-01T00:00:00Z&end=2024-01-31T23:59:59Z&calendarIds=cal1,cal2
```

Response:
```json
{
  "success": true,
  "events": [
    {
      "id": "event-uuid",
      "title": "Team Meeting",
      "startDate": "2024-01-15T14:00:00Z",
      "endDate": "2024-01-15T15:00:00Z",
      "isAllDay": false,
      "location": "Conference Room A",
      "notes": "Quarterly planning discussion",
      "calendar": {
        "id": "calendar-uuid",
        "title": "Work Calendar",
        "source": "Exchange"
      },
      "attendees": ["colleague@example.com"],
      "status": "confirmed"
    }
  ],
  "count": 1
}
```

### GET /events/range
Get events with simpler date parameters

Parameters:
- `days` (optional, default: 7): Days ahead to fetch
- `daysBack` (optional, default: 0): Days back to fetch
- `calendarIds` (optional): Comma-separated calendar IDs

Example:
```
GET /events/range?days=30&daysBack=7&calendarIds=cal1
```

## Permissions

On first run, macOS will prompt for Calendar access. Grant permission to:
- Terminal (if running via terminal)
- Node (if running as a process)

If you miss the prompt, go to:
**System Settings → Privacy & Security → Calendars**

## Troubleshooting

**"Calendar access denied" error**
- Check System Settings → Privacy & Security → Calendars
- Ensure Terminal or Node has permission
- Restart the service after granting permission

**No events returned**
- Open Calendar.app and verify events are visible
- Check if your work account is still connected in System Settings → Internet Accounts
- Verify the date range covers your events

**Service won't start**
- Check if port 3002 is already in use: `lsof -i :3002`
- Check Node.js version: `node --version` (need 18+)

## Security

- Runs on localhost only (not exposed to internet)
- Only accepts connections from configured origin (Athena server)
- Read-only access to calendars
- No data stored or cached
- All communication over HTTP localhost (no external network)

## Development

The service uses:
- **Express**: HTTP server
- **AppleScript/JXA**: Interface with Calendar.app
- **TypeScript**: Type-safe code

File structure:
```
src/
├── index.ts        # Express server and routes
├── applescript.ts  # AppleScript/JXA calendar interface
└── types.ts        # TypeScript type definitions
```
