/**
 * Statistics Routes
 * Dashboard statistics, metrics, and analytics
 */
import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  differenceInDays
} from 'date-fns';

const router = Router();

router.use(authenticateToken);

/**
 * Get dashboard statistics
 * GET /statistics/dashboard
 */
router.get('/dashboard', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();
    
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    
    // Get all actions
    const allActions = await prisma.action.findMany({
      where: { userId },
      include: {
        team: { select: { id: true, name: true } },
        workArea: { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } }
      }
    });
    
    // Action stats
    const totalActions = allActions.length;
    const completedActions = allActions.filter(a => a.status === 'COMPLETED').length;
    const pendingActions = allActions.filter(a => a.status === 'PENDING').length;
    const inProgressActions = allActions.filter(a => a.status === 'IN_PROGRESS').length;
    const overdueActions = allActions.filter(a => 
      a.status !== 'COMPLETED' && 
      a.status !== 'CANCELLED' && 
      a.dueDate && 
      new Date(a.dueDate) < now
    ).length;
    const blockers = allActions.filter(a => 
      a.isBlocker && 
      a.status !== 'COMPLETED' && 
      a.status !== 'CANCELLED'
    ).length;
    
    // Decision stats
    const decisionsThisWeek = allActions.filter(a => 
      a.type === 'DECISION' && 
      new Date(a.createdAt) >= weekStart && 
      new Date(a.createdAt) <= weekEnd
    ).length;
    
    const decisionsThisMonth = allActions.filter(a => 
      a.type === 'DECISION' && 
      new Date(a.createdAt) >= monthStart && 
      new Date(a.createdAt) <= monthEnd
    ).length;
    
    // Meeting stats
    const eventsThisWeek = await prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: weekStart, lte: weekEnd }
      },
      include: {
        eventType: true
      }
    });
    
    const meetingsThisWeek = eventsThisWeek.length;
    const meetingHoursThisWeek = eventsThisWeek.reduce((total, event) => {
      const duration = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60);
      return total + duration;
    }, 0);
    
    const oneOnOnesThisWeek = eventsThisWeek.filter(e => 
      e.eventType?.category === 'ONE_ON_ONE'
    ).length;
    
    // Team & employee counts
    const teamsManaged = await prisma.team.count({ where: { userId } });
    const employeesManaged = await prisma.employee.count({ where: { userId } });
    
    // Weekly velocity
    const completedThisWeek = allActions.filter(a => 
      a.status === 'COMPLETED' && 
      a.completedAt && 
      new Date(a.completedAt) >= weekStart && 
      new Date(a.completedAt) <= weekEnd
    ).length;
    
    const createdThisWeek = allActions.filter(a => 
      new Date(a.createdAt) >= weekStart && 
      new Date(a.createdAt) <= weekEnd
    ).length;
    
    const weeklyVelocity = createdThisWeek > 0 
      ? completedThisWeek / createdThisWeek 
      : completedThisWeek > 0 ? 1 : 0;
    
    // Monthly trend
    const completedLastWeek = allActions.filter(a => 
      a.status === 'COMPLETED' && 
      a.completedAt && 
      new Date(a.completedAt) >= lastWeekStart && 
      new Date(a.completedAt) <= lastWeekEnd
    ).length;
    
    let monthlyTrend: 'up' | 'down' | 'stable' = 'stable';
    if (completedThisWeek > completedLastWeek * 1.1) monthlyTrend = 'up';
    else if (completedThisWeek < completedLastWeek * 0.9) monthlyTrend = 'down';
    
    // Breakdowns
    const actionsByTeam: Record<string, number> = {};
    const actionsByArea: Record<string, number> = {};
    const actionsByEmployee: Record<string, number> = {};
    
    allActions.forEach(action => {
      if (action.team) {
        actionsByTeam[action.team.name] = (actionsByTeam[action.team.name] || 0) + 1;
      }
      if (action.workArea) {
        actionsByArea[action.workArea.name] = (actionsByArea[action.workArea.name] || 0) + 1;
      }
      if (action.employee) {
        actionsByEmployee[action.employee.name] = (actionsByEmployee[action.employee.name] || 0) + 1;
      }
    });
    
    res.json({
      totalActions,
      completedActions,
      pendingActions,
      inProgressActions,
      overdueActions,
      blockers,
      decisionsThisWeek,
      decisionsThisMonth,
      meetingsThisWeek,
      meetingHoursThisWeek: Math.round(meetingHoursThisWeek * 10) / 10,
      oneOnOnesThisWeek,
      teamsManaged,
      employeesManaged,
      weeklyVelocity: Math.round(weeklyVelocity * 100) / 100,
      monthlyTrend,
      actionsByTeam,
      actionsByArea,
      actionsByEmployee
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Get time allocation breakdown
 * GET /statistics/time-allocation
 */
router.get('/time-allocation', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const weekOffset = parseInt(req.query.weekOffset as string) || 0;
    
    const now = new Date();
    const targetDate = subWeeks(now, weekOffset);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(targetDate, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(targetDate, 1), { weekStartsOn: 1 });
    
    // Get all work areas
    const workAreas = await prisma.workArea.findMany({
      where: { userId }
    });
    
    // Get events for current and last week
    const currentWeekEvents = await prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: weekStart, lte: weekEnd }
      }
    });
    
    const lastWeekEvents = await prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: lastWeekStart, lte: lastWeekEnd }
      }
    });
    
    // Calculate hours per area
    const currentHours: Record<string, number> = {};
    const lastHours: Record<string, number> = {};
    
    currentWeekEvents.forEach(event => {
      const areaId = event.workAreaId || 'unassigned';
      const hours = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60);
      currentHours[areaId] = (currentHours[areaId] || 0) + hours;
    });
    
    lastWeekEvents.forEach(event => {
      const areaId = event.workAreaId || 'unassigned';
      const hours = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60);
      lastHours[areaId] = (lastHours[areaId] || 0) + hours;
    });
    
    const totalCurrentHours = Object.values(currentHours).reduce((sum, h) => sum + h, 0);
    
    const allocation = workAreas.map(area => {
      const hoursThisWeek = currentHours[area.id] || 0;
      const hoursLastWeek = lastHours[area.id] || 0;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (hoursThisWeek > hoursLastWeek * 1.2) trend = 'up';
      else if (hoursThisWeek < hoursLastWeek * 0.8) trend = 'down';
      
      return {
        areaId: area.id,
        areaName: area.name,
        color: area.color,
        hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
        percentageOfTotal: totalCurrentHours > 0 
          ? Math.round((hoursThisWeek / totalCurrentHours) * 100) 
          : 0,
        trend
      };
    });
    
    // Add unassigned if any
    if (currentHours['unassigned']) {
      allocation.push({
        areaId: 'unassigned',
        areaName: 'Unassigned',
        color: '#888888',
        hoursThisWeek: Math.round(currentHours['unassigned'] * 10) / 10,
        percentageOfTotal: totalCurrentHours > 0 
          ? Math.round((currentHours['unassigned'] / totalCurrentHours) * 100) 
          : 0,
        trend: 'stable' as const
      });
    }
    
    res.json({
      weekStart,
      weekEnd,
      totalHours: Math.round(totalCurrentHours * 10) / 10,
      allocation: allocation.filter(a => a.hoursThisWeek > 0)
    });
  } catch (error) {
    console.error('Error fetching time allocation:', error);
    res.status(500).json({ error: 'Failed to fetch time allocation' });
  }
});

