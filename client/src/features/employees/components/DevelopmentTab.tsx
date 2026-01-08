import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Target, Plus, Check, CheckSquare } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import CompetencyRadar from '@/components/CompetencyRadar';
import CompetencyEditor from '@/components/CompetencyEditor';

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface DevelopmentTabProps {
  employee: Employee;
}

export default function DevelopmentTab({ employee }: DevelopmentTabProps) {
  const [showCompetencyEditor, setShowCompetencyEditor] = useState(false);
  const queryClient = useQueryClient();

  // Fetch development plan
  const { data: developmentPlan, isLoading: isLoadingPlan } = useQuery({
    queryKey: ['developmentPlan', employee.id],
    queryFn: () => apiHelpers.getDevelopmentPlan(employee.id).then(r => r.data.data),
    staleTime: 30000
  });

  const generatePlanMutation = useMutation({
    mutationFn: () => apiHelpers.generateDevelopmentPlan(employee.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developmentPlan', employee.id] });
      toast.success('Development plan generated');
    },
    onError: () => {
      toast.error('Failed to generate plan');
    }
  });

  const createActionFromGoal = useMutation({
    mutationFn: apiHelpers.createAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      toast.success('Action created');
    }
  });

  const handleCreateAction = (goal: any) => {
    createActionFromGoal.mutate({
      title: goal.title,
      description: goal.description,
      priority: goal.priority?.toUpperCase() || 'MEDIUM',
      employeeId: employee.id,
      source: 'MANUAL'
    });
  };

  return (
    <div className="space-y-6">
      {/* Competency Radar */}
      <CompetencyRadar employeeId={employee.id} employeeRole={employee.role} />
      
      {/* Competency Editor Toggle */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>AI Competency Analysis</CardTitle>
          <Button
            variant={showCompetencyEditor ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setShowCompetencyEditor(!showCompetencyEditor)}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            {showCompetencyEditor ? 'Hide Analysis' : 'Analyze Competencies'}
          </Button>
        </CardHeader>
        {showCompetencyEditor && (
          <CardContent>
            <CompetencyEditor 
              employeeId={employee.id} 
              employeeName={employee.name}
              onComplete={() => setShowCompetencyEditor(false)}
            />
          </CardContent>
        )}
      </Card>

      {/* Development Plan */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Development Plan</CardTitle>
            {developmentPlan?.generatedAt && (
              <p className="text-xs text-text-muted mt-1">
                Last updated: {formatDate(developmentPlan.generatedAt)}
              </p>
            )}
          </div>
          <Button
            onClick={() => generatePlanMutation.mutate()}
            isLoading={generatePlanMutation.isPending}
            leftIcon={<Sparkles className="w-4 h-4" />}
            size="sm"
          >
            {developmentPlan ? 'Regenerate Plan' : 'Generate Plan'}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingPlan ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : developmentPlan ? (
            <div className="space-y-6">
              {/* Summary */}
              {developmentPlan.summary && (
                <div className="p-4 bg-surface rounded-xl">
                  <h4 className="font-medium text-text-primary mb-2">Overview</h4>
                  <p className="text-sm text-text-secondary">{developmentPlan.summary}</p>
                </div>
              )}

              {/* Focus Areas */}
              {developmentPlan.focusAreas?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-2">Focus Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {developmentPlan.focusAreas.map((area: string, i: number) => (
                      <Badge key={i} variant="secondary">{area}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals */}
              {developmentPlan.goals?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-3">Goals</h4>
                  <div className="space-y-4">
                    {developmentPlan.goals.map((goal: any, i: number) => (
                      <div 
                        key={goal.id || i} 
                        className="p-4 border border-surface rounded-xl hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h5 className="font-medium text-text-primary">{goal.title}</h5>
                              <Badge 
                                size="sm" 
                                variant={
                                  goal.priority === 'high' ? 'danger' :
                                  goal.priority === 'medium' ? 'warning' : 'default'
                                }
                              >
                                {goal.priority}
                              </Badge>
                              <Badge size="sm" variant="secondary">{goal.category}</Badge>
                              {goal.timeframe && (
                                <span className="text-xs text-text-muted">{goal.timeframe}</span>
                              )}
                            </div>
                            <p className="text-sm text-text-secondary">{goal.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCreateAction(goal)}
                            isLoading={createActionFromGoal.isPending}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Milestones */}
                        {goal.milestones?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-surface">
                            <span className="text-xs text-text-muted uppercase tracking-wide">Milestones</span>
                            <div className="mt-2 space-y-1">
                              {goal.milestones.map((milestone: any, j: number) => (
                                <div key={j} className="flex items-center gap-2 text-sm">
                                  <div className={cn(
                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                    milestone.completed 
                                      ? "border-success bg-success" 
                                      : "border-text-muted"
                                  )}>
                                    {milestone.completed && <Check className="w-2.5 h-2.5 text-white" />}
                                  </div>
                                  <span className={milestone.completed ? "text-text-muted line-through" : "text-text-primary"}>
                                    {milestone.title}
                                  </span>
                                  {milestone.targetDate && (
                                    <span className="text-xs text-text-muted">
                                      ({formatDate(milestone.targetDate)})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggested Actions */}
                        {goal.suggestedActions?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-surface">
                            <span className="text-xs text-text-muted uppercase tracking-wide">Suggested Actions</span>
                            <ul className="mt-2 space-y-1">
                              {goal.suggestedActions.map((action: string, j: number) => (
                                <li key={j} className="text-sm text-text-secondary flex items-start gap-2">
                                  <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Success Criteria */}
                        {goal.successCriteria?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-surface">
                            <span className="text-xs text-text-muted uppercase tracking-wide">Success Criteria</span>
                            <ul className="mt-2 space-y-1">
                              {goal.successCriteria.map((criteria: string, j: number) => (
                                <li key={j} className="text-sm text-text-secondary flex items-start gap-2">
                                  <CheckSquare className="w-4 h-4 text-success shrink-0 mt-0.5" />
                                  {criteria}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 mx-auto text-text-muted mb-3" />
              <p className="text-text-secondary mb-4">
                No development plan yet. Generate one using AI to create personalized goals
                based on {employee.name}'s competencies and growth areas.
              </p>
              <Button
                onClick={() => generatePlanMutation.mutate()}
                isLoading={generatePlanMutation.isPending}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Generate Development Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
