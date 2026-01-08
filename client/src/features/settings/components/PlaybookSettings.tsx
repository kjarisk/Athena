import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Clock, Users, Target, Calendar, Briefcase } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import CadenceModal from './CadenceModal';

const cadenceTypes = [
  { value: 'ONE_ON_ONE', label: '1:1 Meeting', icon: Users },
  { value: 'RETRO', label: 'Retrospective', icon: Target },
  { value: 'SOCIAL', label: 'Social Event', icon: Calendar },
  { value: 'CAREER_CHAT', label: 'Career Conversation', icon: Briefcase },
  { value: 'CUSTOM', label: 'Custom', icon: Clock },
];

const frequencyOptions = [
  { value: '7', label: 'Weekly' },
  { value: '14', label: 'Bi-weekly' },
  { value: '30', label: 'Monthly' },
  { value: '60', label: 'Every 2 months' },
  { value: '90', label: 'Quarterly' },
  { value: '180', label: 'Every 6 months' },
  { value: '365', label: 'Yearly' },
];

export { cadenceTypes, frequencyOptions };

interface PlaybookSettingsProps {
  employees: any[];
  teams: any[];
  workAreas: any[];
}

export default function PlaybookSettings({ employees, teams, workAreas }: PlaybookSettingsProps) {
  const queryClient = useQueryClient();
  const [isCadenceModalOpen, setIsCadenceModalOpen] = useState(false);
  const [editingCadence, setEditingCadence] = useState<any>(null);
  const [aiContext, setAiContext] = useState('');
  const [aiContextSaving, setAiContextSaving] = useState(false);

  // Fetch cadence rules
  const { data: cadenceRules } = useQuery({
    queryKey: ['cadenceRules'],
    queryFn: () => apiHelpers.getCadenceRules().then(r => r.data.data)
  });

  // Fetch AI context
  const { data: aiContextData } = useQuery({
    queryKey: ['aiContext'],
    queryFn: () => apiHelpers.getAIContext().then(r => r.data.data)
  });

  // Set AI context when data is loaded
  useEffect(() => {
    if (aiContextData?.content !== undefined) {
      setAiContext(aiContextData.content);
    }
  }, [aiContextData]);

  // Cadence mutations
  const createCadenceMutation = useMutation({
    mutationFn: apiHelpers.createCadenceRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadenceRules'] });
      setIsCadenceModalOpen(false);
      setEditingCadence(null);
      toast.success('Cadence rule created');
    },
    onError: () => toast.error('Failed to create cadence rule')
  });

  const updateCadenceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiHelpers.updateCadenceRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadenceRules'] });
      setIsCadenceModalOpen(false);
      setEditingCadence(null);
      toast.success('Cadence rule updated');
    },
    onError: () => toast.error('Failed to update cadence rule')
  });

  const deleteCadenceMutation = useMutation({
    mutationFn: apiHelpers.deleteCadenceRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadenceRules'] });
      toast.success('Cadence rule deleted');
    },
    onError: () => toast.error('Failed to delete cadence rule')
  });

  const handleSaveAIContext = async () => {
    setAiContextSaving(true);
    try {
      await apiHelpers.saveAIContext(aiContext);
      queryClient.invalidateQueries({ queryKey: ['aiContext'] });
      toast.success('AI context saved');
    } catch (error) {
      toast.error('Failed to save AI context');
    } finally {
      setAiContextSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cadence Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cadence Rules</CardTitle>
            <Button 
              size="sm" 
              onClick={() => {
                setEditingCadence(null);
                setIsCadenceModalOpen(true);
              }}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-4">
            Define recurring activities like 1:1s, retrospectives, and social events. 
            The system will remind you when they're due.
          </p>
          
          {cadenceRules && cadenceRules.length > 0 ? (
            <div className="space-y-3">
              {cadenceRules.map((rule: any) => {
                const typeInfo = cadenceTypes.find(t => t.value === rule.type);
                const freqInfo = frequencyOptions.find(f => f.value === String(rule.frequencyDays));
                const TypeIcon = typeInfo?.icon || Clock;
                
                return (
                  <div 
                    key={rule.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border-2",
                      rule.isActive ? "border-surface bg-surface/50" : "border-surface/50 opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TypeIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-text-primary">{rule.name}</h4>
                        <p className="text-sm text-text-secondary">
                          {freqInfo?.label || `Every ${rule.frequencyDays} days`}
                          {rule.targetType === 'EMPLOYEE' && rule.employee && ` - ${rule.employee.name}`}
                          {rule.targetType === 'TEAM' && rule.team && ` - ${rule.team.name}`}
                          {rule.targetType === 'WORK_AREA' && rule.workArea && ` - ${rule.workArea.name}`}
                          {rule.targetType === 'GLOBAL' && ' - All'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCadence(rule);
                          setIsCadenceModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this cadence rule?')) {
                            deleteCadenceMutation.mutate(rule.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No cadence rules yet.</p>
              <p className="text-sm">Add rules to get reminders for recurring activities.</p>
            </div>
          )}

          {/* Quick templates */}
          <div className="mt-6 pt-6 border-t border-surface">
            <h4 className="text-sm font-medium text-text-secondary mb-3">Quick Templates</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingCadence({
                    type: 'ONE_ON_ONE',
                    name: '1:1 with Direct Reports',
                    frequencyDays: 14,
                    targetType: 'EMPLOYEE'
                  });
                  setIsCadenceModalOpen(true);
                }}
              >
                + Bi-weekly 1:1
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingCadence({
                    type: 'RETRO',
                    name: 'Team Retrospective',
                    frequencyDays: 90,
                    targetType: 'TEAM'
                  });
                  setIsCadenceModalOpen(true);
                }}
              >
                + Quarterly Retro
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingCadence({
                    type: 'CAREER_CHAT',
                    name: 'Career Conversation',
                    frequencyDays: 180,
                    targetType: 'EMPLOYEE'
                  });
                  setIsCadenceModalOpen(true);
                }}
              >
                + 6-Month Career Chat
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Context */}
      <Card>
        <CardHeader>
          <CardTitle>AI Leadership Context</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary mb-4">
            Describe your leadership philosophy, coaching style, and priorities. 
            This context will be used by AI when generating suggestions and insights.
          </p>
          <Textarea
            label="Your Leadership Philosophy"
            value={aiContext}
            onChange={(e) => setAiContext(e.target.value)}
            placeholder="Example:
- I prioritize psychological safety and open communication
- I use the GROW model for coaching conversations
- Focus on team morale and regular check-ins
- Prefer written follow-ups after every 1:1
- Value work-life balance in my suggestions"
            className="min-h-[200px]"
          />
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSaveAIContext}
              isLoading={aiContextSaving}
            >
              Save AI Context
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cadence Rule Modal */}
      <CadenceModal
        isOpen={isCadenceModalOpen}
        onClose={() => {
          setIsCadenceModalOpen(false);
          setEditingCadence(null);
        }}
        cadence={editingCadence}
        onSubmit={(data) => {
          if (editingCadence?.id) {
            updateCadenceMutation.mutate({ id: editingCadence.id, data });
          } else {
            createCadenceMutation.mutate(data);
          }
        }}
        isLoading={createCadenceMutation.isPending || updateCadenceMutation.isPending}
        employees={employees}
        teams={teams}
        workAreas={workAreas}
      />
    </div>
  );
}
