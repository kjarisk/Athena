import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus,
  Edit2,
  Trash2,
  CheckSquare, 
  Calendar, 
  AlertCircle, 
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Users,
  Zap,
  Target,
  MoreVertical,
  X,
  Eye,
  EyeOff,
  Filter,
  Grid,
  Check,
  ListPlus,
  User
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiHelpers } from '@/lib/api';
import { formatDate, getXpProgress, getDueDateLabel, cn } from '@/lib/utils';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import TeamPulse from '@/components/TeamPulse';
import PeopleEvents from '@/components/PeopleEvents';
import LeadershipCadence from '@/components/LeadershipCadence';
import FocusItemActions from '@/components/FocusItemActions';
import ActionModal from '@/components/ActionModal';
import FloatingActionButton from '@/components/FloatingActionButton';
import toast from 'react-hot-toast';

// Icon mapping for work areas
const iconOptions = [
  { value: 'users', label: 'Team', icon: Users },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'briefcase', label: 'Briefcase', icon: TrendingUp },
  { value: 'zap', label: 'Lightning', icon: Zap },
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
];

const colorOptions = [
  { value: '#7BA087', label: 'Sage Green' },
  { value: '#D4A574', label: 'Warm Gold' },
  { value: '#E8B86D', label: 'Bright Gold' },
  { value: '#CD7F6E', label: 'Terracotta' },
  { value: '#8FBC8F', label: 'Forest Green' },
  { value: '#DAA520', label: 'Goldenrod' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<any>(null);
  const [areaMenuOpen, setAreaMenuOpen] = useState<string | null>(null);
  const [showHiddenAreas, setShowHiddenAreas] = useState(false);
  const [showFocusModeDropdown, setShowFocusModeDropdown] = useState(false);
  const [focusedWorkAreaId, setFocusedWorkAreaId] = useState<string | null>(
    localStorage.getItem('focusedWorkAreaId')
  );
  const [actionModalState, setActionModalState] = useState<{
    isOpen: boolean;
    action?: any;
    defaults?: any;
  }>({ isOpen: false });
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showRecentlyCompleted, setShowRecentlyCompleted] = useState(true);

  // Update localStorage when focus mode changes
  useEffect(() => {
    if (focusedWorkAreaId) {
      localStorage.setItem('focusedWorkAreaId', focusedWorkAreaId);
    } else {
      localStorage.removeItem('focusedWorkAreaId');
    }
  }, [focusedWorkAreaId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input fields
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement) {
        return;
      }

      switch(e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          setActionModalState({ isOpen: true });
          break;
        case 'e':
          e.preventDefault();
          navigate('/events');
          break;
        case 'f':
          e.preventDefault();
          setShowFocusModeDropdown(prev => !prev);
          break;
        case 'n':
          e.preventDefault();
          navigate('/ai/extract');
          break;
        case '?':
          e.preventDefault();
          setShowKeyboardHelp(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const stats = user?.gamificationStats;
  const xpProgress = stats ? getXpProgress(stats.totalXp, stats.level) : null;

  const { data: workAreas, isLoading: loadingAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

  const { data: actionStats } = useQuery({
    queryKey: ['actionStats'],
    queryFn: () => apiHelpers.getActionStats().then(r => r.data.data)
  });

  const { data: overdueActions } = useQuery({
    queryKey: ['actions', 'overdue'],
    queryFn: () => apiHelpers.getActions({ overdue: 'true' }).then(r => r.data.data)
  });

  const { data: todayEvents } = useQuery({
    queryKey: ['events', 'today'],
    queryFn: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return apiHelpers.getEvents({ 
        startDate: today.toISOString(), 
        endDate: tomorrow.toISOString() 
      }).then(r => r.data.data);
    }
  });

  const { data: focusSuggestions } = useQuery({
    queryKey: ['focusSuggestions'],
    queryFn: () => apiHelpers.getFocusSuggestions().then(r => r.data.data),
    retry: false
  });

  const { data: dailyBriefing } = useQuery({
    queryKey: ['dailyBriefing'],
    queryFn: () => apiHelpers.getDailyBriefing().then(r => r.data.data),
    retry: false,
    staleTime: 1000 * 60 * 30 // Cache for 30 mins
  });

  const { data: dueItems } = useQuery({
    queryKey: ['dueItems'],
    queryFn: () => apiHelpers.getDueItems().then(r => r.data.data),
    retry: false
  });

  // New queries for enhanced focus
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data)
  });

  const { data: challenges } = useQuery({
    queryKey: ['userChallenges'],
    queryFn: () => apiHelpers.getChallenges().then(r => r.data.data),
    retry: false
  });

  const { data: allActions } = useQuery({
    queryKey: ['actions'],
    queryFn: () => apiHelpers.getActions({}).then(r => r.data.data)
  });

  // Query for recently completed actions (last 5, completed within last 24 hours)
  const { data: recentlyCompletedActions } = useQuery({
    queryKey: ['actions', 'recentlyCompleted'],
    queryFn: () => {
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      return apiHelpers.getActions({ 
        status: 'COMPLETED',
        limit: '5',
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      }).then(r => {
        // Filter to only show items completed in last 24 hours
        const actions = r.data.data || [];
        return actions.filter((a: any) => {
          if (!a.updatedAt) return false;
          return new Date(a.updatedAt) >= oneDayAgo;
        });
      });
    }
  });

  const createAreaMutation = useMutation({
    mutationFn: apiHelpers.createWorkArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      setIsAreaModalOpen(false);
      toast.success('Area created');
    }
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiHelpers.updateWorkArea(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      setEditingArea(null);
      toast.success('Area updated');
    }
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id: string) => apiHelpers.deleteWorkArea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      toast.success('Area deleted');
    }
  });

  const toggleHideMutation = useMutation({
    mutationFn: ({ id, isHidden }: { id: string; isHidden: boolean }) => 
      apiHelpers.updateWorkArea(id, { isHidden }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
    }
  });

  // Action mutations for interactive buttons
  const updateActionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiHelpers.updateAction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actionStats'] });
      queryClient.invalidateQueries({ queryKey: ['overdueActions'] });
    }
  });

  // Action handlers
  const handleCompleteAction = (action: any) => {
    updateActionMutation.mutate({
      id: action.id,
      data: { status: 'COMPLETED' }
    }, {
      onSuccess: () => {
        // Invalidate all action-related queries to refresh both sections
        queryClient.invalidateQueries({ queryKey: ['actions'] });
        queryClient.invalidateQueries({ queryKey: ['actionStats'] });
        queryClient.invalidateQueries({ queryKey: ['overdueActions'] });
        toast.success(`✓ Action completed! +${action.xpReward || 10} XP`);
      }
    });
  };

  const handleUncompleteAction = (action: any) => {
    updateActionMutation.mutate({
      id: action.id,
      data: { status: 'IN_PROGRESS' }
    }, {
      onSuccess: () => {
        // Invalidate all action-related queries to refresh both sections
        queryClient.invalidateQueries({ queryKey: ['actions'] });
        queryClient.invalidateQueries({ queryKey: ['actionStats'] });
        queryClient.invalidateQueries({ queryKey: ['overdueActions'] });
        toast.success('Action marked as incomplete');
      }
    });
  };

  const handlePostponeAction = (actionId: string, days: number) => {
    const action = allActions?.find((a: any) => a.id === actionId);
    if (!action?.dueDate) return;
    
    const newDueDate = new Date(action.dueDate);
    newDueDate.setDate(newDueDate.getDate() + days);
    
    updateActionMutation.mutate({
      id: actionId,
      data: { dueDate: newDueDate.toISOString() }
    }, {
      onSuccess: () => {
        toast.success(`Postponed by ${days} day${days > 1 ? 's' : ''}`);
      }
    });
  };

  const handleEditAction = (action: any) => {
    setActionModalState({
      isOpen: true,
      action
    });
  };

  const handleAddSubtask = (parentAction: any) => {
    setActionModalState({
      isOpen: true,
      defaults: {
        parentId: parentAction.id,
        workAreaId: parentAction.workAreaId,
        teamId: parentAction.teamId
      }
    });
  };

  const toggleExpandAction = (actionId: string) => {
    setExpandedActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  if (loadingAreas) {
    return <LoadingPage />;
  }

  // Filter data based on hidden/focused work areas
  const visibleWorkAreaIds = workAreas
    ?.filter(a => !a.isHidden)
    .map(a => a.id) || [];
  
  const activeWorkAreaIds = focusedWorkAreaId 
    ? [focusedWorkAreaId]
    : visibleWorkAreaIds;

  // Filter all data sources by active work areas
  const filteredActions = allActions?.filter((a: any) => 
    !a.workAreaId || activeWorkAreaIds.includes(a.workAreaId)
  ) || [];

  const filteredOverdueActions = overdueActions?.filter((a: any) =>
    !a.workAreaId || activeWorkAreaIds.includes(a.workAreaId)
  ) || [];

  const filteredEmployees = employees?.filter((e: any) =>
    !e.workAreaId || activeWorkAreaIds.includes(e.workAreaId)
  ) || [];

  const filteredDueItems = dueItems?.filter((item: any) =>
    !item.rule?.workAreaId || activeWorkAreaIds.includes(item.rule.workAreaId)
  ) || [];

  const filteredEvents = todayEvents?.filter((e: any) =>
    !e.workAreaId || activeWorkAreaIds.includes(e.workAreaId)
  ) || [];

  // Build smart focus items
  const buildFocusItems = () => {
    const items: any[] = [];
    
    // Check localStorage for dismissed suggestions
    const dismissedSuggestions = JSON.parse(localStorage.getItem('dismissedSuggestions') || '[]');
    const isDismissed = (type: string, id: string) => 
      dismissedSuggestions.some((d: any) => d.type === type && d.id === id);

    // Helper: Days since date
    const daysSince = (date: string | Date) => {
      const now = new Date();
      const then = new Date(date);
      return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
    };

    // Helper: Days until date
    const daysUntil = (date: string | Date) => {
      const now = new Date();
      const then = new Date(date);
      return Math.ceil((then.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    // 1. Events today without prep (Priority: 1.2)
    const eventsWithoutPrep = filteredEvents?.filter((e: any) => 
      (e.eventType?.category === 'ONE_ON_ONE' || e.eventType?.category === 'TEAM_MEETING') && 
      !e.rawNotes && 
      !isDismissed('event-prep', e.id)
    ) || [];
    if (eventsWithoutPrep.length > 0) {
      items.push({
        type: 'event-prep',
        id: eventsWithoutPrep.map((e: any) => e.id).join(','),
        priority: 1.2,
        title: `Prepare for ${eventsWithoutPrep.length} meeting${eventsWithoutPrep.length > 1 ? 's' : ''} today`,
        description: eventsWithoutPrep.slice(0, 2).map((e: any) => e.title).join(', '),
        link: '/events',
        icon: Calendar,
        color: 'danger',
        actionable: true,
        actions: ['dismiss', 'navigate']
      });
    }

    // 2. Due cadence items (Priority: 1.5)
    if (filteredDueItems?.length > 0) {
      filteredDueItems.slice(0, 2).forEach((item: any, i: number) => {
        if (isDismissed('cadence', item.rule.id)) return;
        
        items.push({
          type: 'cadence',
          id: item.rule.id,
          priority: 1.5 + (i * 0.1),
          title: `${item.rule.name} is due`,
          description: `${item.daysOverdue > 0 ? `${item.daysOverdue} days overdue` : 'Due today'} - ${item.targetName || 'All'}`,
          link: item.rule.type === 'ONE_ON_ONE' && item.rule.employeeId 
            ? `/employees/${item.rule.employeeId}` 
            : '/settings',
          icon: Clock,
          color: item.daysOverdue > 7 ? 'danger' : 'warning',
          actionable: true,
          actions: ['complete', 'snooze', 'navigate']
        });
      });
    }

    // 3. Offboarding employees (Priority: 1.8)
    const offboardingEmployees = filteredEmployees?.filter((e: any) => 
      e.status === 'OFFBOARDING' && !isDismissed('offboarding', e.id)
    ) || [];
    if (offboardingEmployees.length > 0) {
      items.push({
        type: 'offboarding',
        id: offboardingEmployees[0].id,
        priority: 1.8,
        title: `Complete offboarding for ${offboardingEmployees[0].name}`,
        description: `${offboardingEmployees.length} team member${offboardingEmployees.length > 1 ? 's' : ''} leaving`,
        link: `/employees/${offboardingEmployees[0].id}`,
        icon: Users,
        color: 'warning',
        actionable: true,
        actions: ['dismiss', 'navigate']
      });
    }

    // 4. Stale 1:1s (30+ days) - Use dueItems with ONE_ON_ONE type (Priority: 2)
    const staleOneOnOnes = filteredDueItems?.filter((item: any) => 
      item.rule.type === 'ONE_ON_ONE' && 
      item.daysOverdue > 7 &&
      !isDismissed('stale-1on1', item.rule.id)
    ) || [];
    if (staleOneOnOnes.length > 0) {
      items.push({
        type: 'stale-1on1',
        id: staleOneOnOnes[0].rule.id,
        priority: 2,
        title: `${staleOneOnOnes.length} team member${staleOneOnOnes.length > 1 ? 's need' : ' needs'} a 1:1`,
        description: `It's been ${staleOneOnOnes[0].daysOverdue} days since last check-in`,
        link: staleOneOnOnes[0].rule.employeeId ? `/employees/${staleOneOnOnes[0].rule.employeeId}` : '/employees',
        icon: Users,
        color: 'warning',
        actionable: true,
        actions: ['create-event', 'navigate']
      });
    }

    // 5. Events without actions (need to mark or create actions) (Priority: 2)
    const eventsNeedingAction = filteredEvents?.filter((e: any) => 
      e.needsAction && 
      (!e.actions || e.actions.length === 0) &&
      !isDismissed('event-action', e.id)
    ) || [];
    if (eventsNeedingAction.length > 0) {
      items.push({
        type: 'event-action',
        id: eventsNeedingAction.map((e: any) => e.id).join(','),
        priority: 2,
        title: `Review ${eventsNeedingAction.length} meeting${eventsNeedingAction.length > 1 ? 's' : ''} from today`,
        description: 'Create actions or mark as no action needed',
        link: '/events',
        icon: Calendar,
        color: 'warning',
        actionable: true,
        actions: ['mark-no-action', 'navigate']
      });
    }

    // 6. Challenges nearing completion (80%+) (Priority: 2.5)
    const nearCompleteChallenge = challenges?.find((c: any) => 
      !c.completed && 
      c.progress / c.challenge.target >= 0.8 &&
      !isDismissed('challenge', c.challenge.id)
    );
    if (nearCompleteChallenge) {
      const remaining = nearCompleteChallenge.challenge.target - nearCompleteChallenge.progress;
      items.push({
        type: 'challenge',
        id: nearCompleteChallenge.challenge.id,
        priority: 2.5,
        title: 'Challenge almost complete!',
        description: `Complete ${remaining} more to finish '${nearCompleteChallenge.challenge.name}'`,
        link: '/achievements',
        icon: Target,
        color: 'success',
        actionable: true,
        actions: ['dismiss', 'navigate']
      });
    }

    // 7. AI suggestions from daily briefing (Priority: 3)
    if (dailyBriefing?.briefing?.suggestions?.length > 0) {
      dailyBriefing.briefing.suggestions.slice(0, 2).forEach((suggestion: any, i: number) => {
        const suggestionId = `${suggestion.title}-${i}`;
        if (isDismissed('ai-suggestion', suggestionId)) return;
        
        items.push({
          type: 'ai-suggestion',
          id: suggestionId,
          priority: 3 + i,
          title: suggestion.title,
          description: suggestion.description,
          icon: Sparkles,
          color: 'primary',
          actionable: true,
          actions: ['dismiss', suggestion.actionable ? 'quick-add' : null].filter(Boolean)
        });
      });
    } else if (focusSuggestions?.length > 0) {
      // Fallback to regular focus suggestions
      focusSuggestions.slice(0, 2).forEach((suggestion: any, i: number) => {
        const suggestionId = `${suggestion.title}-${i}`;
        if (isDismissed('suggestion', suggestionId)) return;
        
        items.push({
          type: 'suggestion',
          id: suggestionId,
          priority: 3 + i,
          title: suggestion.title,
          description: suggestion.description,
          icon: Sparkles,
          color: 'primary',
          actionable: true,
          actions: ['dismiss']
        });
      });
    }

    // 8. Pending dev plans (Priority: 4)
    const employeesWithoutDevPlan = filteredEmployees?.filter((e: any) => 
      e.status === 'ACTIVE' && 
      (!e._count?.developmentPlans || e._count.developmentPlans === 0) &&
      !isDismissed('dev-plan', 'missing')
    ) || [];
    if (employeesWithoutDevPlan.length > 0) {
      items.push({
        type: 'dev-plan',
        id: 'missing',
        priority: 4,
        title: 'Development plans missing',
        description: `${employeesWithoutDevPlan.length} team member${employeesWithoutDevPlan.length > 1 ? 's need' : ' needs'} development plans`,
        link: '/employees',
        icon: TrendingUp,
        color: 'primary',
        actionable: true,
        actions: ['dismiss', 'navigate']
      });
    }

    // 9. Busiest work area (Priority: 6)
    const busiestArea = workAreas?.reduce((max: any, area: any) => 
      (area._count?.actions || 0) > (max._count?.actions || 0) ? area : max
    , { _count: { actions: 0 } });
    if (busiestArea && busiestArea._count?.actions > 10 && !isDismissed('busy-area', busiestArea.id)) {
      items.push({
        type: 'busy-area',
        id: busiestArea.id,
        priority: 6,
        title: `${busiestArea.name} needs attention`,
        description: `${busiestArea._count.actions} pending actions`,
        link: `/actions?workAreaId=${busiestArea.id}`,
        icon: Target,
        color: 'primary',
        actionable: true,
        actions: ['dismiss', 'navigate']
      });
    }

    // 10. Uncategorized actions (Priority: 8)
    const uncategorizedActions = filteredActions?.filter((a: any) => 
      !a.workAreaId && a.status !== 'COMPLETED' && a.status !== 'CANCELLED'
    ) || [];
    if (uncategorizedActions.length > 5 && !isDismissed('uncategorized', 'actions')) {
      items.push({
        type: 'uncategorized',
        id: 'actions',
        priority: 8,
        title: 'Organize uncategorized actions',
        description: `${uncategorizedActions.length} actions need a work area`,
        link: '/actions',
        icon: Briefcase,
        color: 'primary',
        actionable: true,
        actions: ['dismiss', 'navigate']
      });
    }

    // 11. Suggest skill improvement if XP is available (Priority: 10)
    if (stats && stats.currentXp >= 100 && !isDismissed('skill-xp', 'available')) {
      items.push({
        type: 'skill-xp',
        id: 'available',
        priority: 10,
        title: 'You have XP to spend!',
        description: `${stats.currentXp} XP available - unlock a new skill`,
        link: '/skills',
        icon: Zap,
        color: 'success',
        actionable: true,
        actions: ['dismiss', 'navigate']
      });
    }

    return items.sort((a, b) => a.priority - b.priority).slice(0, 5);
  };

  const focusItems = buildFocusItems();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const getIconComponent = (iconName: string) => {
    const found = iconOptions.find(i => i.value === iconName);
    return found?.icon || Target;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-text-primary">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Leader'}
          </h1>
          <p className="text-text-secondary mt-1 font-body">
            {formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}
            {((actionStats?.pending || 0) > 0 || (todayEvents?.length || 0) > 0) && (
              <span className="ml-2">
                {actionStats?.pending > 0 && (
                  <span className="text-primary">{actionStats.pending} pending action{actionStats.pending !== 1 ? 's' : ''}</span>
                )}
                {actionStats?.pending > 0 && todayEvents?.length > 0 && ' and '}
                {todayEvents?.length > 0 && (
                  <span className="text-secondary">{todayEvents.length} meeting{todayEvents.length !== 1 ? 's' : ''} today</span>
                )}
              </span>
            )}
          </p>
        </div>
        
        {/* Work Area Focus Mode Toggle */}
        {workAreas && workAreas.length > 0 && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFocusModeDropdown(!showFocusModeDropdown)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              {focusedWorkAreaId ? (
                <span className="flex items-center gap-2">
                  Focused: {workAreas.find((a: any) => a.id === focusedWorkAreaId)?.name}
                  <X 
                    className="w-3 h-3 hover:text-danger" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedWorkAreaId(null);
                    }}
                  />
                </span>
              ) : (
                'All Areas'
              )}
              <ChevronDown className="w-4 h-4" />
            </Button>
            
            <AnimatePresence>
              {showFocusModeDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-64 bg-background border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                >
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setFocusedWorkAreaId(null);
                        setShowFocusModeDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-surface transition-colors ${
                        !focusedWorkAreaId ? 'bg-surface font-semibold' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Grid className="w-4 h-4" />
                        All Work Areas
                      </div>
                    </button>
                    
                    <div className="my-2 border-t border-border" />
                    
                    {workAreas
                      .filter((area: any) => !area.isHidden)
                      .map((area: any) => {
                        const IconComponent = getIconComponent(area.icon);
                        return (
                          <button
                            key={area.id}
                            onClick={() => {
                              setFocusedWorkAreaId(area.id);
                              setShowFocusModeDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded hover:bg-surface transition-colors ${
                              focusedWorkAreaId === area.id ? 'bg-surface font-semibold' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <IconComponent className="w-4 h-4" style={{ color: area.color }} />
                              <span>{area.name}</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Work Areas */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold tracking-wide uppercase text-text-primary">
            Work Areas
          </h2>
          <div className="flex items-center gap-2">
            {workAreas?.some((a: any) => a.isHidden) && (
              <Button 
                size="sm" 
                variant={showHiddenAreas ? 'secondary' : 'ghost'}
                onClick={() => setShowHiddenAreas(!showHiddenAreas)}
                leftIcon={showHiddenAreas ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              >
                {showHiddenAreas ? 'Showing hidden' : 'Show hidden'}
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={() => setIsAreaModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Area
            </Button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          {workAreas?.filter((area: any) => showHiddenAreas || !area.isHidden).map((area: any) => {
            const IconComponent = getIconComponent(area.icon);
            return (
              <Card 
                key={area.id} 
                className={cn(
                  "relative group cursor-pointer border-2 border-transparent hover:border-opacity-50 transition-all",
                  area.isHidden && "opacity-40"
                )}
                style={{ 
                  '--area-color': area.color,
                  borderColor: `${area.color}30`
                } as any}
                onClick={() => navigate(`/actions?workAreaId=${area.id}`)}
              >
                {/* Hidden indicator */}
                {area.isHidden && (
                  <div className="absolute top-3 left-3">
                    <EyeOff className="w-4 h-4 text-text-muted" />
                  </div>
                )}

                {/* Area menu button */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAreaMenuOpen(areaMenuOpen === area.id ? null : area.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface"
                  >
                    <MoreVertical className="w-4 h-4 text-text-muted" />
                  </button>
                  
                  {/* Dropdown menu */}
                  <AnimatePresence>
                    {areaMenuOpen === area.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-surface py-1 min-w-[140px] z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            toggleHideMutation.mutate({ id: area.id, isHidden: !area.isHidden });
                            setAreaMenuOpen(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2"
                        >
                          {area.isHidden ? (
                            <><Eye className="w-4 h-4" /> Show</>
                          ) : (
                            <><EyeOff className="w-4 h-4" /> Hide</>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingArea(area);
                            setAreaMenuOpen(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this area? Items will be disconnected.')) {
                              deleteAreaMutation.mutate(area.id);
                            }
                            setAreaMenuOpen(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2 text-danger"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${area.color}20` }}
                  >
                    <IconComponent className="w-6 h-6" style={{ color: area.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-text-primary tracking-wide">
                      {area.name}
                    </h3>
                    {area.description && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                        {area.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Link 
                    to={`/actions?workAreaId=${area.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                  >
                    <p className="font-display text-lg font-bold" style={{ color: area.color }}>
                      {area.pendingActions || 0}
                    </p>
                    <p className="text-xs text-text-muted">Actions</p>
                  </Link>
                  <Link 
                    to={`/employees?workAreaId=${area.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                  >
                    <p className="font-display text-lg font-bold" style={{ color: area.color }}>
                      {area._count?.employees || 0}
                    </p>
                    <p className="text-xs text-text-muted">Team</p>
                  </Link>
                  <Link 
                    to={`/events?workAreaId=${area.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                  >
                    <p className="font-display text-lg font-bold" style={{ color: area.color }}>
                      {area._count?.events || 0}
                    </p>
                    <p className="text-xs text-text-muted">Events</p>
                  </Link>
                </div>

                {/* Overdue indicator */}
                {area.overdueActions > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-danger text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{area.overdueActions} overdue</span>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Empty state / Add new */}
          {(!workAreas || workAreas.length === 0) && (
            <Card 
              className="border-2 border-dashed border-text-muted/30 hover:border-primary/50 cursor-pointer transition-colors col-span-full"
              onClick={() => setIsAreaModalOpen(true)}
            >
              <div className="text-center py-8">
                <Plus className="w-10 h-10 text-text-muted mx-auto mb-2" />
                <p className="text-text-secondary">Create your first work area</p>
                <p className="text-sm text-text-muted mt-1">
                  e.g., Team Lead, Competence Lead, Projects
                </p>
              </div>
            </Card>
          )}
        </div>
      </motion.div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Focus & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Focus */}
          <motion.div variants={itemVariants}>
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <CardTitle className="font-display tracking-wide">TODAY'S FOCUS</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {focusItems.length > 0 ? (
                  <ul className="space-y-3">
                    {focusItems.map((item, i) => {
                      const IconComp = item.icon;
                      return (
                        <motion.li 
                          key={`${item.type}-${item.id || i}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-xl transition-colors relative group",
                            item.link ? "hover:bg-surface cursor-pointer" : "bg-surface"
                          )}
                          onClick={() => item.link && navigate(item.link)}
                        >
                          {/* Priority indicator */}
                          <span className={cn(
                            "absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full",
                            item.priority <= 1.3 && "bg-danger",
                            item.priority > 1.3 && item.priority < 3 && "bg-warning",
                            item.priority >= 3 && item.priority <= 6 && "bg-primary",
                            item.priority > 6 && "bg-success"
                          )} />
                          <span className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            item.color === 'danger' && "bg-danger/20 text-danger",
                            item.color === 'warning' && "bg-warning/20 text-warning",
                            item.color === 'success' && "bg-success/20 text-success",
                            item.color === 'primary' && "bg-primary/20 text-primary"
                          )}>
                            <IconComp className="w-4 h-4" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-text-primary">{item.title}</p>
                              {item.priority <= 1.3 && (
                                <span className="text-[10px] font-bold uppercase text-danger bg-danger/10 px-1.5 py-0.5 rounded">Urgent</span>
                              )}
                            </div>
                            <p className="text-sm text-text-secondary mt-0.5">{item.description}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {item.actionable && (
                              <FocusItemActions 
                                item={item} 
                                onNavigate={item.link ? () => navigate(item.link) : undefined}
                              />
                            )}
                            {item.link && !item.actionable && (
                              <ChevronRight className="w-5 h-5 text-text-muted" />
                            )}
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-primary mx-auto mb-3 opacity-50" />
                    <p className="text-text-primary font-medium mb-1">Nothing urgent right now</p>
                    <p className="text-text-secondary text-sm">You're all set for today! 🎯</p>
                    <button
                      onClick={() => setActionModalState({ isOpen: true })}
                      className="mt-4 text-sm text-primary hover:underline"
                    >
                      Create a new action
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions Requiring Attention */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-danger" />
                    <CardTitle className="font-display tracking-wide">ACTIONS REQUIRING ATTENTION</CardTitle>
                  </div>
                  <Link 
                    to="/actions" 
                    className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Build categorized actions list
                  const categoryItems: any[] = [];
                  
                  // 1. Overdue actions
                  if (filteredOverdueActions && filteredOverdueActions.length > 0) {
                    filteredOverdueActions.slice(0, 3).forEach((action: any) => {
                      categoryItems.push({
                        ...action,
                        category: 'overdue',
                        categoryLabel: 'Overdue',
                        categoryColor: 'danger'
                      });
                    });
                  }
                  
                  // 2. Actions due in 1-3 days
                  const soonDueActions = filteredActions?.filter((a: any) => {
                    if (!a.dueDate || a.status === 'COMPLETED' || a.status === 'CANCELLED') return false;
                    const daysUntil = Math.ceil((new Date(a.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntil >= 0 && daysUntil <= 3;
                  }).slice(0, 3) || [];
                  
                  soonDueActions.forEach((action: any) => {
                    if (!categoryItems.find(i => i.id === action.id)) {
                      categoryItems.push({
                        ...action,
                        category: 'due-soon',
                        categoryLabel: 'Due Soon',
                        categoryColor: 'warning'
                      });
                    }
                  });
                  
                  // 3. Actions with incomplete subtasks (20-40% remaining)
                  const actionsWithSubtasks = filteredActions?.filter((a: any) => {
                    if (!a.subtasks || a.subtasks.length === 0) return false;
                    if (a.status === 'COMPLETED' || a.status === 'CANCELLED') return false;
                    
                    const completedCount = a.subtasks.filter((s: any) => s.status === 'COMPLETED').length;
                    const totalCount = a.subtasks.length;
                    const completionRatio = completedCount / totalCount;
                    const remainingRatio = 1 - completionRatio;
                    
                    // 20-40% incomplete AND (overdue OR due soon)
                    const isInRange = remainingRatio >= 0.2 && remainingRatio <= 0.4;
                    if (!isInRange) return false;
                    
                    // Check if overdue or due soon
                    if (!a.dueDate) return false;
                    const daysUntil = Math.ceil((new Date(a.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntil <= 3; // overdue or due within 3 days
                  }).slice(0, 2) || [];
                  
                  actionsWithSubtasks.forEach((action: any) => {
                    if (!categoryItems.find(i => i.id === action.id)) {
                      const completedCount = action.subtasks.filter((s: any) => s.status === 'COMPLETED').length;
                      categoryItems.push({
                        ...action,
                        category: 'subtasks',
                        categoryLabel: `${completedCount}/${action.subtasks.length} subtasks done`,
                        categoryColor: 'primary'
                      });
                    }
                  });
                  
                  // Limit to 5 total items
                  const displayItems = categoryItems.slice(0, 5);
                  
                  if (displayItems.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <CheckSquare className="w-12 h-12 text-success mx-auto mb-3 opacity-50" />
                        <p className="text-text-primary font-medium mb-1">All caught up! 🎉</p>
                        <p className="text-text-secondary text-sm">No actions require immediate attention</p>
                      </div>
                    );
                  }
                  
                  return (
                    <ul className="space-y-3">
                      {displayItems.map((action: any) => {
                        const dueLabel = action.dueDate ? getDueDateLabel(action.dueDate) : null;
                        const isExpanded = expandedActions.has(action.id);
                        const hasSubtasks = action.subtasks && action.subtasks.length > 0;
                        
                        return (
                          <li 
                            key={action.id}
                            className="p-3 bg-surface rounded-xl border border-border hover:border-primary/30 transition-all"
                          >
                            {/* Main action row */}
                            <div className="flex items-start gap-3">
                              {/* Complete button - prominent one-click */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompleteAction(action);
                                }}
                                className="mt-0.5 p-1.5 hover:bg-success/20 rounded-lg transition-all flex-shrink-0 group border-2 border-transparent hover:border-success/30"
                                disabled={updateActionMutation.isPending}
                                title="Complete action"
                              >
                                <Check className="w-5 h-5 text-success group-hover:scale-110 transition-transform" />
                              </button>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-text-primary">{action.title}</p>
                                    
                                    {/* Badges row */}
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {/* Employee */}
                                      {action.assignedTo && (
                                        <Badge variant="secondary" size="sm" className="text-[10px]">
                                          <User className="w-3 h-3 mr-1" />
                                          {action.assignedTo.name}
                                        </Badge>
                                      )}
                                      
                                      {/* Work Area */}
                                      {action.workArea && (
                                        <Badge 
                                          variant="secondary" 
                                          size="sm" 
                                          className="text-[10px]"
                                          style={{ 
                                            backgroundColor: `${action.workArea.color}20`,
                                            borderColor: action.workArea.color 
                                          }}
                                        >
                                          {action.workArea.name}
                                        </Badge>
                                      )}
                                      
                                      {/* Team */}
                                      {action.team && (
                                        <Badge variant="secondary" size="sm" className="text-[10px]">
                                          <Users className="w-3 h-3 mr-1" />
                                          {action.team.name}
                                        </Badge>
                                      )}
                                      
                                      {/* Category */}
                                      <Badge 
                                        variant={action.categoryColor as any} 
                                        size="sm"
                                        className="text-[10px]"
                                      >
                                        {action.categoryLabel}
                                      </Badge>
                                      
                                      {/* Due date */}
                                      {dueLabel && (
                                        <Badge variant={dueLabel.variant as any} size="sm" className="text-[10px]">
                                          {dueLabel.text}
                                        </Badge>
                                      )}
                                      
                                      {/* Subtasks badge */}
                                      {hasSubtasks && (
                                        <button
                                          onClick={() => toggleExpandAction(action.id)}
                                          className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                                        >
                                          {action.subtasks.filter((s: any) => s.status === 'COMPLETED').length}/{action.subtasks.length} subtasks
                                          <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Action buttons */}
                                <div className="flex items-center gap-1 mt-2">
                                  {/* Postpone dropdown */}
                                  <div className="relative group">
                                    <button
                                      className="text-xs px-2 py-1 bg-background hover:bg-surface rounded border border-border transition-colors flex items-center gap-1"
                                    >
                                      <Clock className="w-3 h-3" />
                                      Postpone
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                    <div className="absolute left-0 mt-1 hidden group-hover:block bg-background border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                                      {[1, 3, 7].map(days => (
                                        <button
                                          key={days}
                                          onClick={() => handlePostponeAction(action.id, days)}
                                          className="w-full text-left px-3 py-2 hover:bg-surface text-xs"
                                        >
                                          +{days} day{days > 1 ? 's' : ''}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Edit */}
                                  <button
                                    onClick={() => handleEditAction(action)}
                                    className="text-xs px-2 py-1 bg-background hover:bg-surface rounded border border-border transition-colors flex items-center gap-1"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    Edit
                                  </button>
                                  
                                  {/* Add Subtask */}
                                  <button
                                    onClick={() => handleAddSubtask(action)}
                                    className="text-xs px-2 py-1 bg-background hover:bg-surface rounded border border-border transition-colors flex items-center gap-1"
                                  >
                                    <ListPlus className="w-3 h-3" />
                                    Add Subtask
                                  </button>
                                </div>
                                
                                {/* Expanded subtasks */}
                                <AnimatePresence>
                                  {isExpanded && hasSubtasks && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="mt-3 space-y-1 overflow-hidden"
                                    >
                                      {action.subtasks.map((subtask: any) => (
                                        <div 
                                          key={subtask.id}
                                          className="flex items-center gap-2 pl-4 py-1.5 bg-background rounded"
                                        >
                                          {subtask.status === 'COMPLETED' ? (
                                            <Check className="w-4 h-4 text-success flex-shrink-0" />
                                          ) : (
                                            <div className="w-4 h-4 border-2 border-border rounded flex-shrink-0" />
                                          )}
                                          <span className={`text-sm flex-1 ${subtask.status === 'COMPLETED' ? 'line-through text-text-muted' : ''}`}>
                                            {subtask.title}
                                          </span>
                                          {subtask.assignedTo && (
                                            <span className="text-xs text-text-secondary">
                                              {subtask.assignedTo.name}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}

                {/* Recently Completed Section */}
                {recentlyCompletedActions && recentlyCompletedActions.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <button
                      onClick={() => setShowRecentlyCompleted(!showRecentlyCompleted)}
                      className="flex items-center justify-between w-full text-left mb-3 group"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium text-text-secondary">
                          Recently Completed ({recentlyCompletedActions.length})
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showRecentlyCompleted ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showRecentlyCompleted && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-2 overflow-hidden"
                        >
                          {recentlyCompletedActions.map((action: any) => (
                            <div
                              key={action.id}
                              className="flex items-center gap-3 p-2 bg-success/5 rounded-lg border border-success/20"
                            >
                              <Check className="w-4 h-4 text-success flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-text-primary line-through opacity-75">
                                  {action.title}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {new Date(action.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <button
                                onClick={() => handleUncompleteAction(action)}
                                className="text-xs px-2 py-1 bg-background hover:bg-surface rounded border border-border transition-colors whitespace-nowrap"
                                disabled={updateActionMutation.isPending}
                              >
                                Undo
                              </button>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right column - Proactive Insights */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* TODO: INSIGHTS widget - disabled for future enhancement */}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-wide">QUICK ACTIONS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link
                  to="/extract"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-medium">Extract from Notes</span>
                </Link>
                <Link
                  to="/employees"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-secondary/10 transition-colors"
                >
                  <Users className="w-5 h-5 text-secondary" />
                  <span className="font-medium">View Team</span>
                </Link>
                <Link
                  to="/events"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-accent/10 transition-colors"
                >
                  <Calendar className="w-5 h-5 text-accent" />
                  <span className="font-medium">Events & Meetings</span>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Leadership Cadence */}
          <LeadershipCadence dueItems={dueItems} />

          {/* Team Pulse */}
          <TeamPulse />

          {/* Upcoming People Events */}
          <PeopleEvents />
        </motion.div>
      </div>

      {/* Create/Edit Area Modal */}
      <AreaModal
        isOpen={isAreaModalOpen || !!editingArea}
        onClose={() => {
          setIsAreaModalOpen(false);
          setEditingArea(null);
        }}
        area={editingArea}
        onSubmit={(data) => {
          if (editingArea) {
            updateAreaMutation.mutate({ id: editingArea.id, data });
          } else {
            createAreaMutation.mutate(data);
          }
        }}
        isLoading={createAreaMutation.isPending || updateAreaMutation.isPending}
      />

      {/* Action Modal */}
      <ActionModal
        isOpen={actionModalState.isOpen}
        onClose={() => setActionModalState({ isOpen: false })}
        action={actionModalState.action}
        defaults={actionModalState.defaults}
      />

      {/* Floating Action Button */}
      <FloatingActionButton
        onCreateAction={() => setActionModalState({ isOpen: true })}
        onCreateEvent={() => navigate('/events')}
        onExtractNotes={() => navigate('/ai/extract')}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <AnimatePresence>
        {showKeyboardHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowKeyboardHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-background rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-bold">Keyboard Shortcuts</h3>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="p-1 hover:bg-surface rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <span className="text-text-secondary">New Action</span>
                  <kbd className="px-3 py-1 bg-background border border-border rounded font-mono text-sm">A</kbd>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <span className="text-text-secondary">New Event</span>
                  <kbd className="px-3 py-1 bg-background border border-border rounded font-mono text-sm">E</kbd>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <span className="text-text-secondary">Focus Mode Toggle</span>
                  <kbd className="px-3 py-1 bg-background border border-border rounded font-mono text-sm">F</kbd>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <span className="text-text-secondary">Extract Notes</span>
                  <kbd className="px-3 py-1 bg-background border border-border rounded font-mono text-sm">N</kbd>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <span className="text-text-secondary">Show This Help</span>
                  <kbd className="px-3 py-1 bg-background border border-border rounded font-mono text-sm">?</kbd>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AreaModal({ isOpen, onClose, area, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#D4A574',
    icon: 'target'
  });

  // Reset form when modal opens or area changes
  useEffect(() => {
    if (isOpen) {
      if (area) {
        setFormData({
          name: area.name || '',
          description: area.description || '',
          color: area.color || '#D4A574',
          icon: area.icon || 'target'
        });
      } else {
        setFormData({
          name: '',
          description: '',
          color: '#D4A574',
          icon: 'target'
        });
      }
    }
  }, [isOpen, area]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={area ? 'Edit Work Area' : 'Create Work Area'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Team Lead, Projects, Competence"
          required
        />
        
        <Textarea
          label="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What does this area cover?"
        />

        {/* Color picker */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
          <div className="flex gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({ ...formData, color: color.value })}
                className={cn(
                  "w-8 h-8 rounded-lg transition-all",
                  formData.color === color.value && "ring-2 ring-offset-2 ring-text-primary"
                )}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Icon</label>
          <div className="flex gap-2">
            {iconOptions.map((opt) => {
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: opt.value })}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    formData.icon === opt.value 
                      ? "bg-primary text-white" 
                      : "bg-surface text-text-secondary hover:bg-surface/80"
                  )}
                  title={opt.label}
                >
                  <IconComp className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-surface rounded-xl">
          <p className="text-xs text-text-muted mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${formData.color}20` }}
            >
              {(() => {
                const IconComp = iconOptions.find(i => i.value === formData.icon)?.icon || Target;
                return <IconComp className="w-5 h-5" style={{ color: formData.color }} />;
              })()}
            </div>
            <span className="font-display font-semibold">
              {formData.name || 'Area Name'}
            </span>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {area ? 'Save Changes' : 'Create Area'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
