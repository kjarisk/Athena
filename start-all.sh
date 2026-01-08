#!/bin/bash

# Start all Athena services

echo "Starting Calendar Helper..."
cd /Users/kjartan.kristjansson/Projects/PersonalApps/Athena/calendar-helper
npm run build > /tmp/calendar-build.log 2>&1
node dist/index.js > /tmp/calendar-helper.log 2>&1 &
CALENDAR_PID=$!

sleep 3

echo "Starting Athena Server and Client..."
cd /Users/kjartan.kristjansson/Projects/PersonalApps/Athena
npm run dev

# Kill calendar helper when main app exits
kill $CALENDAR_PID 2>/dev/null