/**
 * Get team metrics
 * GET /statistics/teams/:teamId/metrics
 */
router.get('/teams/:teamId/metrics', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { teamId } = req.params;
    
    // Verify team belongs to user
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId },
      include: {
        members: {
          include: {
            employee: {
              include: {
                oneOnOnes: {
                  take: 10,
                  orderBy: { date: 'desc' }
                }
              }
            }
          }
        }
      }
    });
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    // Get team actions
    const teamActions = await prisma.action.findMany({
      where: { teamId }
    });
    
    // Get team events
    const teamEvents = await prisma.event.findMany({
      where: {
        teamId,
        startTime: { gte: weekStart, lte: weekEnd }
      }
    });
    
    // Calculate metrics
    const openActions = teamActions.filter(a => 
      a.status !== 'COMPLETED' && a.status !== 'CANCELLED'
    ).length;
    
    const completedThisWeek = teamActions.filter(a => 
      a.status === 'COMPLETED' && 
      a.completedAt && 
      new Date(a.completedAt) >= weekStart && 
      new Date(a.completedAt) <= weekEnd
    ).length;
    
    const overdueActions = teamActions.filter(a => 
      a.status !== 'COMPLETED' && 
      a.status !== 'CANCELLED' && 
      a.dueDate && 
      new Date(a.dueDate) < now
    ).length;
    
    const blockerCount = teamActions.filter(a => 
      a.isBlocker && 
      a.status !== 'COMPLETED' && 
      a.status !== 'CANCELLED'
    ).length;
    
    // Average completion days
    const completedActions = teamActions.filter(a => a.status === 'COMPLETED' && a.completedAt);
    const avgCompletionDays = completedActions.length > 0
      ? completedActions.reduce((sum, a) => {
          return sum + differenceInDays(new Date(a.completedAt!), new Date(a.createdAt));
        }, 0) / completedActions.length
      : undefined;
    
    // Mood from 1:1s
    const allMoods = team.members.flatMap(m => 
      m.employee.oneOnOnes
        .filter(o => o.mood !== null)
        .map(o => o.mood!)
    );
    const avgMood = allMoods.length > 0
      ? allMoods.reduce((sum, m) => sum + m, 0) / allMoods.length
      : undefined;
    
    // 1:1s conducted this week
    const oneOnOnesConducted = team.members.reduce((count, m) => {
      return count + m.employee.oneOnOnes.filter(o => 
        new Date(o.date) >= weekStart && new Date(o.date) <= weekEnd
      ).length;
    }, 0);
    
    // Team meetings held
    const teamMeetingsHeld = teamEvents.length;
    
    // Calculate scores
    const createdThisWeek = teamActions.filter(a => 
      new Date(a.createdAt) >= weekStart && new Date(a.createdAt) <= weekEnd
    ).length;
    
    const velocityScore = createdThisWeek > 0 
      ? completedThisWeek / createdThisWeek 
      : completedThisWeek > 0 ? 1 : 0;
    
    // Health score: composite of mood, blockers, overdue
    let healthScore = 100;
    if (avgMood) healthScore -= (5 - avgMood) * 10; // Lower mood = lower score
    healthScore -= blockerCount * 10;
    healthScore -= overdueActions * 5;
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    // Engagement score based on 1:1 frequency
    const expectedOneOnOnes = team.members.length / 2; // Assuming bi-weekly 1:1s
    const engagementScore = expectedOneOnOnes > 0 
      ? Math.min(100, (oneOnOnesConducted / expectedOneOnOnes) * 100)
      : 100;
    
    const metrics = {
      teamId,
      teamName: team.name,
      date: now,
      openActions,
      completedThisWeek,
      overdueActions,
      blockerCount,
      avgCompletionDays: avgCompletionDays ? Math.round(avgCompletionDays * 10) / 10 : undefined,
      avgMood: avgMood ? Math.round(avgMood * 10) / 10 : undefined,
      oneOnOnesConducted,
      teamMeetingsHeld,
      velocityScore: Math.round(velocityScore * 100) / 100,
      healthScore: Math.round(healthScore),
      engagementScore: Math.round(engagementScore)
    };
    
    // Optionally save snapshot
    await prisma.teamMetricsSnapshot.create({
      data: {
        teamId,
        openActions,
        completedThisWeek,
        overdueActions,
        blockerCount,
        avgCompletionDays,
        avgMood,
        oneOnOnesConducted,
        teamMeetingsHeld,
        velocityScore,
        healthScore,
        engagementScore
      }
    });
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching team metrics:', error);
    res.status(500).json({ error: 'Failed to fetch team metrics' });
  }
});

