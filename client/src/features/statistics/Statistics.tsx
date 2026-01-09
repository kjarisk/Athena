/**
 * Statistics Page
 * Comprehensive analytics dashboard with metrics, charts, and insights
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  Target,
  Calendar,
  Briefcase
} from 'lucide-react';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { 
  useDashboardStatistics, 
  useTimeAllocation, 
  useTeamComparison,
  TeamComparison 
} from '@/hooks/useStatistics';
import { StatCard } from './components/StatCard';
import { MetricsGrid } from './components/MetricsGrid';
import { TimeAllocationChart } from './components/TimeAllocationChart';
import { TeamComparisonTable } from './components/TeamComparisonTable';

type TabType = 'overview' | 'actions' | 'teams' | 'time';

export default function Statistics() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [weekOffset, setWeekOffset] = useState(0);
  
  const { data: stats, isLoading: statsLoading } = useDashboardStatistics();
  const { data: timeAllocation, isLoading: timeLoading } = useTimeAllocation(weekOffset);
  const { data: teamComparison, isLoading: teamsLoading } = useTeamComparison();
  
  const isLoading = statsLoading || timeLoading || teamsLoading;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'actions' as const, label: 'Actions', icon: CheckCircle2 },
    { id: 'teams' as const, label: 'Teams', icon: Users },
    { id: 'time' as const, label: 'Time', icon: Clock }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Statistics & Analytics
          </h1>
          <p className="text-text-secondary mt-1">
            Track your leadership metrics and team performance
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-dark">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px
              ${activeTab === tab.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Actions"
              value={stats.totalActions}
              icon={CheckCircle2}
            />
            <StatCard
              label="Completed"
              value={stats.completedActions}
              icon={Target}
              color="green"
            />
            <StatCard
              label="Meetings This Week"
              value={stats.meetingsThisWeek}
              icon={Calendar}
              subtitle={`${stats.meetingHoursThisWeek.toFixed(1)}h total`}
            />
            <StatCard
              label="Decisions"
              value={stats.decisionsThisWeek}
              icon={TrendingUp}
              subtitle="This week"
            />
          </div>

          {/* Overview Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-4">
              <h3 className="font-semibold text-text-primary mb-4">
                Action Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Pending</span>
                  <span className="font-medium text-text-primary">{stats.pendingActions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">In Progress</span>
                  <span className="font-medium text-text-primary">{stats.inProgressActions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Overdue</span>
                  <span className={`font-medium ${stats.overdueActions > 0 ? 'text-red-500' : 'text-text-primary'}`}>
                    {stats.overdueActions}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Blockers</span>
                  <span className={`font-medium ${stats.blockers > 0 ? 'text-amber-500' : 'text-text-primary'}`}>
                    {stats.blockers}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-text-primary mb-4">
                Leadership Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Teams Managed</span>
                  <span className="font-medium text-text-primary">{stats.teamsManaged}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Team Members</span>
                  <span className="font-medium text-text-primary">{stats.employeesManaged}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">1:1s This Week</span>
                  <span className="font-medium text-text-primary">{stats.oneOnOnesThisWeek}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-secondary">Decisions This Month</span>
                  <span className="font-medium text-text-primary">{stats.decisionsThisMonth}</span>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Actions Tab */}
      {activeTab === 'actions' && stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <MetricsGrid stats={stats} />
        </motion.div>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && teamComparison && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Teams"
              value={teamComparison.length}
              icon={Users}
            />
            <StatCard
              label="Avg Health Score"
              value={
                teamComparison.length > 0
                  ? Math.round(
                      teamComparison.reduce((sum: number, t: TeamComparison) => sum + (t.healthScore || 0), 0) / 
                      teamComparison.filter((t: TeamComparison) => t.healthScore !== null).length || 1
                    )
                  : '-'
              }
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              label="Total Blockers"
              value={teamComparison.reduce((sum: number, t: TeamComparison) => sum + t.blockerCount, 0)}
              icon={AlertTriangle}
              color={teamComparison.reduce((sum: number, t: TeamComparison) => sum + t.blockerCount, 0) > 0 ? 'amber' : 'green'}
            />
            <StatCard
              label="Overdue Actions"
              value={teamComparison.reduce((sum: number, t: TeamComparison) => sum + t.overdueActions, 0)}
              icon={Clock}
              color={teamComparison.reduce((sum: number, t: TeamComparison) => sum + t.overdueActions, 0) > 0 ? 'red' : 'green'}
            />
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-text-primary mb-4">
              Team Comparison
            </h3>
            <TeamComparisonTable teams={teamComparison} showDetails />
          </Card>
        </motion.div>
      )}

      {/* Time Tab */}
      {activeTab === 'time' && timeAllocation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Week Navigation */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="px-3 py-1 text-sm rounded border border-surface-dark hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
            >
              ← Previous Week
            </button>
            <span className="text-sm text-text-secondary">
              {weekOffset === 0 ? 'This Week' : `${weekOffset} week${weekOffset > 1 ? 's' : ''} ago`}
            </span>
            <button
              onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
              disabled={weekOffset === 0}
              className="px-3 py-1 text-sm rounded border border-surface-dark hover:bg-surface text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Next Week →
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard
              label="Total Hours Tracked"
              value={`${timeAllocation.totalHours.toFixed(1)}h`}
              icon={Clock}
            />
            <StatCard
              label="Focus Time"
              value={`${Math.max(0, 40 - timeAllocation.totalHours).toFixed(1)}h`}
              icon={Target}
              subtitle="Estimated (40h - meetings)"
            />
            <StatCard
              label="Areas Active"
              value={timeAllocation.allocation.length}
              icon={Briefcase}
            />
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-text-primary mb-4">
              Time Allocation by Work Area
            </h3>
            <TimeAllocationChart allocation={timeAllocation.allocation} />
          </Card>
        </motion.div>
      )}
    </div>
  );
}
