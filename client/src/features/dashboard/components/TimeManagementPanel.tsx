import { useQuery } from '@tanstack/react-query';
import { Calendar, TrendingUp, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { apiHelpers } from '@/lib/api';

interface TimeInsight {
  type: 'warning' | 'info' | 'success';
  message: string;
}

interface TimeSuggestion {
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  actionable: boolean;
}

interface TimeAllocation {
  workAreaName: string;
  hours: number;
  percentage: number;
}

interface TimeManagementData {
  summary: string;
  insights: TimeInsight[];
  suggestions: TimeSuggestion[];
  timeAllocation: TimeAllocation[];
}

export function TimeManagementPanel() {
  const { data: timeData, isLoading, error } = useQuery<TimeManagementData>({
    queryKey: ['time-insights'],
    queryFn: apiHelpers.getTimeInsights,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">AI Time Insights</h3>
        </div>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  if (error || !timeData) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">AI Time Insights</h3>
        </div>
        <p className="text-sm text-text-muted">
          Connect your calendar to get AI-powered time management insights.
        </p>
      </Card>
    );
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-500/5';
      case 'medium':
        return 'border-l-amber-500 bg-amber-500/5';
      default:
        return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Clock className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">AI Time Insights</h3>
          <p className="text-xs text-text-muted">Analyzing your next 7 days</p>
        </div>
      </div>

      {/* Summary */}
      {timeData.summary && (
        <div className="mb-6 p-4 bg-surface rounded-lg border border-border">
          <p className="text-sm text-text-secondary leading-relaxed">
            {timeData.summary}
          </p>
        </div>
      )}

      {/* Insights */}
      {timeData.insights && timeData.insights.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Key Observations
          </h4>
          <div className="space-y-2">
            {timeData.insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2 text-sm"
              >
                {getInsightIcon(insight.type)}
                <span className="text-text-secondary flex-1">{insight.message}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Time Allocation */}
      {timeData.timeAllocation && timeData.timeAllocation.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Time Allocation This Week
          </h4>
          <div className="space-y-2">
            {timeData.timeAllocation.map((allocation, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary">
                      {allocation.workAreaName}
                    </span>
                    <span className="text-xs text-text-muted">
                      {allocation.hours.toFixed(1)}h ({allocation.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${allocation.percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {timeData.suggestions && timeData.suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3">
            💡 Recommendations
          </h4>
          <div className="space-y-2">
            {timeData.suggestions.map((suggestion, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-3 rounded-lg border-l-4 ${getPriorityColor(suggestion.priority)}`}
              >
                <p className="text-sm text-text-secondary">{suggestion.suggestion}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
