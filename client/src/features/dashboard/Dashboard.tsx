import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Target, Filter, Grid, ChevronDown, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import ActionModal from '@/components/ActionModal';
import FloatingActionButton from '@/components/FloatingActionButton';
import LeadershipCadence from '@/components/LeadershipCadence';
import TeamPulse from '@/components/TeamPulse';
import PeopleEvents from '@/components/PeopleEvents';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import apiHelpers from '@/lib/api';
import { iconOptions, getGreeting } from './constants';
import { useDashboardData } from './hooks/useDashboardData';
import { useFocusItems } from './hooks/useFocusItems';
import { DashboardHeader } from './components/DashboardHeader';
import { WorkAreasSection } from './components/WorkAreasSection';
import { TodaysFocusSection } from './components/TodaysFocusSection';
import { ActionsSection } from './components/ActionsSection';
import { QuickActionsCard } from './components/QuickActionsCard';
import { AreaModal } from './components/AreaModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State management
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

  /**
   * Data fetching using custom hook
   * Includes 11 queries: 9 standard + 2 AI-powered (dailyBriefing, focusSuggestions)
   * AI queries are cached and fail gracefully
   */
  const {
    workAreas,
    isLoadingWorkAreas: loadingAreas,
    actionStats,
    overdueActions,
    todayEvents,
    focusSuggestions,
    dailyBriefing,
    dueItems,
    employees,
    challenges,
    allActions,
    recentlyCompletedActions,
  } = useDashboardData();

  // Mutations
  const createAreaMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.post('/work-areas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      setIsAreaModalOpen(false);
      toast.success('Area created');
    }
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiHelpers.put(`/work-areas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      setEditingArea(null);
      toast.success('Area updated');
    }
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id: string) => apiHelpers.delete(`/work-areas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      toast.success('Area deleted');
    }
  });

  const toggleHideMutation = useMutation({
    mutationFn: ({ id, isHidden }: { id: string; isHidden: boolean }) => 
      apiHelpers.put(`/work-areas/${id}`, { isHidden }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
    }
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiHelpers.put(`/actions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actionStats'] });
      queryClient.invalidateQueries({ queryKey: ['overdueActions'] });
    }
  });

  // Action handlers
  const handleCompleteAction = (action: any) => {
    updateActionMutation.mutate(
      { id: action.id, data: { status: 'COMPLETED' } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['actions'] });
          queryClient.invalidateQueries({ queryKey: ['actionStats'] });
          queryClient.invalidateQueries({ queryKey: ['overdueActions'] });
          toast.success(`✓ Action completed! +${action.xpReward || 10} XP`);
        }
      }
    );
  };

  const handleUncompleteAction = (action: any) => {
    updateActionMutation.mutate(
      { id: action.id, data: { status: 'IN_PROGRESS' } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['actions'] });
          queryClient.invalidateQueries({ queryKey: ['actionStats'] });
          queryClient.invalidateQueries({ queryKey: ['overdueActions'] });
          toast.success('Action marked as incomplete');
        }
      }
    );
  };

  const handlePostponeAction = (actionId: string, days: number) => {
    const action = allActions?.find((a: any) => a.id === actionId);
    if (!action?.dueDate) return;
    
    const newDueDate = new Date(action.dueDate);
    newDueDate.setDate(newDueDate.getDate() + days);
    
    updateActionMutation.mutate(
      { id: actionId, data: { dueDate: newDueDate.toISOString() } },
      { onSuccess: () => toast.success(`Postponed by ${days} day${days > 1 ? 's' : ''}`) }
    );
  };

  const handleEditAction = (action: any) => {
    setActionModalState({ isOpen: true, action });
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Filter data based on hidden/focused work areas
  const visibleWorkAreaIds = workAreas
    ?.filter((a: any) => !a.isHidden)
    .map((a: any) => a.id) || [];
  
  const activeWorkAreaIds = focusedWorkAreaId 
    ? [focusedWorkAreaId]
    : visibleWorkAreaIds;

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

  // Generate focus items using extracted hook
  const focusItems = useFocusItems({
    filteredEvents,
    filteredDueItems,
    filteredEmployees,
    dailyBriefing,
    focusSuggestions,
    challenges,
    filteredActions,
    workAreas,
    stats
  });

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
      {/* Header with greeting, stats, and filter */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-text-primary">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Leader'}
          </h1>
          <p className="text-text-secondary mt-1 font-body">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {((actionStats?.pending || 0) > 0 || (todayEvents?.length || 0) > 0) && (
              <span className="ml-2">
                {(actionStats?.pending || 0) > 0 && (
                  <span className="text-primary">
                    {actionStats?.pending} pending action{actionStats?.pending !== 1 ? 's' : ''}
                  </span>
                )}
                {(actionStats?.pending || 0) > 0 && (todayEvents?.length || 0) > 0 && ' and '}
                {(todayEvents?.length || 0) > 0 && (
                  <span className="text-secondary">
                    {todayEvents?.length} meeting{todayEvents?.length !== 1 ? 's' : ''} today
                  </span>
                )}
              </span>
            )}
          </p>
        </div>

        {/* Work Area Focus Mode Toggle */}
        {workAreas && workAreas.length > 0 && (
          <div className="relative">
            <Button
              variant="ghost"
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

      {/* Work Areas Section */}
      <WorkAreasSection
        workAreas={workAreas}
        showHiddenAreas={showHiddenAreas}
        areaMenuOpen={areaMenuOpen}
        itemVariants={itemVariants}
        onAddArea={() => setIsAreaModalOpen(true)}
        onEditArea={(area) => setEditingArea(area)}
        onDeleteArea={(id) => deleteAreaMutation.mutate(id)}
        onToggleHide={(id, isHidden) => toggleHideMutation.mutate({ id, isHidden })}
        setShowHiddenAreas={setShowHiddenAreas}
        setAreaMenuOpen={setAreaMenuOpen}
      />

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Focus & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Focus */}
          <TodaysFocusSection
            focusItems={focusItems}
            onCreateAction={() => setActionModalState({ isOpen: true })}
            itemVariants={itemVariants}
          />

          {/* Actions Requiring Attention */}
          <ActionsSection
            filteredActions={filteredActions}
            filteredOverdueActions={filteredOverdueActions}
            recentlyCompletedActions={recentlyCompletedActions}
            itemVariants={itemVariants}
            expandedActions={expandedActions}
            showRecentlyCompleted={showRecentlyCompleted}
            updateActionMutationPending={updateActionMutation.isPending}
            onCompleteAction={handleCompleteAction}
            onUncompleteAction={handleUncompleteAction}
            onPostponeAction={handlePostponeAction}
            onEditAction={handleEditAction}
            onAddSubtask={handleAddSubtask}
            onToggleExpandAction={toggleExpandAction}
            setShowRecentlyCompleted={setShowRecentlyCompleted}
          />
        </div>

        {/* Right column - Proactive Insights */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Quick Actions */}
          <QuickActionsCard />

          {/* Leadership Cadence */}
          <LeadershipCadence dueItems={dueItems} />

          {/* Team Pulse */}
          <TeamPulse />

          {/* People Events */}
          <PeopleEvents />
        </motion.div>
      </div>

      {/* Action Modal */}
      <ActionModal
        isOpen={actionModalState.isOpen}
        onClose={() => setActionModalState({ isOpen: false })}
        action={actionModalState.action}
        defaults={actionModalState.defaults}
      />

      {/* Area Modal */}
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

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />

      {/* Floating Action Button */}
      <FloatingActionButton 
        onCreateAction={() => setActionModalState({ isOpen: true })}
        onCreateEvent={() => navigate('/events/new')}
        onExtractNotes={() => navigate('/ai/extract')}
      />
    </motion.div>
  );
}
