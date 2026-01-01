import { useQuery } from '@tanstack/react-query';
import { apiHelpers } from '@/lib/api';

/**
 * Centralized data fetching hook for Dashboard page
 * 
 * Fetches 11 queries total:
 * - 9 standard queries (work areas, actions, events, employees, etc.)
 * - 2 AI-powered queries (dailyBriefing, focusSuggestions)
 * 
 * AI queries use retry: false for graceful failure and are cached to prevent
 * excessive AI generation on the backend.
 */
export function useDashboardData() {
  // Core data queries
  const workAreas = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

  const actionStats = useQuery({
    queryKey: ['actionStats'],
    queryFn: () => apiHelpers.getActionStats().then(r => r.data.data)
  });

  const overdueActions = useQuery({
    queryKey: ['actions', 'overdue'],
    queryFn: () => apiHelpers.getActions({ overdue: 'true' }).then(r => r.data.data)
  });

  const todayEvents = useQuery({
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

  /**
   * AI-POWERED: Fetches focus suggestions from AI service
   * Fails gracefully with retry: false
   */
  const focusSuggestions = useQuery({
    queryKey: ['focusSuggestions'],
    queryFn: () => apiHelpers.getFocusSuggestions().then(r => r.data.data),
    retry: false // Don't retry on AI failure - it's optional
  });

  /**
   * AI-POWERED: Fetches daily briefing from AI service
   * Cached for 30 minutes to prevent excessive AI generation
   * Fails gracefully with retry: false
   */
  const dailyBriefing = useQuery({
    queryKey: ['dailyBriefing'],
    queryFn: () => apiHelpers.getDailyBriefing().then(r => r.data.data),
    retry: false, // Don't retry on AI failure - it's optional
    staleTime: 1000 * 60 * 30 // Cache for 30 minutes
  });

  const dueItems = useQuery({
    queryKey: ['dueItems'],
    queryFn: () => apiHelpers.getDueItems().then(r => r.data.data),
    retry: false
  });

  const employees = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data)
  });

  const challenges = useQuery({
    queryKey: ['userChallenges'],
    queryFn: () => apiHelpers.getChallenges().then(r => r.data.data),
    retry: false
  });

  const allActions = useQuery({
    queryKey: ['actions'],
    queryFn: () => apiHelpers.getActions({}).then(r => r.data.data)
  });

  const recentlyCompletedActions = useQuery({
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
        const actions = r.data.data || [];
        return actions.filter((a: any) => {
          if (!a.updatedAt) return false;
          return new Date(a.updatedAt) >= oneDayAgo;
        });
      });
    }
  });

  return {
    workAreas: workAreas.data,
    isLoadingWorkAreas: workAreas.isLoading,
    actionStats: actionStats.data,
    overdueActions: overdueActions.data,
    todayEvents: todayEvents.data,
    focusSuggestions: focusSuggestions.data,
    dailyBriefing: dailyBriefing.data,
    dueItems: dueItems.data,
    employees: employees.data,
    challenges: challenges.data,
    allActions: allActions.data,
    recentlyCompletedActions: recentlyCompletedActions.data,
  };
}
