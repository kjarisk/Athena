import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, AlertCircle, Lightbulb, CheckSquare } from 'lucide-react';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Employee {
  id: string;
  name: string;
  workAreaId?: string;
}

interface AddOneOnOneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  employeeId?: string;
  employee?: Employee;
}

export default function AddOneOnOneModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading, 
  employeeId, 
  employee 
}: AddOneOnOneModalProps) {
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
      apiHelpers.bulkUpdateCompetencies(employeeId!, competencies),
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
      const response = await apiHelpers.analyzeOneOnOne(formData.notes, employeeId!);
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
      apiHelpers.generateDevelopmentPlan(employeeId!).then(() => {
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
                <span className="text-2xl">{['😟', '😕', '😐', '🙂', '😊'][analysis.mood - 1]}</span>
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
