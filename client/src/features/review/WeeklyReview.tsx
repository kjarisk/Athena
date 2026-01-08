import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle,
  Target,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiHelpers } from '@/lib/api';

interface WeeklyStats {
  totalMeetingHours: number;
  totalActions: number;
  completedActions: number;
  focusTimeHours: number;
  workAreaBreakdown: {
    name: string;
    hours: number;
    percentage: number;
    color: string;
  }[];
  topAccomplishments: string[];
  weekOverWeekChange: {
    meetings: number;
    actions: number;
  };
}

export default function WeeklyReview() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.

  const { data: weeklyData, isLoading } = useQuery<WeeklyStats>({
    queryKey: ['weekly-review', weekOffset],
    queryFn: async () => {
      // Calculate week dates
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - (weekOffset * 7));
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 7);

      // Fetch events and actions for the week
      const [eventsRes, actionsRes, workAreasRes] = await Promise.all([
        apiHelpers.getEvents(),
        apiHelpers.getActions(),
        apiHelpers.getWorkAreas()
      ]);

      // Extract data from API response structure
      const events = eventsRes.data?.data || eventsRes.data || [];
      const actions = actionsRes.data?.data || actionsRes.data || [];
      const workAreas = workAreasRes.data?.data || workAreasRes.data || [];

      // Filter for the target week
      const weekEvents = events.filter((e: any) => {
        const eventDate = new Date(e.startDate);
        return eventDate >= startDate && eventDate <= endDate;
      });

      const weekActions = actions.filter((a: any) => {
        const actionDate = a.completedAt ? new Date(a.completedAt) : null;
        return actionDate && actionDate >= startDate && actionDate <= endDate;
      });

      // Calculate meeting hours
      const totalMeetingHours = weekEvents.reduce((sum: number, event: any) => {
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      }, 0);

      // Calculate work area breakdown
      const workAreaMap = new Map();
      weekEvents.forEach((event: any) => {
        if (event.workAreaId) {
          const area = (workAreas as any[]).find((wa: any) => wa.id === event.workAreaId);
          if (area) {
            const start = new Date(event.startDate);
            const end = new Date(event.endDate);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            const current = workAreaMap.get(area.id) || { name: area.name, hours: 0, color: area.color };
            workAreaMap.set(area.id, { ...current, hours: current.hours + hours });
          }
        }
      });

      const workAreaBreakdown = Array.from(workAreaMap.values()).map((wa: any) => ({
        ...wa,
        percentage: Math.round((wa.hours / totalMeetingHours) * 100) || 0
      }));

      const completedActions = weekActions.filter((a: any) => a.status === 'COMPLETED').length;

      return {
        totalMeetingHours,
        totalActions: weekActions.length,
        completedActions,
        focusTimeHours: (40 - totalMeetingHours), // Assuming 40-hour work week
        workAreaBreakdown,
        topAccomplishments: weekActions
          .filter((a: any) => a.status === 'COMPLETED')
          .slice(0, 5)
          .map((a: any) => a.title),
        weekOverWeekChange: {
          meetings: 0, // Would need historical data
          actions: 0
        }
      };
    }
  });

  const getWeekLabel = () => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === -1) return 'Last Week';
    return `${Math.abs(weekOffset)} Weeks Ago`;
  };

  const getWeekDates = () => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - (weekOffset * 7));
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 7);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Weekly Review</h1>
            <p className="text-text-muted text-sm">{getWeekDates()}</p>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset(weekOffset - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-text-primary min-w-[120px] text-center">
            {getWeekLabel()}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekOffset(weekOffset + 1)}
            disabled={weekOffset === 0}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Meeting Hours</p>
              <p className="text-2xl font-bold text-text-primary">
                {weeklyData?.totalMeetingHours.toFixed(1)}h
              </p>
            </div>
          </div>
          {weeklyData?.weekOverWeekChange?.meetings !== 0 && weeklyData?.weekOverWeekChange?.meetings !== undefined && (
            <div className="flex items-center gap-1 text-xs">
              {(weeklyData?.weekOverWeekChange?.meetings ?? 0) > 0 ? (
                <TrendingUp className="w-3 h-3 text-red-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-green-500" />
              )}
              <span className="text-text-muted">
                {Math.abs(weeklyData?.weekOverWeekChange.meetings || 0)}% vs last week
              </span>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Actions Completed</p>
              <p className="text-2xl font-bold text-text-primary">
                {weeklyData?.completedActions}/{weeklyData?.totalActions}
              </p>
            </div>
          </div>
          <div className="text-xs text-text-muted">
            {weeklyData?.totalActions ? 
              Math.round((weeklyData.completedActions / weeklyData.totalActions) * 100) : 0
            }% completion rate
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Focus Time</p>
              <p className="text-2xl font-bold text-text-primary">
                {weeklyData?.focusTimeHours.toFixed(1)}h
              </p>
            </div>
          </div>
          <div className="text-xs text-text-muted">
            {weeklyData?.totalMeetingHours ? 
              Math.round((weeklyData.focusTimeHours / (weeklyData.focusTimeHours + weeklyData.totalMeetingHours)) * 100) : 0
            }% of work week
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Target className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Work Areas</p>
              <p className="text-2xl font-bold text-text-primary">
                {weeklyData?.workAreaBreakdown.length || 0}
              </p>
            </div>
          </div>
          <div className="text-xs text-text-muted">
            Active areas this week
          </div>
        </Card>
      </div>

      {/* Time Allocation */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Time Allocation by Work Area</h3>
        {weeklyData?.workAreaBreakdown.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">
            No calendar events with work area assignments this week
          </p>
        ) : (
          <div className="space-y-4">
            {weeklyData?.workAreaBreakdown.map((area, index) => (
              <motion.div
                key={area.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: area.color }}
                    />
                    <span className="text-sm font-medium text-text-primary">{area.name}</span>
                  </div>
                  <span className="text-sm text-text-muted">
                    {area.hours.toFixed(1)}h ({area.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${area.percentage}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="h-full"
                    style={{ backgroundColor: area.color }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Top Accomplishments */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">🎯 Top Accomplishments</h3>
        {weeklyData?.topAccomplishments.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">
            No completed actions this week
          </p>
        ) : (
          <ul className="space-y-3">
            {weeklyData?.topAccomplishments.map((accomplishment, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 bg-surface rounded-lg"
              >
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-text-secondary">{accomplishment}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>

      {/* Next Week Planning */}
      {weekOffset === 0 && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
          <h3 className="text-lg font-semibold text-text-primary mb-4">📅 Planning Next Week</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-text-secondary">
                Current meeting load: <strong>{weeklyData?.totalMeetingHours.toFixed(1)}h/week</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span className="text-text-secondary">
                Focus time available: <strong>{weeklyData?.focusTimeHours.toFixed(1)}h/week</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-text-secondary">
                Action completion rate: <strong>
                  {weeklyData?.totalActions ? 
                    Math.round((weeklyData.completedActions / weeklyData.totalActions) * 100) : 0
                  }%
                </strong>
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-text-muted italic">
              💡 Tip: Aim to keep meetings under 50% of your week to maintain productive focus time
            </p>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
