#!/usr/bin/env node

/**
 * Trigger Calendar permission prompt for Node.js
 * Run this to make macOS ask for Calendar access
 */

const { exec } = require('child_process');

console.log('🔐 Attempting to access Calendar.app...');
console.log('⚠️  You should see a permission dialog - click "OK" to grant access\n');

const script = `
tell application "Calendar"
    get name of calendars
end tell
`;

exec(`osascript -e '${script}'`, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Error:', error.message);
    console.error('\n📝 To fix this:');
    console.error('1. Go to System Settings → Privacy & Security → Calendars');
    console.error('2. Look for "node" or "Terminal" in the list');
    console.error('3. Enable the toggle');
    console.error('4. Run this script again');
    process.exit(1);
  }
  
  if (stderr) {
    console.error('⚠️  stderr:', stderr);
  }
  
  console.log('✅ Success! Calendar access granted');
  console.log('📅 Found calendars:', stdout.trim());
  console.log('\n✨ You can now start the calendar-helper service:');
  console.log('   npm run dev');
});
