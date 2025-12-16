import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Plus,
  MessageSquare,
  Target,
  TrendingUp,
  Calendar,
  CheckSquare,
  X,
  Sparkles,
  AlertCircle,
  Lightbulb,
  Check
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { formatDate, formatStatus, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import CompetencyRadar from '@/components/CompetencyRadar';
import CompetencyEditor from '@/components/CompetencyEditor';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Target },
  { id: 'one-on-ones', label: '1:1s', icon: MessageSquare },
  { id: 'actions', label: 'Actions', icon: CheckSquare },
  { id: 'development', label: 'Development', icon: TrendingUp },
];

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isOneOnOneModalOpen, setIsOneOnOneModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => apiHelpers.getEmployee(id!).then(r => r.data.data)
  });

  const { data: workAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiHelpers.deleteEmployee(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate('/employees');
      toast.success('Employee removed');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.updateEmployee(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      setIsEditModalOpen(false);
      toast.success('Employee updated');
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.addEmployeeNote(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      setIsNoteModalOpen(false);
      toast.success('Note added');
    }
  });

  const addOneOnOneMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.addOneOnOne(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      setIsOneOnOneModalOpen(false);
      toast.success('1:1 recorded');
    }
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!employee) {
    return <div>Employee not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/employees')}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Avatar name={employee.name} src={employee.avatarUrl} size="xl" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wider text-text-primary uppercase">
              {employee.name}
            </h1>
            <p className="text-text-secondary">{employee.role}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'default'}>
                {formatStatus(employee.status)}
              </Badge>
              <span className="text-sm text-text-muted">{employee.team}</span>
              {employee.workArea && (
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: `${employee.workArea.color}20`,
                    color: employee.workArea.color 
                  }}
                >
                  {employee.workArea.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditModalOpen(true)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to remove this employee?')) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 className="w-4 h-4 text-danger" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-text-secondary">Email</dt>
                    <dd className="font-medium">{employee.email || 'Not set'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-text-secondary">Start Date</dt>
                    <dd className="font-medium">{formatDate(employee.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-text-secondary">Team</dt>
                    <dd className="font-medium">{employee.team}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Strengths & Growth Areas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-2">Strengths</h4>
                    <div className="flex flex-wrap gap-2">
                      {employee.strengths?.length > 0 ? (
                        employee.strengths.map((s: string, i: number) => (
                          <Badge key={i} variant="success">{s}</Badge>
                        ))
                      ) : (
                        <p className="text-text-muted text-sm">No strengths added yet</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-text-secondary mb-2">Growth Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {employee.growthAreas?.length > 0 ? (
                        employee.growthAreas.map((g: string, i: number) => (
                          <Badge key={i} variant="warning">{g}</Badge>
                        ))
                      ) : (
                        <p className="text-text-muted text-sm">No growth areas identified yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card className="md:col-span-2 bg-gradient-ethereal border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <CardTitle>AI Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {employee.oneOnOnes?.length > 0 ? (
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Mood Trend */}
                    <div className="p-4 bg-white/50 rounded-xl">
                      <h4 className="text-sm font-medium text-text-secondary mb-2">Mood Trend</h4>
                      <div className="flex items-center gap-2">
                        {employee.oneOnOnes.slice(0, 5).reverse().map((o: any, i: number) => (
                          <span key={i} className="text-xl" title={formatDate(o.date)}>
                            {['', '', '', '', ''][o.mood - 1] || ''}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-text-muted mt-2">
                        Last {Math.min(employee.oneOnOnes.length, 5)} 1:1s
                      </p>
                    </div>

                    {/* Common Topics */}
                    <div className="p-4 bg-white/50 rounded-xl">
                      <h4 className="text-sm font-medium text-text-secondary mb-2">Common Topics</h4>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const topicCounts: Record<string, number> = {};
                          employee.oneOnOnes.forEach((o: any) => {
                            o.topics?.forEach((t: string) => {
                              topicCounts[t] = (topicCounts[t] || 0) + 1;
                            });
                          });
                          return Object.entries(topicCounts)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([topic, count]) => (
                              <Badge key={topic} size="sm" variant="secondary">
                                {topic} ({count})
                              </Badge>
                            ));
                        })()}
                      </div>
                    </div>

                    {/* Last 1:1 Summary */}
                    <div className="p-4 bg-white/50 rounded-xl">
                      <h4 className="text-sm font-medium text-text-secondary mb-2">Last 1:1</h4>
                      <p className="text-sm text-text-primary">
                        {formatDate(employee.oneOnOnes[0]?.date)}
                      </p>
                      {employee.oneOnOnes[0]?.followUps?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-text-muted">Follow-ups:</p>
                          <ul className="text-xs text-text-secondary">
                            {employee.oneOnOnes[0].followUps.slice(0, 2).map((f: string, i: number) => (
                              <li key={i} className="truncate">- {f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-text-muted text-center py-4">
                    Record a 1:1 to start seeing insights
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Notes */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Notes</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setIsNoteModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {employee.notes?.length > 0 ? (
                  <ul className="space-y-3">
                    {employee.notes.map((note: any) => (
                      <li key={note.id} className="p-3 bg-surface rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <Badge size="sm">{formatStatus(note.type)}</Badge>
                          <span className="text-xs text-text-muted">
                            {formatDate(note.createdAt)}
                          </span>
                        </div>
                        <p className="text-text-primary">{note.content}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-text-muted text-center py-4">No notes yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'one-on-ones' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>1:1 History</CardTitle>
                <Button size="sm" onClick={() => setIsOneOnOneModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Record 1:1
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {employee.oneOnOnes?.length > 0 ? (
                <ul className="space-y-4">
                  {employee.oneOnOnes.map((oneOnOne: any) => (
                    <li key={oneOnOne.id} className="p-4 bg-surface rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-text-muted" />
                          <span className="font-medium">{formatDate(oneOnOne.date)}</span>
                        </div>
                        {oneOnOne.mood && (
                          <span className="text-lg">
                            {['','','','',''][oneOnOne.mood - 1]}
                          </span>
                        )}
                      </div>
                      {oneOnOne.topics?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {oneOnOne.topics.map((topic: string, i: number) => (
                            <Badge key={i} size="sm" variant="secondary">{topic}</Badge>
                          ))}
                        </div>
                      )}
                      {oneOnOne.notes && (
                        <p className="text-sm text-text-secondary">{oneOnOne.notes}</p>
                      )}
                      {oneOnOne.followUps?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-surface">
                          <p className="text-xs text-text-muted mb-1">Follow-ups:</p>
                          <ul className="text-sm space-y-1">
                            {oneOnOne.followUps.map((fu: string, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <CheckSquare className="w-3 h-3 text-text-muted" />
                                {fu}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted text-center py-8">
                  No 1:1s recorded yet. Schedule your first one!
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'actions' && (
          <Card>
            <CardHeader>
              <CardTitle>Linked Actions</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.actions?.length > 0 ? (
                <ul className="space-y-2">
                  {employee.actions.map((action: any) => (
                    <li key={action.id} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckSquare className={cn(
                          "w-5 h-5",
                          action.status === 'COMPLETED' ? 'text-success' : 'text-text-muted'
                        )} />
                        <span className={cn(
                          action.status === 'COMPLETED' && 'line-through text-text-muted'
                        )}>
                          {action.title}
                        </span>
                      </div>
                      <Badge variant={action.status === 'COMPLETED' ? 'success' : 'default'} size="sm">
                        {formatStatus(action.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted text-center py-8">
                  No actions linked to this employee
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'development' && (
          <DevelopmentTab employee={employee} />
        )}
      </motion.div>

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSubmit={(data) => addNoteMutation.mutate(data)}
        isLoading={addNoteMutation.isPending}
      />

      {/* Add 1:1 Modal */}
      <AddOneOnOneModal
        isOpen={isOneOnOneModalOpen}
        onClose={() => setIsOneOnOneModalOpen(false)}
        onSubmit={(data) => addOneOnOneMutation.mutate(data)}
        isLoading={addOneOnOneMutation.isPending}
        employeeId={id}
        employee={employee}
      />

      {/* Edit Employee Modal */}
      <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employee={employee}
        workAreas={workAreas || []}
        onSubmit={(data) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}

function DevelopmentTab({ employee }: { employee: any }) {
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
                      <Badge key={i} variant="outline">{area}</Badge>
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
                              <Badge size="sm" variant="outline">{goal.category}</Badge>
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

function AddNoteModal({ isOpen, onClose, onSubmit, isLoading }: any) {
  const [content, setContent] = useState('');
  const [type, setType] = useState('GENERAL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ content, type });
    setContent('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Note">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label="Note"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          required
        />
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Add Note</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function AddOneOnOneModal({ isOpen, onClose, onSubmit, isLoading, employeeId, employee }: any) {
  const [step, setStep] = useState<'input' | 'analysis'>('input');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    notes: '',
    mood: 3,
    topics: ''
  });
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editableActions, setEditableActions] = useState<any[]>([]);
  const [actionSettings, setActionSettings] = useState({
    linkToEmployee: true,
    teamId: '',
    workAreaId: employee?.workAreaId || '',
    groupAsSubtasks: false,
    parentTitle: ''
  });
  const [editableCompetencies, setEditableCompetencies] = useState<any[]>([]);
  const queryClient = useQueryClient();

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiHelpers.getTeams().then(r => r.data.data),
    enabled: isOpen
  });

  // Fetch work areas  
  const { data: workAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data),
    enabled: isOpen
  });

  const createActionMutation = useMutation({
    mutationFn: apiHelpers.createAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    }
  });

  const createGroupedActionsMutation = useMutation({
    mutationFn: ({ parentAction, subtasks }: any) => 
      apiHelpers.createGroupedActions(parentAction, subtasks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    }
  });

  const updateCompetenciesMutation = useMutation({
    mutationFn: (competencies: any[]) => 
      apiHelpers.bulkUpdateCompetencies(employeeId, competencies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
    }
  });

  const handleAnalyze = async () => {
    if (!formData.notes.trim()) {
      toast.error('Please enter some notes to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await apiHelpers.analyzeOneOnOne(formData.notes, employeeId);
      const data = response.data.data;
      setAnalysis(data);
      
      // Convert actions to editable format with selection state
      setEditableActions(
        (data.actions || []).map((action: any, i: number) => ({
          ...action,
          id: `action-${i}`,
          selected: true,
          priority: action.priority?.toUpperCase() || 'MEDIUM'
        }))
      );
      
      // Convert competencies to editable format
      setEditableCompetencies(
        (data.competencySuggestions || []).map((c: any, i: number) => ({
          ...c,
          id: `comp-${i}`,
          selected: true
        }))
      );
      
      // Set work area from employee
      setActionSettings(prev => ({
        ...prev,
        workAreaId: employee?.workAreaId || ''
      }));
      
      setStep('analysis');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze notes. Saving without AI insights.');
      handleSaveWithoutAI();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveWithoutAI = () => {
    onSubmit({
      ...formData,
      topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
      mood: analysis?.mood || formData.mood
    });
    resetModal();
  };

  const updateAction = (id: string, field: string, value: any) => {
    setEditableActions(prev => 
      prev.map(a => a.id === id ? { ...a, [field]: value } : a)
    );
  };

  const toggleActionSelection = (id: string) => {
    setEditableActions(prev => 
      prev.map(a => a.id === id ? { ...a, selected: !a.selected } : a)
    );
  };

  const toggleCompetencySelection = (id: string) => {
    setEditableCompetencies(prev => 
      prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c)
    );
  };

  const handleSaveWithActions = async () => {
    // First save the 1:1
    onSubmit({
      ...formData,
      topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean),
      mood: analysis?.mood || formData.mood,
      followUps: analysis?.keyTakeaways || []
    });

    const selectedActions = editableActions.filter(a => a.selected);
    
    if (selectedActions.length > 0) {
      const baseActionData = {
        employeeId: actionSettings.linkToEmployee ? employeeId : undefined,
        workAreaId: actionSettings.workAreaId || undefined,
        teamId: actionSettings.teamId || undefined,
        source: 'ONE_ON_ONE'
      };

      try {
        if (actionSettings.groupAsSubtasks && selectedActions.length > 1) {
          // Create as grouped actions
          await createGroupedActionsMutation.mutateAsync({
            parentAction: {
              title: actionSettings.parentTitle || `1:1 Follow-ups: ${employee?.name || 'Team Member'}`,
              description: `Actions from 1:1 on ${formData.date}`,
              priority: 'MEDIUM',
              ...baseActionData
            },
            subtasks: selectedActions.map(action => ({
              title: action.title,
              description: action.description,
              priority: action.priority,
              ...baseActionData
            }))
          });
          toast.success(`Created grouped action with ${selectedActions.length} sub-tasks`);
        } else {
          // Create individual actions
          for (const action of selectedActions) {
            await createActionMutation.mutateAsync({
              title: action.title,
              description: action.description,
              priority: action.priority,
              ...baseActionData
            });
          }
          toast.success(`Created ${selectedActions.length} action(s) from 1:1`);
        }
      } catch (error) {
        console.error('Failed to create actions:', error);
        toast.error('Failed to create some actions');
      }
    }

    // Save selected competencies
    const selectedCompetencies = editableCompetencies.filter(c => c.selected);
    if (selectedCompetencies.length > 0) {
      try {
        await updateCompetenciesMutation.mutateAsync(
          selectedCompetencies.map(c => ({
            category: c.category,
            name: c.name,
            ratingChange: c.change
          }))
        );
        toast.success('Competencies updated');
      } catch (error) {
        console.error('Failed to update competencies:', error);
      }
    }

    // Auto-trigger development plan update in background
    try {
      apiHelpers.generateDevelopmentPlan(employeeId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['developmentPlan', employeeId] });
        toast.success('Development plan updated', { duration: 2000 });
      }).catch(err => {
        console.error('Failed to update development plan:', err);
      });
    } catch (error) {
      // Silently fail - this is a background task
      console.error('Failed to trigger development plan update:', error);
    }

    resetModal();
  };

  const resetModal = () => {
    setStep('input');
    setFormData({
      date: new Date().toISOString().split('T')[0],
      notes: '',
      mood: 3,
      topics: ''
    });
    setAnalysis(null);
    setEditableActions([]);
    setEditableCompetencies([]);
    setActionSettings({
      linkToEmployee: true,
      teamId: '',
      workAreaId: employee?.workAreaId || '',
      groupAsSubtasks: false,
      parentTitle: ''
    });
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={step === 'analysis' ? '1:1 Analysis' : 'Record 1:1'} 
      size="xl"
    >
      {step === 'input' && (
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <Input
            label="Topics (comma-separated)"
            value={formData.topics}
            onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
            placeholder="Career, Feedback, Goals"
          />
          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Key discussion points, concerns raised, wins discussed..."
            className="min-h-[150px]"
          />
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button 
              type="button" 
              variant="secondary"
              onClick={handleSaveWithoutAI}
              isLoading={isLoading}
            >
              Save (No AI)
            </Button>
            <Button 
              type="button" 
              onClick={handleAnalyze}
              isLoading={isAnalyzing}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Analyze & Save
            </Button>
          </ModalFooter>
        </div>
      )}

      {step === 'analysis' && analysis && (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Mood & Key Takeaways Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface rounded-xl">
              <span className="text-sm font-medium text-text-secondary">Detected Mood</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl">{['', '', '', '', ''][analysis.mood - 1]}</span>
                <span className="text-sm text-text-muted">{analysis.mood}/5</span>
              </div>
            </div>
            {analysis.keyTakeaways?.length > 0 && (
              <div className="p-4 bg-surface rounded-xl">
                <span className="text-sm font-medium text-text-secondary flex items-center gap-1">
                  <Lightbulb className="w-4 h-4" /> Key Takeaways
                </span>
                <ul className="mt-1 space-y-0.5">
                  {analysis.keyTakeaways.slice(0, 3).map((t: string, i: number) => (
                    <li key={i} className="text-xs text-text-primary truncate">{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Insights */}
          {analysis.insights?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Insights
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysis.insights.map((insight: any, i: number) => (
                  <div 
                    key={i} 
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs",
                      insight.type === 'concern' && "bg-danger/10 text-danger",
                      insight.type === 'win' && "bg-success/10 text-success",
                      insight.type === 'growth' && "bg-primary/10 text-primary",
                      insight.type === 'mood' && "bg-warning/10 text-warning",
                      insight.type === 'feedback' && "bg-secondary/10 text-secondary"
                    )}
                    title={insight.content}
                  >
                    <span className="font-medium">{insight.type}:</span> {insight.content.substring(0, 50)}...
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions Section */}
          {editableActions.length > 0 && (
            <div className="border-t border-surface pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" /> Actions to Create ({editableActions.filter(a => a.selected).length} selected)
                </h4>
              </div>

              {/* Action Settings */}
              <div className="bg-surface p-4 rounded-xl mb-4 space-y-3">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={actionSettings.linkToEmployee}
                      onChange={(e) => setActionSettings(prev => ({ ...prev, linkToEmployee: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Link to {employee?.name}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={actionSettings.groupAsSubtasks}
                      onChange={(e) => setActionSettings(prev => ({ ...prev, groupAsSubtasks: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Group as sub-tasks</span>
                  </label>
                </div>
                
                {actionSettings.groupAsSubtasks && (
                  <Input
                    label="Parent Action Title"
                    value={actionSettings.parentTitle}
                    onChange={(e) => setActionSettings(prev => ({ ...prev, parentTitle: e.target.value }))}
                    placeholder={`1:1 Follow-ups: ${employee?.name || 'Team Member'}`}
                  />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Team (optional)"
                    value={actionSettings.teamId}
                    onChange={(e) => setActionSettings(prev => ({ ...prev, teamId: e.target.value }))}
                    options={[
                      { value: '', label: 'No team' },
                      ...(teams || []).map((t: any) => ({ value: t.id, label: t.name }))
                    ]}
                  />
                  <Select
                    label="Work Area"
                    value={actionSettings.workAreaId}
                    onChange={(e) => setActionSettings(prev => ({ ...prev, workAreaId: e.target.value }))}
                    options={[
                      { value: '', label: 'No area' },
                      ...(workAreas || []).map((a: any) => ({ value: a.id, label: a.name }))
                    ]}
                  />
                </div>
              </div>

              {/* Editable Action Cards */}
              <div className="space-y-3">
                {editableActions.map((action) => (
                  <div 
                    key={action.id}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all",
                      action.selected 
                        ? "border-primary/30 bg-primary/5" 
                        : "border-surface bg-surface/50 opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={action.selected}
                        onChange={() => toggleActionSelection(action.id)}
                        className="mt-1 w-4 h-4 rounded"
                      />
                      <div className="flex-1 space-y-2">
                        <Input
                          value={action.title}
                          onChange={(e) => updateAction(action.id, 'title', e.target.value)}
                          placeholder="Action title"
                          disabled={!action.selected}
                        />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Input
                              value={action.description || ''}
                              onChange={(e) => updateAction(action.id, 'description', e.target.value)}
                              placeholder="Description (optional)"
                              disabled={!action.selected}
                            />
                          </div>
                          <Select
                            value={action.priority}
                            onChange={(e) => updateAction(action.id, 'priority', e.target.value)}
                            options={[
                              { value: 'LOW', label: 'Low' },
                              { value: 'MEDIUM', label: 'Medium' },
                              { value: 'HIGH', label: 'High' },
                              { value: 'URGENT', label: 'Urgent' }
                            ]}
                            disabled={!action.selected}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competency Observations */}
          {editableCompetencies.length > 0 && (
            <div className="border-t border-surface pt-4">
              <h4 className="text-sm font-medium text-text-secondary mb-3">
                Competency Observations ({editableCompetencies.filter(c => c.selected).length} to apply)
              </h4>
              <div className="flex flex-wrap gap-2">
                {editableCompetencies.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => toggleCompetencySelection(comp.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      comp.selected
                        ? comp.change > 0 
                          ? "bg-success/20 text-success border-2 border-success/30" 
                          : "bg-warning/20 text-warning border-2 border-warning/30"
                        : "bg-surface text-text-muted"
                    )}
                    title={comp.reason}
                  >
                    {comp.name} {comp.change > 0 ? '+1' : '-1'}
                    {comp.selected && ' ✓'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-2">
                Click to toggle. Selected competencies will be applied to the profile.
              </p>
            </div>
          )}

          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setStep('input')}>
              Back
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveWithActions}
              isLoading={isLoading || createActionMutation.isPending || createGroupedActionsMutation.isPending}
            >
              Save 1:1 {editableActions.filter(a => a.selected).length > 0 && 
                `& Create ${editableActions.filter(a => a.selected).length} Action(s)`}
            </Button>
          </ModalFooter>
        </div>
      )}
    </Modal>
  );
}

function EditEmployeeModal({ isOpen, onClose, employee, workAreas, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    team: '',
    status: 'ACTIVE',
    workAreaId: '',
    strengths: [] as string[],
    growthAreas: [] as string[]
  });
  const [strengthInput, setStrengthInput] = useState('');
  const [growthInput, setGrowthInput] = useState('');

  // Reset form when modal opens
  useState(() => {
    if (employee && isOpen) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        role: employee.role || '',
        team: employee.team || '',
        status: employee.status || 'ACTIVE',
        workAreaId: employee.workAreaId || '',
        strengths: employee.strengths || [],
        growthAreas: employee.growthAreas || []
      });
    }
  });

  // Actually use useEffect for proper syncing
  const updateFormFromEmployee = () => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        role: employee.role || '',
        team: employee.team || '',
        status: employee.status || 'ACTIVE',
        workAreaId: employee.workAreaId || '',
        strengths: employee.strengths || [],
        growthAreas: employee.growthAreas || []
      });
    }
  };

  // Sync when isOpen changes to true
  if (isOpen && formData.name === '' && employee?.name) {
    updateFormFromEmployee();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      workAreaId: formData.workAreaId || null
    });
  };

  const addStrength = () => {
    if (strengthInput.trim() && !formData.strengths.includes(strengthInput.trim())) {
      setFormData({ ...formData, strengths: [...formData.strengths, strengthInput.trim()] });
      setStrengthInput('');
    }
  };

  const removeStrength = (s: string) => {
    setFormData({ ...formData, strengths: formData.strengths.filter(x => x !== s) });
  };

  const addGrowthArea = () => {
    if (growthInput.trim() && !formData.growthAreas.includes(growthInput.trim())) {
      setFormData({ ...formData, growthAreas: [...formData.growthAreas, growthInput.trim()] });
      setGrowthInput('');
    }
  };

  const removeGrowthArea = (g: string) => {
    setFormData({ ...formData, growthAreas: formData.growthAreas.filter(x => x !== g) });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Team Member" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            required
          />
          <Input
            label="Team"
            value={formData.team}
            onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'ON_LEAVE', label: 'On Leave' },
              { value: 'OFFBOARDING', label: 'Offboarding' },
              { value: 'OFFBOARDED', label: 'Offboarded' }
            ]}
          />
          <Select
            label="Work Area"
            value={formData.workAreaId}
            onChange={(e) => setFormData({ ...formData, workAreaId: e.target.value })}
            options={[
              { value: '', label: 'No area' },
              ...workAreas.map((area: any) => ({ 
                value: area.id, 
                label: area.name 
              }))
            ]}
          />
        </div>

        {/* Strengths */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Strengths</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.strengths.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-success/20 text-success rounded-lg text-sm">
                {s}
                <button type="button" onClick={() => removeStrength(s)} className="hover:bg-success/30 rounded p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={strengthInput}
              onChange={(e) => setStrengthInput(e.target.value)}
              placeholder="Add a strength..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStrength())}
            />
            <Button type="button" variant="ghost" onClick={addStrength}>Add</Button>
          </div>
        </div>

        {/* Growth Areas */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Growth Areas</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.growthAreas.map((g, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-warning/20 text-warning rounded-lg text-sm">
                {g}
                <button type="button" onClick={() => removeGrowthArea(g)} className="hover:bg-warning/30 rounded p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={growthInput}
              onChange={(e) => setGrowthInput(e.target.value)}
              placeholder="Add a growth area..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGrowthArea())}
            />
            <Button type="button" variant="ghost" onClick={addGrowthArea}>Add</Button>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Save Changes</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

