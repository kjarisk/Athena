import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  User, 
  Palette, 
  Bot, 
  Bell, 
  Calendar,
  Shield,
  Save,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  X,
  Clock,
  Users,
  Target,
  Briefcase
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { apiHelpers } from '@/lib/api';
import toast from 'react-hot-toast';
import OllamaModelSelector from '@/components/OllamaModelSelector';

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'playbook', label: 'Leadership Playbook', icon: BookOpen },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'ai', label: 'AI Provider', icon: Bot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Calendar },
];

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

const targetTypes = [
  { value: 'EMPLOYEE', label: 'Per Employee' },
  { value: 'TEAM', label: 'Per Team' },
  { value: 'WORK_AREA', label: 'Per Work Area' },
  { value: 'GLOBAL', label: 'Global' },
];

export default function Settings() {
  const { user, updateSettings } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [localSettings, setLocalSettings] = useState(user?.settings || {
    theme: 'light',
    aiProvider: 'openai',
    ollamaModel: 'mistral:latest',
    notificationsEnabled: true,
    calendarSyncEnabled: false
  });

  // Playbook state
  const [isCadenceModalOpen, setIsCadenceModalOpen] = useState(false);
  const [editingCadence, setEditingCadence] = useState<any>(null);
  const [aiContext, setAiContext] = useState('');
  const [aiContextSaving, setAiContextSaving] = useState(false);

  // Fetch cadence rules
  const { data: cadenceRules } = useQuery({
    queryKey: ['cadenceRules'],
    queryFn: () => apiHelpers.getCadenceRules().then(r => r.data.data),
    enabled: activeSection === 'playbook'
  });

  // Fetch AI context
  const { data: aiContextData } = useQuery({
    queryKey: ['aiContext'],
    queryFn: () => apiHelpers.getAIContext().then(r => r.data.data),
    enabled: activeSection === 'playbook'
  });

  // Fetch employees for target selection
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data),
    enabled: activeSection === 'playbook'
  });

  // Fetch teams for target selection
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiHelpers.getTeams().then(r => r.data.data),
    enabled: activeSection === 'playbook'
  });

  // Fetch work areas for target selection
  const { data: workAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data),
    enabled: activeSection === 'playbook'
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(localSettings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <Card padding="sm" className="lg:col-span-1 h-fit">
          <nav className="space-y-1">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                  activeSection === section.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-secondary hover:bg-surface hover:text-text-primary"
                )}
              >
                <section.icon className="w-5 h-5" />
                {section.label}
              </button>
            ))}
          </nav>
        </Card>

        {/* Content */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeSection === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-w-md">
                    <Input
                      label="Name"
                      value={user?.name || ''}
                      disabled
                    />
                    <Input
                      label="Email"
                      value={user?.email || ''}
                      disabled
                    />
                    <p className="text-sm text-text-muted">
                      Contact support to change your profile information.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'playbook' && (
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
                        leftIcon={<Save className="w-4 h-4" />}
                      >
                        Save AI Context
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSection === 'appearance' && (
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-w-md">
                    <Select
                      label="Theme"
                      value={localSettings.theme}
                      onChange={(e) => setLocalSettings({ 
                        ...localSettings, 
                        theme: e.target.value as any 
                      })}
                      options={[
                        { value: 'light', label: 'Light (Ethereal Forest)' },
                        { value: 'dark', label: 'Dark (Coming soon)' },
                        { value: 'system', label: 'System (Coming soon)' }
                      ]}
                    />
                    <p className="text-sm text-text-muted">
                      The app uses an Ori + Hades inspired aesthetic with warm, ethereal colors.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'ai' && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Provider</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-w-md">
                    <Select
                      label="Provider"
                      value={localSettings.aiProvider}
                      onChange={(e) => setLocalSettings({ 
                        ...localSettings, 
                        aiProvider: e.target.value as any 
                      })}
                      options={[
                        { value: 'openai', label: 'OpenAI (GPT-4)' },
                        { value: 'ollama', label: 'Ollama (Local/Self-hosted)' }
                      ]}
                    />
                    
                    {localSettings.aiProvider === 'openai' && (
                      <div className="p-4 bg-surface rounded-xl">
                        <p className="text-sm text-text-secondary">
                          OpenAI requires an API key. Configure it in your server environment variables.
                        </p>
                      </div>
                    )}

                    {localSettings.aiProvider === 'ollama' && (
                      <OllamaModelSelector
                        selectedModel={localSettings.ollamaModel || 'mistral:latest'}
                        onModelChange={(model) => setLocalSettings({
                          ...localSettings,
                          ollamaModel: model
                        })}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-w-md">
                    <label className="flex items-center justify-between p-4 bg-surface rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-text-primary">Enable Notifications</p>
                        <p className="text-sm text-text-secondary">
                          Get notified about overdue actions and upcoming meetings
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={localSettings.notificationsEnabled}
                        onChange={(e) => setLocalSettings({ 
                          ...localSettings, 
                          notificationsEnabled: e.target.checked 
                        })}
                        className="w-5 h-5 rounded border-2 border-text-muted text-primary focus:ring-primary"
                      />
                    </label>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'integrations' && (
              <Card>
                <CardHeader>
                  <CardTitle>Integrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Microsoft Calendar */}
                    <div className="p-4 border-2 border-surface rounded-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#0078D4] flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-text-primary">Microsoft Outlook</h4>
                            <p className="text-sm text-text-secondary">
                              Sync your calendar and get meeting insights
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" disabled>
                          Connect
                        </Button>
                      </div>
                      <p className="text-xs text-text-muted mt-3">
                        Requires Microsoft Graph API configuration. Coming soon.
                      </p>
                    </div>

                    {/* Figma */}
                    <div className="p-4 border-2 border-surface rounded-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#F24E1E] flex items-center justify-center">
                            <span className="text-white font-bold">F</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-text-primary">FigJam</h4>
                            <p className="text-sm text-text-secondary">
                              Extract actions from workshop boards
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" disabled>
                          Connect
                        </Button>
                      </div>
                      <p className="text-xs text-text-muted mt-3">
                        Requires Figma API access token. Coming soon.
                      </p>
                    </div>

                    {/* Azure DevOps */}
                    <div className="p-4 border-2 border-surface rounded-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#0078D7] flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-text-primary">Azure DevOps</h4>
                            <p className="text-sm text-text-secondary">
                              Sync work items and track sprint progress
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" disabled>
                          Connect
                        </Button>
                      </div>
                      <p className="text-xs text-text-muted mt-3">
                        Requires Azure DevOps PAT. Coming soon.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              isLoading={isSaving}
              leftIcon={<Save className="w-5 h-5" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>

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
        employees={employees || []}
        teams={teams || []}
        workAreas={workAreas || []}
      />
    </div>
  );
}

function CadenceModal({ 
  isOpen, 
  onClose, 
  cadence, 
  onSubmit, 
  isLoading,
  employees,
  teams,
  workAreas
}: {
  isOpen: boolean;
  onClose: () => void;
  cadence: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  employees: any[];
  teams: any[];
  workAreas: any[];
}) {
  const [formData, setFormData] = useState({
    type: 'ONE_ON_ONE',
    name: '',
    frequencyDays: '14',
    targetType: 'EMPLOYEE',
    employeeId: '',
    teamId: '',
    workAreaId: '',
    isActive: true
  });

  useEffect(() => {
    if (isOpen) {
      if (cadence) {
        setFormData({
          type: cadence.type || 'ONE_ON_ONE',
          name: cadence.name || '',
          frequencyDays: String(cadence.frequencyDays || 14),
          targetType: cadence.targetType || 'EMPLOYEE',
          employeeId: cadence.employeeId || '',
          teamId: cadence.teamId || '',
          workAreaId: cadence.workAreaId || '',
          isActive: cadence.isActive !== false
        });
      } else {
        setFormData({
          type: 'ONE_ON_ONE',
          name: '',
          frequencyDays: '14',
          targetType: 'EMPLOYEE',
          employeeId: '',
          teamId: '',
          workAreaId: '',
          isActive: true
        });
      }
    }
  }, [isOpen, cadence]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: formData.type,
      name: formData.name,
      frequencyDays: formData.frequencyDays,
      targetType: formData.targetType,
      employeeId: formData.targetType === 'EMPLOYEE' ? formData.employeeId : null,
      teamId: formData.targetType === 'TEAM' ? formData.teamId : null,
      workAreaId: formData.targetType === 'WORK_AREA' ? formData.workAreaId : null,
      isActive: formData.isActive
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cadence?.id ? 'Edit Cadence Rule' : 'Create Cadence Rule'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Weekly 1:1 with Sarah"
          required
        />

        <Select
          label="Type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          options={cadenceTypes.map(t => ({ value: t.value, label: t.label }))}
        />

        <Select
          label="Frequency"
          value={formData.frequencyDays}
          onChange={(e) => setFormData({ ...formData, frequencyDays: e.target.value })}
          options={frequencyOptions}
        />

        <Select
          label="Target"
          value={formData.targetType}
          onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
          options={targetTypes}
        />

        {formData.targetType === 'EMPLOYEE' && (
          <Select
            label="Select Employee"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            options={[
              { value: '', label: 'All Employees' },
              ...employees.map((emp: any) => ({ value: emp.id, label: emp.name }))
            ]}
          />
        )}

        {formData.targetType === 'TEAM' && (
          <Select
            label="Select Team"
            value={formData.teamId}
            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
            options={[
              { value: '', label: 'All Teams' },
              ...teams.map((team: any) => ({ value: team.id, label: team.name }))
            ]}
          />
        )}

        {formData.targetType === 'WORK_AREA' && (
          <Select
            label="Select Work Area"
            value={formData.workAreaId}
            onChange={(e) => setFormData({ ...formData, workAreaId: e.target.value })}
            options={[
              { value: '', label: 'All Work Areas' },
              ...workAreas.map((area: any) => ({ value: area.id, label: area.name }))
            ]}
          />
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-text-muted text-primary focus:ring-primary"
          />
          <span className="text-sm text-text-primary">Active</span>
        </label>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {cadence?.id ? 'Save Changes' : 'Create Rule'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