/**
 * Get team metrics history
 * GET /statistics/teams/:teamId/history
 */
router.get('/teams/:teamId/history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { teamId } = req.params;
    const limit = parseInt(req.query.limit as string) || 12;
    
    // Verify team belongs to user
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId }
    });
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const history = await prisma.teamMetricsSnapshot.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching team metrics history:', error);
    res.status(500).json({ error: 'Failed to fetch metrics history' });
  }
});

/**
 * Get comparison across all teams
 * GET /statistics/teams/comparison
 */
router.get('/teams/comparison', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    const teams = await prisma.team.findMany({
      where: { userId },
      include: {
        metricsSnapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: {
            actions: true,
            members: true
          }
        }
      }
    });
    
    const comparison = teams.map(team => {
      const latestMetrics = team.metricsSnapshots[0];
      return {
        teamId: team.id,
        teamName: team.name,
        color: team.color,
        memberCount: team._count.members,
        totalActions: team._count.actions,
        healthScore: latestMetrics?.healthScore || null,
        velocityScore: latestMetrics?.velocityScore || null,
        engagementScore: latestMetrics?.engagementScore || null,
        blockerCount: latestMetrics?.blockerCount || 0,
        overdueActions: latestMetrics?.overdueActions || 0
      };
    });
    
    res.json(comparison);
  } catch (error) {
    console.error('Error fetching team comparison:', error);
    res.status(500).json({ error: 'Failed to fetch team comparison' });
  }
});

export default router;
