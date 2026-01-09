/**
 * Responsibilities Page - Insight-Driven
 * Analyzes your actual work to discover what you're responsible for
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Target, 
  Briefcase, 
  TrendingUp,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  ArrowRight,
  Clock,
  MessageSquare,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { 
  useResponsibilityInsights, 
  ResponsibilityInsight,
} from '@/hooks/useResponsibilities';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const categoryIcons: Record<string, typeof Users> = {
  'People & Individual Care': Users,
  'Team Development': MessageSquare,
  'Delivery & Execution': Target,
  'Strategy & Culture': TrendingUp
};

const categoryColors: Record<string, string> = {
  'People & Individual Care': 'text-teamlead bg-teamlead/10',
  'Team Development': 'text-competence bg-competence/10',
  'Delivery & Execution': 'text-primary bg-primary/10',
  'Strategy & Culture': 'text-manager bg-manager/10'
};

const categoryDescriptions: Record<string, string> = {
  'People & Individual Care': 'Your direct interactions with team members',
  'Team Development': 'Building and nurturing your teams',
  'Delivery & Execution': 'Getting work done and removing blockers',
  'Strategy & Culture': 'Shaping direction and organizational health'
};

export default function Responsibilities() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useResponsibilityInsights();
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={<Target className="w-6 h-6" />}
        title="Unable to load insights"
        description="We couldn't analyze your responsibilities. Try again later."
      />
    );
  }

  const { insights, summary } = data;
  
  // Count insights per category
  const categoryCounts = Object.entries(insights).reduce((acc, [category, items]) => {
    acc[category] = items.length;
    return acc;
  }, {} as Record<string, number>);
  
  const totalInsights = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  const handleEvidenceClick = (evidence: { type: string; id: string }) => {
    switch (evidence.type) {
      case 'action':
        navigate(`/actions?id=${evidence.id}`);
        break;
      case 'event':
        navigate(`/events/${evidence.id}`);
        break;
      case 'oneOnOne':
        navigate(`/events?type=oneOnOne&id=${evidence.id}`);
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-text-primary">
          Your Responsibilities
        </h1>
        <p className="text-text-secondary mt-1">
          Based on your activities over the last 3 months
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <SummaryCard 
          icon={Zap} 
          value={summary.totalActions} 
          label="Actions Taken" 
        />
        <SummaryCard 
          icon={Calendar} 
          value={summary.totalEvents} 
          label="Events Held" 
        />
        <SummaryCard 
          icon={MessageSquare} 
          value={summary.totalOneOnOnes} 
          label="1:1 Meetings" 
        />
        <SummaryCard 
          icon={Users} 
          value={summary.teamsManaged} 
          label="Teams" 
        />
        <SummaryCard 
          icon={Users} 
          value={summary.employeesManaged} 
          label="Team Members" 
        />
        <SummaryCard 
          icon={Briefcase} 
          value={summary.workAreasActive} 
          label="Work Areas" 
        />
      </div>

      {totalInsights === 0 ? (
        <EmptyState
          icon={<Target className="w-6 h-6" />}
          title="No insights yet"
          description="Start creating actions, scheduling events, and having 1:1s to discover your responsibility patterns."
        />
      ) : (
        <>
          {/* Category Overview */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(insights).map(([category, items]) => {
              const Icon = categoryIcons[category] || Target;
              const colorClass = categoryColors[category] || 'text-primary bg-primary/10';
              const isSelected = selectedCategory === category;
              
              return (
                <motion.div
                  key={category}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={cn(
                      "p-4 cursor-pointer transition-all",
                      isSelected && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedCategory(isSelected ? null : category)}
                  >
                    <div className="flex items-start justify-between">
                      <div className={cn("p-2 rounded-lg", colorClass)}>
                        <Icon size={20} />
                      </div>
                      <span className="text-2xl font-bold text-text-primary">
                        {items.length}
                      </span>
                    </div>
                    <h3 className="font-semibold text-text-primary mt-3 text-sm">
                      {category}
                    </h3>
                    <p className="text-xs text-text-muted mt-1">
                      {categoryDescriptions[category]}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Detailed Insights */}
          <div className="space-y-6">
            {Object.entries(insights)
              .filter(([category]) => !selectedCategory || category === selectedCategory)
              .map(([category, items]) => {
                if (items.length === 0) return null;
                
                const Icon = categoryIcons[category] || Target;
                const colorClass = categoryColors[category] || 'text-primary bg-primary/10';
                
                return (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", colorClass)}>
                        <Icon size={20} />
                      </div>
                      <h2 className="text-lg font-semibold text-text-primary">
                        {category}
                      </h2>
                    </div>
                    
                    <div className="grid gap-4">
                      {items.filter(Boolean).map((insight: ResponsibilityInsight) => (
                        <InsightCard
                          key={insight.id}
                          insight={insight}
                          isExpanded={expandedInsight === insight.id}
                          onToggle={() => setExpandedInsight(
                            expandedInsight === insight.id ? null : insight.id
                          )}
                          onEvidenceClick={handleEvidenceClick}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* Mental Model Tips */}
      <Card className="bg-gradient-ethereal p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/50">
            <Lightbulb className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-lg">
              Leadership Framework
            </h3>
            <p className="text-text-secondary mt-1">
              Your responsibilities span four key areas. Balance is key:
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="p-3 bg-white/50 rounded-lg">
                <h4 className="font-medium text-teamlead">People First</h4>
                <p className="text-sm text-text-secondary">
                  Your team's success is your success. Invest in 1:1s and career development.
                </p>
              </div>
              <div className="p-3 bg-white/50 rounded-lg">
                <h4 className="font-medium text-competence">Continuous Improvement</h4>
                <p className="text-sm text-text-secondary">
                  Teams that learn together grow together. Foster psychological safety.
                </p>
              </div>
              <div className="p-3 bg-white/50 rounded-lg">
                <h4 className="font-medium text-primary">Execution Excellence</h4>
                <p className="text-sm text-text-secondary">
                  Remove blockers, prioritize ruthlessly, and celebrate progress.
                </p>
              </div>
              <div className="p-3 bg-white/50 rounded-lg">
                <h4 className="font-medium text-manager">Strategic Vision</h4>
                <p className="text-sm text-text-secondary">
                  Document decisions, align stakeholders, and think long-term.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ 
  icon: Icon, 
  value, 
  label 
}: { 
  icon: typeof Users; 
  value: number; 
  label: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-xl font-bold text-text-primary">{value}</p>
          <p className="text-xs text-text-muted">{label}</p>
        </div>
      </div>
    </Card>
  );
}

// Insight Card Component
function InsightCard({ 
  insight, 
  isExpanded, 
  onToggle,
  onEvidenceClick
}: { 
  insight: ResponsibilityInsight;
  isExpanded: boolean;
  onToggle: () => void;
  onEvidenceClick: (evidence: { type: string; id: string }) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <button
        className="w-full p-4 text-left flex items-center justify-between hover:bg-surface/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <span className="text-lg font-bold text-primary">{insight.frequency}</span>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary">{insight.title}</h4>
            <p className="text-sm text-text-secondary">{insight.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {insight.lastActivity && (
            <span className="text-xs text-text-muted hidden sm:block">
              <Clock size={12} className="inline mr-1" />
              {formatDistanceToNow(new Date(insight.lastActivity), { addSuffix: true })}
            </span>
          )}
          <ChevronRight 
            className={cn(
              "w-5 h-5 text-text-muted transition-transform",
              isExpanded && "rotate-90"
            )} 
          />
        </div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 border-t border-surface-dark">
              {/* Evidence */}
              {insight.evidence.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Related Activities
                  </h5>
                  <div className="space-y-2">
                    {insight.evidence.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => onEvidenceClick(item)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded",
                            item.type === 'action' && "bg-primary/10 text-primary",
                            item.type === 'event' && "bg-teamlead/10 text-teamlead",
                            item.type === 'oneOnOne' && "bg-competence/10 text-competence"
                          )}>
                            {item.type === 'oneOnOne' ? '1:1' : item.type}
                          </span>
                          <span className="text-sm text-text-primary">{item.title}</span>
                        </div>
                        <ArrowRight size={14} className="text-text-muted" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Mental Model Tips */}
              {insight.mentalModelTips.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    <Lightbulb size={12} className="inline mr-1" />
                    Tips for This Area
                  </h5>
                  <ul className="space-y-1">
                    {insight.mentalModelTips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-text-secondary">
                        <CheckCircle2 size={14} className="text-success mt-0.5 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

