import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  User, 
  Palette, 
  Bot, 
  Bell, 
  Calendar,
  BookOpen,
  Save,
  ListTodo
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { apiHelpers } from '@/lib/api';
import toast from 'react-hot-toast';
import OllamaModelSelector from '@/components/OllamaModelSelector';

// Helper to apply theme immediately
const applyTheme = (theme: 'light' | 'dark' | 'system') => {
  const root = document.documentElement;
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.setAttribute('data-theme', systemTheme);
  } else {
    root.setAttribute('data-theme', theme);
  }
};

// Import extracted components
import { PlaybookSettings, IntegrationSettings } from './components';

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'playbook', label: 'Leadership Playbook', icon: BookOpen },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'defaults', label: 'Defaults', icon: ListTodo },
  { id: 'ai', label: 'AI Provider', icon: Bot },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Calendar },
];

export default function Settings() {
  const { user, updateSettings } = useAuthStore();
  const [activeSection, setActiveSection] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const savedTheme = (user?.settings?.theme as 'light' | 'dark' | 'system') || 'light';
  const [localSettings, setLocalSettings] = useState<{
    theme: 'light' | 'dark' | 'system';
    aiProvider: 'openai' | 'ollama';
    ollamaModel?: string;
    aiVerbosity: 'concise' | 'balanced' | 'detailed';
    defaultActionPriority: 'low' | 'medium' | 'high';
    notificationsEnabled: boolean;
  }>(user?.settings ? {
    ...user.settings,
    ollamaModel: (user.settings as any).ollamaModel || 'mistral:latest',
    aiVerbosity: (user.settings as any).aiVerbosity || 'balanced',
    defaultActionPriority: (user.settings as any).defaultActionPriority || 'medium'
  } : {
    theme: 'light',
    aiProvider: 'openai',
    ollamaModel: 'mistral:latest',
    aiVerbosity: 'balanced',
    defaultActionPriority: 'medium',
    notificationsEnabled: true
  });

  // Restore saved theme when leaving page without saving
  useEffect(() => {
    return () => {
      // On unmount, restore the saved theme from the store
      applyTheme(savedTheme);
    };
  }, [savedTheme]);

  // Fetch employees for playbook target selection
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
              <PlaybookSettings 
                employees={employees || []}
                teams={teams || []}
                workAreas={workAreas || []}
              />
            )}

            {activeSection === 'appearance' && (
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6 max-w-md">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-3">
                        Theme
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'light', label: 'Light', desc: 'Ethereal Forest' },
                          { value: 'dark', label: 'Dark', desc: 'Hades Inspired' },
                          { value: 'system', label: 'System', desc: 'Auto-detect' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              const newTheme = option.value as 'light' | 'dark' | 'system';
                              setLocalSettings({ 
                                ...localSettings, 
                                theme: newTheme
                              });
                              // Apply theme immediately for instant preview
                              applyTheme(newTheme);
                            }}
                            className={cn(
                              "p-4 rounded-xl border-2 text-left transition-all",
                              localSettings.theme === option.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <div className={cn(
                              "w-8 h-8 rounded-lg mb-2",
                              option.value === 'light' && "bg-gradient-to-br from-amber-100 to-green-100",
                              option.value === 'dark' && "bg-gradient-to-br from-indigo-900 to-purple-900",
                              option.value === 'system' && "bg-gradient-to-br from-stone-200 to-stone-400"
                            )} />
                            <p className="font-medium text-text-primary">{option.label}</p>
                            <p className="text-xs text-text-muted">{option.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-text-muted">
                      The app uses an Ori + Hades inspired aesthetic with warm, ethereal colors.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'defaults' && (
              <Card>
                <CardHeader>
                  <CardTitle>Default Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6 max-w-md">
                    <Select
                      label="Default Action Priority"
                      value={localSettings.defaultActionPriority}
                      onChange={(e) => setLocalSettings({ 
                        ...localSettings, 
                        defaultActionPriority: e.target.value as any 
                      })}
                      options={[
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' }
                      ]}
                    />
                    <p className="text-sm text-text-muted">
                      New actions will be created with this priority by default.
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
                  <div className="space-y-6 max-w-md">
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
                    
                    <Select
                      label="AI Response Verbosity"
                      value={localSettings.aiVerbosity}
                      onChange={(e) => setLocalSettings({ 
                        ...localSettings, 
                        aiVerbosity: e.target.value as any 
                      })}
                      options={[
                        { value: 'concise', label: 'Concise - Brief, to the point' },
                        { value: 'balanced', label: 'Balanced - Standard detail level' },
                        { value: 'detailed', label: 'Detailed - Comprehensive explanations' }
                      ]}
                    />
                    <p className="text-sm text-text-muted">
                      Controls how verbose AI-generated content will be (summaries, suggestions, etc.)
                    </p>
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

            {activeSection === 'integrations' && <IntegrationSettings />}
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
    </div>
  );
}
