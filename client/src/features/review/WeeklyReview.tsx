import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  CheckCircle,
  Target,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { toast } from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useWeeklyReport, useRegenerateWeeklyReport, WeekComparison } from '@/hooks/useReports';
import { useAuthStore } from '@/stores/authStore';
import { WeeklyReportPDF } from '@/lib/pdf/WeeklyReportPDF';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';

interface AreaBreakdown {
  areaId: string;
  areaName: string;
  hours: number;
  percentage: number;
}

interface TeamBreakdown {
  teamId: string;
  teamName: string;
  hours: number;
  percentage: number;
}

interface AccomplishmentSummary {
  title: string;
  category?: string;
  completedAt: string;
}

interface DecisionSummary {
  title: string;
  description?: string;
  madeAt: string;
  context?: string;
}

// Helper for trend indicator
function TrendIndicator({ change, isPositive = true }: { change: number; isPositive?: boolean }) {
  const isGood = isPositive ? change >= 0 : change <= 0;
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  
  return (
    <div className={`flex items-center gap-1 text-xs ${
      change === 0 ? 'text-text-muted' : isGood ? 'text-green-500' : 'text-red-500'
    }`}>
      <Icon size={12} />
      <span>{change > 0 ? '+' : ''}{change.toFixed(1)}</span>
    </div>
  );
}

