#!/usr/bin/env python3
"""
Fetch events from macOS Calendar using EventKit (much faster than AppleScript)
"""
import sys
import json
from datetime import datetime, timedelta
from Foundation import NSDate
from EventKit import EKEventStore, EKEntityTypeEvent

def main():
    if len(sys.argv) < 4:
        print("Usage: fetch-events.py <calendar_name> <days_back> <days_ahead>", file=sys.stderr)
        sys.exit(1)
    
    calendar_name = sys.argv[1]
    days_back = int(sys.argv[2])
    days_ahead = int(sys.argv[3])
    
    # Create event store
    store = EKEventStore.alloc().init()
    
    # Request access (should already be granted)
    def access_callback(granted, error):
        pass
    
    store.requestAccessToEntityType_completion_(EKEntityTypeEvent, access_callback)
    
    # Find the calendar
    calendars = store.calendarsForEntityType_(EKEntityTypeEvent)
    target_cal = None
    for cal in calendars:
        if cal.title() == calendar_name:
            target_cal = cal
            break
    
    if not target_cal:
        print(json.dumps({"error": f"Calendar '{calendar_name}' not found"}))
        sys.exit(1)
    
    # Calculate date range
    now = datetime.now()
    start_date = now - timedelta(days=days_back)
    end_date = now + timedelta(days=days_ahead)
    
    # Convert to NSDate
    start_ns = NSDate.dateWithTimeIntervalSince1970_(start_date.timestamp())
    end_ns = NSDate.dateWithTimeIntervalSince1970_(end_date.timestamp())
    
    # Create predicate
    predicate = store.predicateForEventsWithStartDate_endDate_calendars_(
        start_ns, end_ns, [target_cal]
    )
    
    # Fetch events
    events = store.eventsMatchingPredicate_(predicate)
    
    # Convert to JSON
    result = []
    for event in events:
        result.append({
            "id": event.eventIdentifier(),
            "title": event.title() or "",
            "startDate": event.startDate().timeIntervalSince1970(),
            "endDate": event.endDate().timeIntervalSince1970(),
            "isAllDay": event.isAllDay(),
            "location": event.location() or "",
            "notes": event.notes() or "",
            "url": event.URL().absoluteString() if event.URL() else "",
            "calendar": {
                "id": target_cal.title(),
                "title": target_cal.title(),
                "source": target_cal.source().title() if target_cal.source() else "Unknown"
            }
        })
    
    print(json.dumps(result))

if __name__ == "__main__":
    main()
