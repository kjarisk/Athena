import { Calendar, Shield, Apple } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { apiHelpers } from '@/lib/api';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';

interface IntegrationSettingsProps {
  calendarStatus: any;
  refetchCalendarStatus: () => void;
}

export default function IntegrationSettings({ calendarStatus, refetchCalendarStatus }: IntegrationSettingsProps) {
  const [eventkitStatus, setEventkitStatus] = useState<any>(null);
  const [eventkitCalendars, setEventkitCalendars] = useState<any[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([]);
  const [loadingEventkit, setLoadingEventkit] = useState(false);
  const [syncResult, setSyncResult] = useState<{ count: number; timestamp: Date } | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Check EventKit status and auto-setup on mount
  useEffect(() => {
    initializeEventKit();
  }, []); // Only run once on mount

  // Separate effect for auto-sync interval
  useEffect(() => {
    if (selectedCalendars.length === 0) return;
    
    // Auto-sync every 15 minutes
    const syncInterval = setInterval(() => {
      performSync(selectedCalendars, true); // Silent sync
    }, 15 * 60 * 1000); // 15 minutes
    
    return () => clearInterval(syncInterval);
  }, []); // Only set up interval once, don't re-create it

  const initializeEventKit = async () => {
    try {
      setInitializing(true);
      const response = await apiHelpers.checkEventkitStatus();
      setEventkitStatus(response);
      
      if (response.available && response.hasAccess) {
        const calendarsResponse = await apiHelpers.getEventkitCalendars();
        const calendars = calendarsResponse.calendars || [];
        setEventkitCalendars(calendars);
        
        // Auto-select all calendars (should be just "Calendar" now)
        const calendarIds = calendars.map((cal: any) => cal.id);
        setSelectedCalendars(calendarIds);
        
        // Automatically perform first sync
        if (calendarIds.length > 0) {
          setTimeout(() => performSync(calendarIds, true), 1000);
        }
      }
    } catch (error) {
      console.error('Error initializing EventKit:', error);
    } finally {
      setInitializing(false);
    }
  };

  const performSync = async (calendarIds: string[], silent = false) => {
    setLoadingEventkit(true);
    
    try {
      const result = await apiHelpers.syncEventkitCalendars({
        calendarIds,
        daysBack: 0,
        daysAhead: 40
      });
      
      const eventCount = result?.synced || 0;
      setSyncResult({ count: eventCount, timestamp: new Date() });
      
      if (!silent) {
        toast.success(`Synced ${eventCount} event${eventCount !== 1 ? 's' : ''} from Mac Calendar`);
      }
      
      refetchCalendarStatus();
    } catch (error: any) {
      console.error('Sync error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to sync Mac Calendar';
      if (!silent) {
        toast.error(errorMsg);
      }
    } finally {
      setLoadingEventkit(false);
    }
  };

  const handleEventkitSync = async () => {
    if (selectedCalendars.length === 0) {
      toast.error('Please select at least one calendar');
      return;
    }
    
    await performSync(selectedCalendars);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Integrations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Google Calendar */}
          <div className="p-4 border-2 border-surface rounded-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4285F4] flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Google Calendar</h4>
                  <p className="text-sm text-text-secondary">
                    Sync your personal calendar and get time insights
                  </p>
                  {calendarStatus?.google?.connected && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ Connected {calendarStatus.lastSync && `• Last synced: ${new Date(calendarStatus.lastSync).toLocaleString()}`}
                    </p>
                  )}
                </div>
              </div>
              {calendarStatus?.google?.connected ? (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    if (confirm('Disconnect Google Calendar?')) {
                      apiHelpers.disconnectGoogle().then(() => {
                        toast.success('Google Calendar disconnected');
                        refetchCalendarStatus();
                      });
                    }
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => {
                    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
                    const token = authData?.state?.token;
                    if (token) {
                      window.location.href = `http://localhost:3001/api/calendar/auth/google?token=${token}`;
                    } else {
                      toast.error('Please log in first');
                    }
                  }}
                >
                  Connect
                </Button>
              )}
            </div>
            <p className="text-xs text-text-muted mt-3">
              Read-only access • Syncs past 30 days, future 60 days • Auto-syncs every 15 minutes
            </p>
          </div>

          {/* Mac Calendar (EventKit) */}
          <div className="p-4 border-2 border-surface rounded-xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-text-primary flex items-center justify-center">
                  <Apple className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary flex items-center gap-2">
                    Mac Calendar 
                    <span className="px-2 py-0.5 text-xs bg-surface-hover text-text-secondary rounded-full">
                      Work Calendar
                    </span>
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Syncs your Exchange work calendar
                  </p>
                  
                  {/* Status Messages */}
                  {initializing && !eventkitStatus && (
                    <p className="text-xs text-text-muted mt-1">
                      🔄 Checking Calendar Helper service...
                    </p>
                  )}
                  
                  {initializing && eventkitStatus?.available && eventkitStatus?.hasAccess && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      🔄 Connecting to Calendar...
                    </p>
                  )}
                  
                  {!initializing && eventkitStatus?.available && eventkitStatus?.hasAccess && eventkitCalendars.length > 0 && (
                    <p className="text-xs text-text-secondary mt-1">
                      ✓ Connected{syncResult && ` • Last synced: ${syncResult.timestamp.toLocaleString()}`}
                    </p>
                  )}
                  
                  {!initializing && eventkitStatus && !eventkitStatus.available && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ Calendar Helper service not running
                    </p>
                  )}
                  
                  {!initializing && eventkitStatus?.available && !eventkitStatus?.hasAccess && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      ⚠️ Calendar permissions needed
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Calendar Selection (hidden if only 1 calendar, auto-selected) */}
            {!initializing && eventkitStatus?.available && eventkitStatus?.hasAccess && eventkitCalendars.length > 1 && (
              <div className="space-y-3 mt-4">
                <div className="text-sm font-medium text-text-primary">Select calendars to sync:</div>
                <div className="max-h-48 overflow-y-auto space-y-2 bg-surface rounded-lg p-3">
                  {eventkitCalendars.map((calendar) => (
                    <label 
                      key={calendar.id} 
                      className="flex items-center gap-2 p-2 hover:bg-surface-hover rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCalendars.includes(calendar.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCalendars([...selectedCalendars, calendar.id]);
                          } else {
                            setSelectedCalendars(selectedCalendars.filter(id => id !== calendar.id));
                          }
                        }}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">{calendar.title}</div>
                        <div className="text-xs text-text-muted">
                          {calendar.source} • {calendar.type}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Sync Status and Button */}
            {!initializing && eventkitStatus?.available && eventkitStatus?.hasAccess && eventkitCalendars.length > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  {syncResult ? (
                    <>Synced {syncResult.count} events • Auto-syncs every 15 minutes</>
                  ) : (
                    <>Auto-sync enabled • Syncs every 15 minutes</>
                  )}
                </p>
                <Button 
                  onClick={handleEventkitSync} 
                  disabled={selectedCalendars.length === 0 || loadingEventkit || initializing}
                  size="sm"
                  variant="ghost"
                >
                  {loadingEventkit ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Syncing...
                    </>
                  ) : (
                    <>Sync Now</>
                  )}
                </Button>
              </div>
            )}

            {!eventkitStatus?.available && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Calendar Helper not running</strong>
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Start the service: <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded">cd calendar-helper && npm run dev</code>
                </p>
              </div>
            )}

            {eventkitStatus?.available && !eventkitStatus?.hasAccess && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Calendar permissions needed</strong>
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Grant access in: System Settings → Privacy & Security → Calendars
                </p>
              </div>
            )}

            <p className="text-xs text-text-muted mt-3">
              Read-only access • Syncs today + next 40 days • Auto-syncs every 15 minutes
            </p>
          </div>

          {/* Figma */}
          <div className="p-4 border-2 border-surface rounded-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F24E1E] flex items-center justify-center">
                  <span className="text-white font-bold">F</span>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">FigJam</h4>
                  <p className="text-sm text-text-secondary">
                    Extract actions from workshop boards
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" disabled>
                Connect
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-3">
              Requires Figma API access token. Coming soon.
            </p>
          </div>

          {/* Azure DevOps */}
          <div className="p-4 border-2 border-surface rounded-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0078D7] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Azure DevOps</h4>
                  <p className="text-sm text-text-secondary">
                    Sync work items and track sprint progress
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" disabled>
                Connect
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-3">
              Requires Azure DevOps PAT. Coming soon.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
