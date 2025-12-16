import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Target
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CompetencyAnalysis {
  name: string;
  category: string;
  suggestedRating: number;
  currentRating: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  evidence: string[];
  selected?: boolean;
  customRating?: number;
}

interface CompetencyEditorProps {
  employeeId: string;
  employeeName: string;
  onComplete?: () => void;
  className?: string;
}

export default function CompetencyEditor({ 
  employeeId, 
  employeeName, 
  onComplete,
  className 
}: CompetencyEditorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    competencies: CompetencyAnalysis[];
    summary: string;
    focusAreas: string[];
  } | null>(null);
  const [expandedCompetency, setExpandedCompetency] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updateCompetenciesMutation = useMutation({
    mutationFn: (competencies: any[]) => 
      apiHelpers.bulkUpdateCompetencies(employeeId, competencies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      toast.success('Competencies updated');
      onComplete?.();
    },
    onError: () => {
      toast.error('Failed to update competencies');
    }
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await apiHelpers.analyzeCompetencies(employeeId);
      const data = response.data.data;
      setAnalysis({
        ...data,
        competencies: data.competencies.map((c: any) => ({
          ...c,
          selected: true,
          customRating: c.suggestedRating
        }))
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze competencies');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleCompetency = (name: string) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      competencies: analysis.competencies.map(c => 
        c.name === name ? { ...c, selected: !c.selected } : c
      )
    });
  };

  const updateRating = (name: string, rating: number) => {
    if (!analysis) return;
    setAnalysis({
      ...analysis,
      competencies: analysis.competencies.map(c => 
        c.name === name ? { ...c, customRating: rating } : c
      )
    });
  };

  const handleApply = () => {
    if (!analysis) return;
    
    const selectedCompetencies = analysis.competencies
      .filter(c => c.selected)
      .map(c => ({
        name: c.name,
        category: c.category,
        rating: c.customRating || c.suggestedRating
      }));

    if (selectedCompetencies.length === 0) {
      toast.error('Please select at least one competency to update');
      return;
    }

    updateCompetenciesMutation.mutate(selectedCompetencies);
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <Badge size="sm" variant="success">High Confidence</Badge>;
      case 'medium':
        return <Badge size="sm" variant="warning">Medium Confidence</Badge>;
      case 'low':
        return <Badge size="sm" variant="default">Low Confidence</Badge>;
      default:
        return null;
    }
  };

  const getRatingDiff = (current: number, suggested: number) => {
    const diff = suggested - current;
    if (diff > 0) return <span className="text-success">+{diff}</span>;
    if (diff < 0) return <span className="text-danger">{diff}</span>;
    return <span className="text-text-muted">No change</span>;
  };

  if (!analysis) {
    return (
      <div className={cn("p-6 bg-surface rounded-xl border border-surface", className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-text-primary">AI Competency Analysis</h3>
            <p className="text-sm text-text-secondary mt-1">
              Analyze {employeeName}'s competencies based on their performance data, 
              1:1 meetings, and feedback.
            </p>
          </div>
          <Button
            onClick={handleAnalyze}
            isLoading={isAnalyzing}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Analyze Competencies
          </Button>
        </div>
      </div>
    );
  }

  const selectedCount = analysis.competencies.filter(c => c.selected).length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary */}
      <div className="p-4 bg-surface rounded-xl">
        <h4 className="font-medium text-text-primary mb-2">Analysis Summary</h4>
        <p className="text-sm text-text-secondary">{analysis.summary}</p>
        
        {analysis.focusAreas.length > 0 && (
          <div className="mt-3">
            <span className="text-xs text-text-muted uppercase tracking-wide">Focus Areas</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {analysis.focusAreas.map((area, i) => (
                <Badge key={i} size="sm" variant="outline">{area}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Competency Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-text-secondary">
            Suggested Updates ({selectedCount} selected)
          </h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const allSelected = analysis.competencies.every(c => c.selected);
              setAnalysis({
                ...analysis,
                competencies: analysis.competencies.map(c => ({ ...c, selected: !allSelected }))
              });
            }}
          >
            {analysis.competencies.every(c => c.selected) ? 'Deselect All' : 'Select All'}
          </Button>
        </div>

        {analysis.competencies.map((competency) => (
          <motion.div
            key={competency.name}
            layout
            className={cn(
              "border rounded-xl overflow-hidden transition-all",
              competency.selected 
                ? "border-primary/30 bg-primary/5" 
                : "border-surface bg-surface/50 opacity-60"
            )}
          >
            {/* Header */}
            <div 
              className="p-4 flex items-center gap-3 cursor-pointer"
              onClick={() => setExpandedCompetency(
                expandedCompetency === competency.name ? null : competency.name
              )}
            >
              <input
                type="checkbox"
                checked={competency.selected}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleCompetency(competency.name);
                }}
                className="w-4 h-4 rounded"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-text-primary">{competency.name}</span>
                  {getConfidenceBadge(competency.confidence)}
                </div>
                <div className="flex items-center gap-3 text-sm mt-1">
                  <span className="text-text-muted">
                    Current: {competency.currentRating}/5
                  </span>
                  <span className="text-text-muted">→</span>
                  <span className="font-medium">
                    Suggested: {competency.suggestedRating}/5
                  </span>
                  {getRatingDiff(competency.currentRating, competency.suggestedRating)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Rating selector */}
                {competency.selected && (
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => updateRating(competency.name, rating)}
                        className={cn(
                          "w-7 h-7 rounded-full text-xs font-medium transition-all",
                          (competency.customRating || competency.suggestedRating) === rating
                            ? "bg-primary text-white"
                            : "bg-background hover:bg-surface text-text-muted"
                        )}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                )}
                
                {expandedCompetency === competency.name 
                  ? <ChevronUp className="w-5 h-5 text-text-muted" />
                  : <ChevronDown className="w-5 h-5 text-text-muted" />
                }
              </div>
            </div>

            {/* Expanded Content */}
            {expandedCompetency === competency.name && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pb-4 pt-0 border-t border-surface"
              >
                <div className="pt-3 space-y-3">
                  <div>
                    <span className="text-xs text-text-muted uppercase tracking-wide">Reasoning</span>
                    <p className="text-sm text-text-primary mt-1">{competency.reasoning}</p>
                  </div>
                  
                  {competency.evidence?.length > 0 && (
                    <div>
                      <span className="text-xs text-text-muted uppercase tracking-wide">Evidence</span>
                      <ul className="mt-1 space-y-1">
                        {competency.evidence.map((e, i) => (
                          <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                            <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-surface">
        <Button
          variant="ghost"
          onClick={() => setAnalysis(null)}
          leftIcon={<X className="w-4 h-4" />}
        >
          Discard
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleAnalyze}
            isLoading={isAnalyzing}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Re-analyze
          </Button>
          <Button
            onClick={handleApply}
            isLoading={updateCompetenciesMutation.isPending}
            disabled={selectedCount === 0}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Apply {selectedCount} Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
