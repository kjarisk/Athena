/**
 * Metrics Grid Component
 * Displays detailed action metrics in a grid layout
 */
import { 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  XCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { DashboardStatistics } from '@/hooks/useStatistics';
import { StatCard } from './StatCard';

interface MetricsGridProps {
  stats: DashboardStatistics;
}

export function MetricsGrid({ stats }: MetricsGridProps) {
  const completionRate = stats.totalActions > 0
    ? Math.round((stats.completedActions / stats.totalActions) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Actions"
          value={stats.totalActions}
          icon={Zap}
        />
        <StatCard
          label="Pending"
          value={stats.pendingActions}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="In Progress"
          value={stats.inProgressActions}
          icon={PlayCircle}
          color="blue"
        />
        <StatCard
          label="Completed"
          value={stats.completedActions}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          label="Overdue"
          value={stats.overdueActions}
          icon={AlertTriangle}
          color={stats.overdueActions > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Blockers"
          value={stats.blockers}
          icon={XCircle}
          color={stats.blockers > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Progress Bar */}
      <div className="bg-surface rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-secondary">
            Overall Completion Rate
          </span>
          <span className="text-sm font-bold text-text-primary">
            {completionRate}%
          </span>
        </div>
        <div className="h-3 bg-surface rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-text-muted">
          <span>{stats.completedActions} completed</span>
          <span>{stats.totalActions - stats.completedActions} remaining</span>
        </div>
      </div>
    </div>
  );
}