export default function WeeklyReview() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const { data: report, isLoading } = useWeeklyReport(weekOffset);
  const { data: previousReport } = useWeeklyReport(weekOffset + 1);
  const regenerateMutation = useRegenerateWeeklyReport();

  // Calculate week-over-week comparison
  const comparison: WeekComparison | null = report && previousReport ? {
    meetingHours: {
      current: report.meetingHours,
      previous: previousReport.meetingHours,
      change: report.meetingHours - previousReport.meetingHours
    },
    focusHours: {
      current: report.focusHours,
      previous: previousReport.focusHours,
      change: report.focusHours - previousReport.focusHours
    },
    actionsCompleted: {
      current: report.actionsCompleted,
      previous: previousReport.actionsCompleted,
      change: report.actionsCompleted - previousReport.actionsCompleted
    },
    actionsCreated: {
      current: report.actionsCreated,
      previous: previousReport.actionsCreated,
      change: report.actionsCreated - previousReport.actionsCreated
    },
    decisionsCount: {
      current: report.decisionsCount,
      previous: previousReport.decisionsCount,
      change: report.decisionsCount - previousReport.decisionsCount
    }
  } : null;

  const getWeekLabel = () => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === 1) return 'Last Week';
    return `${weekOffset} Weeks Ago`;
  };

  const getWeekDates = () => {
    const now = new Date();
    const targetDate = subWeeks(now, weekOffset);
    const start = startOfWeek(targetDate, { weekStartsOn: 1 });
    const end = endOfWeek(targetDate, { weekStartsOn: 1 });
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  const handleExportPDF = async () => {
    if (!report || !user) return;
    
    setIsExporting(true);
    try {
      const doc = <WeeklyReportPDF report={report} userName={user.name} />;
      const blob = await pdf(doc).toBlob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `weekly-review-${format(new Date(report.weekStart), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      await regenerateMutation.mutateAsync(weekOffset);
      toast.success('Report regenerated with AI summary!');
    } catch (error) {
      toast.error('Failed to regenerate report');
    }
  };

  const completionRate = report && report.actionsCreated > 0
    ? Math.round((report.actionsCompleted / report.actionsCreated) * 100)
    : 0;

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
            onClick={() => navigate('/')}
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

        <div className="flex items-center gap-2">
          {/* Export & Regenerate Buttons */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerateMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
            {regenerateMutation.isPending ? 'Generating...' : 'AI Summary'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting || !report}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>

          {/* Week Navigation */}
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(weekOffset + 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-text-primary min-w-[120px] text-center">
              {getWeekLabel()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(weekOffset - 1)}
              disabled={weekOffset === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {report?.summary && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-text-primary mb-2">AI Summary</h3>
              <p className="text-sm text-text-secondary">{report.summary}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Key Metrics with Week-over-Week Comparison */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            {comparison && (
              <TrendIndicator change={comparison.meetingHours.change} isPositive={false} />
            )}
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {report?.meetingHours.toFixed(1)}h
          </p>
          <p className="text-sm text-text-muted">Meeting Hours</p>
          {comparison && (
            <p className="text-xs text-text-muted mt-1">
              vs {comparison.meetingHours.previous.toFixed(1)}h last week
            </p>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            {comparison && (
              <TrendIndicator change={comparison.actionsCompleted.change} isPositive={true} />
            )}
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {report?.actionsCompleted}/{report?.actionsCreated}
          </p>
          <p className="text-sm text-text-muted">Actions Completed</p>
          <p className="text-xs text-text-muted mt-1">
            {completionRate}% completion rate
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            {comparison && (
              <TrendIndicator change={comparison.focusHours.change} isPositive={true} />
            )}
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {report?.focusHours.toFixed(1)}h
          </p>
          <p className="text-sm text-text-muted">Focus Time</p>
          <p className="text-xs text-text-muted mt-1">
            {report ? Math.round((report.focusHours / 40) * 100) : 0}% of work week
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Scale className="w-5 h-5 text-amber-500" />
            </div>
            {comparison && (
              <TrendIndicator change={comparison.decisionsCount.change} isPositive={true} />
            )}
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {report?.decisionsCount || 0}
          </p>
          <p className="text-sm text-text-muted">Decisions Made</p>
          {comparison && comparison.decisionsCount.previous > 0 && (
            <p className="text-xs text-text-muted mt-1">
              vs {comparison.decisionsCount.previous} last week
            </p>
          )}
        </Card>
      </div>

      {/* Time Allocation by Area */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Time by Work Area</h3>
          {!report?.breakdownByArea || report.breakdownByArea.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">
              No work area data this week
            </p>
          ) : (
            <div className="space-y-4">
              {report.breakdownByArea.map((area: AreaBreakdown, index: number) => (
                <motion.div
                  key={area.areaName}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">{area.areaName}</span>
                    <span className="text-sm text-text-muted">
                      {area.hours.toFixed(1)}h ({area.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${area.percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-full bg-primary"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Time by Team</h3>
          {!report?.breakdownByTeam || report.breakdownByTeam.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">
              No team data this week
            </p>
          ) : (
            <div className="space-y-4">
              {report.breakdownByTeam.map((team: TeamBreakdown, index: number) => (
                <motion.div
                  key={team.teamName}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">{team.teamName}</span>
                    <span className="text-sm text-text-muted">
                      {team.hours.toFixed(1)}h ({team.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-surface rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${team.percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="h-full bg-secondary"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Decisions Log */}
      {report?.decisionsLogged && report.decisionsLogged.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            <Scale className="w-5 h-5 inline mr-2 text-amber-500" />
            Key Decisions This Week
          </h3>
          <div className="space-y-3">
            {report.decisionsLogged.map((decision: DecisionSummary, index: number) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-surface rounded-lg border-l-4 border-amber-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-text-primary">{decision.title}</h4>
                    {decision.description && (
                      <p className="text-sm text-text-secondary mt-1">{decision.description}</p>
                    )}
                    {decision.context && (
                      <p className="text-xs text-text-muted mt-2 italic">
                        Context: {decision.context}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap ml-4">
                    {format(new Date(decision.madeAt), 'MMM d')}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Top Accomplishments */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">🎯 Top Accomplishments</h3>
        {!report?.topAccomplishments || report.topAccomplishments.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">
            No completed actions this week
          </p>
        ) : (
          <ul className="space-y-3">
            {report.topAccomplishments.map((accomplishment: AccomplishmentSummary, index: number) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 bg-surface rounded-lg"
              >
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm text-text-secondary">{accomplishment.title}</span>
                  {accomplishment.category && (
                    <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      {accomplishment.category}
                    </span>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>

      {/* Highlights & Recommendations */}
      {(report?.highlights?.length || report?.recommendations?.length) && (
        <div className="grid md:grid-cols-2 gap-6">
          {report?.highlights && report.highlights.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">✨ Highlights</h3>
              <ul className="space-y-2">
                {report.highlights.map((highlight: string, index: number) => (
                  <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {highlight}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {report?.recommendations && report.recommendations.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">💡 Recommendations</h3>
              <ul className="space-y-2">
                {report.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-secondary">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Next Week Planning */}
      {weekOffset === 0 && (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
          <h3 className="text-lg font-semibold text-text-primary mb-4">📅 Planning Next Week</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-text-secondary">
                Current meeting load: <strong>{report?.meetingHours.toFixed(1)}h/week</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span className="text-text-secondary">
                Focus time available: <strong>{report?.focusHours.toFixed(1)}h/week</strong>
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-text-secondary">
                Action completion rate: <strong>{completionRate}%</strong>
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
