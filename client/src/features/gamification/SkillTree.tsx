/**
 * Leadership Competencies Page
 * Self-assessment based competency tracking with development suggestions
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Target, 
  MessageSquare, 
  Lightbulb, 
  TrendingUp,
  Sparkles,
  Star,
  ChevronRight,
  Save,
  RefreshCw
} from 'lucide-react';
import api from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Competency categories and items
const COMPETENCIES = {
  'People Leadership': {
    icon: Users,
    color: 'text-teamlead bg-teamlead/10',
    items: [
      { id: 'coaching', name: 'Coaching & Mentoring', description: 'Developing team members through guidance and feedback' },
      { id: 'delegation', name: 'Delegation', description: 'Empowering others with appropriate authority and accountability' },
      { id: 'conflict', name: 'Conflict Resolution', description: 'Navigating disagreements productively' },
      { id: 'feedback', name: 'Giving Feedback', description: 'Providing constructive, actionable input' },
      { id: 'empathy', name: 'Empathy', description: 'Understanding and relating to team perspectives' }
    ]
  },
  'Strategic Thinking': {
    icon: Target,
    color: 'text-primary bg-primary/10',
    items: [
      { id: 'vision', name: 'Vision Setting', description: 'Creating and communicating a clear direction' },
      { id: 'prioritization', name: 'Prioritization', description: 'Focusing effort on what matters most' },
      { id: 'decision', name: 'Decision Making', description: 'Making sound choices with incomplete information' },
      { id: 'systems', name: 'Systems Thinking', description: 'Understanding complex interdependencies' },
      { id: 'innovation', name: 'Innovation', description: 'Encouraging new ideas and approaches' }
    ]
  },
  'Communication': {
    icon: MessageSquare,
    color: 'text-competence bg-competence/10',
    items: [
      { id: 'presentation', name: 'Presentation', description: 'Conveying ideas clearly to groups' },
      { id: 'listening', name: 'Active Listening', description: 'Fully engaging with what others share' },
      { id: 'writing', name: 'Written Communication', description: 'Clear, concise documentation' },
      { id: 'stakeholder', name: 'Stakeholder Management', description: 'Building relationships across the org' },
      { id: 'difficult', name: 'Difficult Conversations', description: 'Handling sensitive topics with care' }
    ]
  },
  'Execution': {
    icon: TrendingUp,
    color: 'text-manager bg-manager/10',
    items: [
      { id: 'planning', name: 'Planning & Organizing', description: 'Structuring work for success' },
      { id: 'accountability', name: 'Accountability', description: 'Taking ownership and following through' },
      { id: 'agility', name: 'Agility', description: 'Adapting quickly to change' },
      { id: 'results', name: 'Results Orientation', description: 'Focusing on outcomes over activity' },
      { id: 'continuous', name: 'Continuous Improvement', description: 'Always looking for better ways' }
    ]
  }
};

interface CompetencyRating {
  competencyId: string;
  rating: number; // 1-5
  updatedAt: string;
}

interface CompetencyData {
  ratings: CompetencyRating[];
  lastAssessment: string | null;
}

// Development tips by competency
const DEVELOPMENT_TIPS: Record<string, string[]> = {
  coaching: ['Ask more questions, give fewer answers', 'Schedule dedicated development time with each report', 'Use the GROW model for coaching conversations'],
  delegation: ['Match tasks to development goals', 'Define success criteria clearly', 'Follow up without micromanaging'],
  conflict: ['Address issues early before they escalate', 'Focus on interests, not positions', 'Seek win-win solutions'],
  feedback: ['Use the SBI model (Situation, Behavior, Impact)', 'Give feedback close to the event', 'Balance positive and constructive'],
  empathy: ['Practice perspective-taking before meetings', 'Ask about challenges, not just progress', 'Validate emotions before problem-solving'],
  vision: ['Connect daily work to bigger purpose', 'Revisit and communicate vision regularly', 'Co-create goals with your team'],
  prioritization: ['Use frameworks like Eisenhower Matrix', 'Learn to say no gracefully', 'Review priorities weekly'],
  decision: ['Document your decision-making rationale', 'Set decision deadlines to avoid paralysis', 'Include diverse perspectives'],
  systems: ['Map dependencies before major changes', 'Consider second-order effects', 'Build feedback loops'],
  innovation: ['Create safe space for experimentation', 'Celebrate learning from failure', 'Allocate time for exploration'],
  presentation: ['Start with the key message', 'Use stories and examples', 'Practice out loud'],
  listening: ['Put away devices during conversations', 'Summarize to confirm understanding', 'Ask follow-up questions'],
  writing: ['Use clear structure: context, content, action', 'Write for busy readers—lead with conclusions', 'Edit ruthlessly'],
  stakeholder: ['Map stakeholder interests early', 'Communicate proactively', 'Build relationships before you need them'],
  difficult: ['Prepare but don\'t over-script', 'Stay curious, not defensive', 'Focus on observable behaviors'],
  planning: ['Break large goals into milestones', 'Build in buffer time', 'Review and adjust plans regularly'],
  accountability: ['Make commitments visible', 'Own mistakes publicly', 'Follow through consistently'],
  agility: ['Build flexibility into plans', 'Embrace experimentation', 'Learn from rapid iterations'],
  results: ['Define clear success metrics', 'Remove busywork ruthlessly', 'Celebrate wins along the way'],
  continuous: ['Schedule retrospectives regularly', 'Seek feedback proactively', 'Read and learn continuously']
};

export default function SkillTree() {
  const queryClient = useQueryClient();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [pendingRatings, setPendingRatings] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current ratings
  const { data: competencyData, isLoading } = useQuery<CompetencyData>({
    queryKey: ['competencies'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/gamification/competencies');
        return data.data;
      } catch {
        // Return empty data if endpoint doesn't exist yet
        return { ratings: [], lastAssessment: null };
      }
    }
  });

  // Save ratings mutation
  const saveMutation = useMutation({
    mutationFn: async (ratings: Record<string, number>) => {
      await api.post('/gamification/competencies', { ratings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competencies'] });
      setPendingRatings({});
      setHasChanges(false);
      toast.success('Assessment saved!');
    },
    onError: () => {
      toast.error('Failed to save assessment');
    }
  });

  const handleRatingChange = (competencyId: string, rating: number) => {
    setPendingRatings(prev => ({ ...prev, [competencyId]: rating }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Merge existing ratings with pending
    const currentRatings = competencyData?.ratings.reduce((acc, r) => {
      acc[r.competencyId] = r.rating;
      return acc;
    }, {} as Record<string, number>) || {};
    
    const mergedRatings = { ...currentRatings, ...pendingRatings };
    saveMutation.mutate(mergedRatings);
  };

  const getRating = (competencyId: string): number => {
    if (pendingRatings[competencyId] !== undefined) {
      return pendingRatings[competencyId];
    }
    const existing = competencyData?.ratings.find(r => r.competencyId === competencyId);
    return existing?.rating || 0;
  };

  // Calculate category averages
  const getCategoryAverage = (items: { id: string }[]): number => {
    const ratings = items.map(item => getRating(item.id)).filter(r => r > 0);
    if (ratings.length === 0) return 0;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  };

  // Calculate overall score
  const getOverallScore = (): number => {
    const allItems = Object.values(COMPETENCIES).flatMap(cat => cat.items);
    const ratings = allItems.map(item => getRating(item.id)).filter(r => r > 0);
    if (ratings.length === 0) return 0;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner />
      </div>
    );
  }

  const overallScore = getOverallScore();
  const completedCount = Object.values(COMPETENCIES)
    .flatMap(cat => cat.items)
    .filter(item => getRating(item.id) > 0).length;
  const totalCount = Object.values(COMPETENCIES).flatMap(cat => cat.items).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-text-primary">
            Leadership Competencies
          </h1>
          <p className="text-text-secondary mt-1">
            Assess your skills and get personalized development suggestions
          </p>
        </div>
        
        {hasChanges && (
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            <Save size={16} />
            {saveMutation.isPending ? 'Saving...' : 'Save Assessment'}
          </Button>
        )}
      </div>

      {/* Overall Score */}
      <Card className="p-6 bg-gradient-ethereal">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/50 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">
                {overallScore > 0 ? overallScore.toFixed(1) : '—'} / 5.0
              </h2>
              <p className="text-text-secondary">Overall Leadership Score</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-text-primary">
              {completedCount} / {totalCount}
            </p>
            <p className="text-sm text-text-muted">Competencies rated</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>
      </Card>

      {/* Category Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {Object.entries(COMPETENCIES).map(([category, { icon: Icon, color, items }]) => {
          const avg = getCategoryAverage(items);
          const isExpanded = expandedCategory === category;
          
          return (
            <Card key={category} className="overflow-hidden">
              {/* Category Header */}
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-surface/50 transition-colors"
                onClick={() => setExpandedCategory(isExpanded ? null : category)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", color)}>
                    <Icon size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-text-primary">{category}</h3>
                    <p className="text-sm text-text-muted">
                      {avg > 0 ? `${avg.toFixed(1)} avg` : 'Not yet rated'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Mini rating display */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star
                        key={star}
                        size={14}
                        className={cn(
                          star <= Math.round(avg) 
                            ? "text-amber-400 fill-amber-400" 
                            : "text-gray-300"
                        )}
                      />
                    ))}
                  </div>
                  <ChevronRight 
                    className={cn(
                      "w-5 h-5 text-text-muted transition-transform",
                      isExpanded && "rotate-90"
                    )} 
                  />
                </div>
              </button>
              
              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 space-y-4 border-t border-surface-dark pt-4">
                      {items.map(item => {
                        const rating = getRating(item.id);
                        const tips = DEVELOPMENT_TIPS[item.id] || [];
                        
                        return (
                          <div key={item.id} className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-text-primary text-sm">
                                  {item.name}
                                </h4>
                                <p className="text-xs text-text-muted">{item.description}</p>
                              </div>
                              
                              {/* Star Rating */}
                              <div className="flex gap-1 ml-4">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <button
                                    key={star}
                                    onClick={() => handleRatingChange(item.id, star)}
                                    className="p-1 hover:scale-110 transition-transform"
                                  >
                                    <Star
                                      size={18}
                                      className={cn(
                                        "transition-colors",
                                        star <= rating 
                                          ? "text-amber-400 fill-amber-400" 
                                          : "text-gray-300 hover:text-amber-200"
                                      )}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {/* Development tip for low ratings */}
                            {rating > 0 && rating <= 3 && tips.length > 0 && (
                              <div className="p-2 bg-primary/5 rounded-lg">
                                <p className="text-xs text-text-secondary">
                                  <Lightbulb size={12} className="inline mr-1 text-primary" />
                                  <strong>Tip:</strong> {tips[0]}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>

      {/* Development Suggestions */}
      {overallScore > 0 && (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Lightbulb className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary text-lg">
                Development Focus Areas
              </h3>
              <p className="text-text-secondary mt-1 mb-4">
                Based on your self-assessment, consider focusing on these areas:
              </p>
              
              <div className="space-y-3">
                {Object.values(COMPETENCIES)
                  .flatMap(cat => cat.items)
                  .filter(item => {
                    const r = getRating(item.id);
                    return r > 0 && r <= 3;
                  })
                  .slice(0, 3)
                  .map(item => {
                    const tips = DEVELOPMENT_TIPS[item.id] || [];
                    return (
                      <div key={item.id} className="p-3 bg-surface rounded-lg">
                        <h4 className="font-medium text-text-primary">{item.name}</h4>
                        {tips.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {tips.slice(0, 2).map((tip, idx) => (
                              <li key={idx} className="text-sm text-text-secondary flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                
                {Object.values(COMPETENCIES)
                  .flatMap(cat => cat.items)
                  .filter(item => {
                    const r = getRating(item.id);
                    return r > 0 && r <= 3;
                  }).length === 0 && (
                  <p className="text-text-muted italic">
                    Great work! All your rated competencies are at level 4 or above. 
                    Keep growing and helping others develop!
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

