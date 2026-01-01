import { 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  Sparkles, 
  TrendingUp, 
  Zap 
} from 'lucide-react';

interface FocusItemsParams {
  filteredEvents: any[];
  filteredDueItems: any[];
  filteredEmployees: any[];
  dailyBriefing: any;
  focusSuggestions: any[];
  challenges: any[];
  filteredActions: any[];
  workAreas: any[];
  stats: any;
}

/**
 * Custom hook to build smart focus items
 * Prioritizes 11 different types of items based on urgency and importance
 * 
 * Priority levels (lower = more urgent):
 * 1. Events without prep (1.2)
 * 2. Due cadence items (1.5)
 * 3. Offboarding employees (1.8)
 * 4. Stale 1:1s (2)
 * 5. Events needing actions (2)
 * 6. Challenges near completion (2.5)
 * 7. AI suggestions (3+)
 * 8. Missing dev plans (4)
 * 9. Busiest work area (6)
 * 10. Uncategorized actions (8)
 * 11. Available XP for skills (10)
 */
export function useFocusItems(params: FocusItemsParams) {
  const {
    filteredEvents,
    filteredDueItems,
    filteredEmployees,
    dailyBriefing,
    focusSuggestions,
    challenges,
    filteredActions,
    workAreas,
    stats
  } = params;

  const buildFocusItems = () => {
    const items: any[] = [];
    
    // Check localStorage for dismissed suggestions
    const dismissedSuggestions = JSON.parse(localStorage.getItem('dismissedSuggestions') || '[]');
    const isDismissed = (type: string, id: string) => 
      dismissedSuggestions.some((d: any) => d.type === type && d.id === id);

    // Helper: Days since date (unused but kept for reference)
    // const daysSince = (date: string | Date) => {
    //   const now = new Date();
    //   const then = new Date(date);
    //   return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
    // };

    // Helper: Days until date (unused but kept for reference)
    // const daysUntil = (date: string | Date) => {
    //   const now = new Date();
    //   const then = new Date(date);
    //   return Math.ceil((then.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    // };

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
    // Uses the AI-powered daily briefing API call with suggestions
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
      // Fallback to regular focus suggestions from AI
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
    // Note: Briefcase icon was removed from imports to avoid warnings
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
        icon: Target, // Using Target instead of Briefcase
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

    // Return top 5 items sorted by priority
    return items.sort((a, b) => a.priority - b.priority).slice(0, 5);
  };

  return buildFocusItems();
}
