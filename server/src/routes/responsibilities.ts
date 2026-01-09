import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { startOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';

const router = Router();

router.use(authenticateToken);

// Get all responsibilities with areas
router.get('/', async (req: AuthRequest, res) => {
  try {
    const responsibilities = await prisma.responsibility.findMany({
      include: {
        areas: {
          orderBy: { category: 'asc' }
        },
        users: {
          where: { userId: req.userId }
        }
      }
    });

    res.json({
      success: true,
      data: responsibilities
    });
  } catch (error) {
    console.error('Get responsibilities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get responsibilities'
    });
  }
});

// Get user's active responsibilities with progress
router.get('/my', async (req: AuthRequest, res) => {
  try {
    const userResponsibilities = await prisma.userResponsibility.findMany({
      where: {
        userId: req.userId,
        isActive: true
      },
      include: {
        responsibility: {
          include: {
            areas: {
              include: {
                actions: {
                  where: { userId: req.userId }
                }
              }
            }
          }
        }
      }
    });

    // Calculate progress for each responsibility
    const withProgress = userResponsibilities.map(ur => {
      const areas = ur.responsibility.areas;
      const totalActions = areas.reduce((sum, area) => sum + area.actions.length, 0);
      const completedActions = areas.reduce(
        (sum, area) => sum + area.actions.filter(a => a.status === 'COMPLETED').length,
        0
      );
      
      return {
        ...ur,
        progress: totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0,
        totalActions,
        completedActions
      };
    });

    res.json({
      success: true,
      data: withProgress
    });
  } catch (error) {
    console.error('Get my responsibilities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get responsibilities'
    });
  }
});

// Assign responsibility to user
router.post('/assign', async (req: AuthRequest, res) => {
  try {
    const { responsibilityId } = req.body;

    const existing = await prisma.userResponsibility.findFirst({
      where: {
        userId: req.userId,
        responsibilityId
      }
    });

    if (existing) {
      // Reactivate if inactive
      const updated = await prisma.userResponsibility.update({
        where: { id: existing.id },
        data: { isActive: true },
        include: {
          responsibility: {
            include: { areas: true }
          }
        }
      });
      
      return res.json({
        success: true,
        data: updated
      });
    }

    const userResponsibility = await prisma.userResponsibility.create({
      data: {
        userId: req.userId!,
        responsibilityId
      },
      include: {
        responsibility: {
          include: { areas: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: userResponsibility
    });
  } catch (error) {
    console.error('Assign responsibility error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign responsibility'
    });
  }
});

// Deactivate responsibility
router.delete('/unassign/:responsibilityId', async (req: AuthRequest, res) => {
  try {
    const userResponsibility = await prisma.userResponsibility.findFirst({
      where: {
        userId: req.userId,
        responsibilityId: req.params.responsibilityId
      }
    });

    if (!userResponsibility) {
      return res.status(404).json({
        success: false,
        error: 'Responsibility assignment not found'
      });
    }

    await prisma.userResponsibility.update({
      where: { id: userResponsibility.id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Responsibility deactivated'
    });
  } catch (error) {
    console.error('Unassign responsibility error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unassign responsibility'
    });
  }
});

// Get responsibility areas with actions
router.get('/areas/:areaId', async (req: AuthRequest, res) => {
  try {
    const area = await prisma.responsibilityArea.findUnique({
      where: { id: req.params.areaId },
      include: {
        responsibility: true,
        actions: {
          where: { userId: req.userId },
          include: {
            employee: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!area) {
      return res.status(404).json({
        success: false,
        error: 'Responsibility area not found'
      });
    }

    res.json({
      success: true,
      data: area
    });
  } catch (error) {
    console.error('Get area error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get responsibility area'
    });
  }
});

// Get responsibility insights based on actual work
router.get('/insights', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const threeMonthsAgo = subMonths(new Date(), 3);
    
    // Get all actions with their relationships
    const actions = await prisma.action.findMany({
      where: {
        userId,
        createdAt: { gte: threeMonthsAgo }
      },
      include: {
        workArea: true,
        team: true,
        employee: true,
        responsibilityArea: true
      }
    });
    
    // Get all events with relationships
    const events = await prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: threeMonthsAgo }
      },
      include: {
        workArea: true,
        team: true,
        participants: {
          include: { employee: true }
        },
        eventType: true
      }
    });
    
    // Get 1:1s
    const oneOnOnes = await prisma.oneOnOne.findMany({
      where: {
        event: {
          userId,
          startTime: { gte: threeMonthsAgo }
        }
      },
      include: {
        employee: true,
        event: true
      }
    });
    
    // Get teams and employees managed
    const teams = await prisma.team.findMany({
      where: { userId },
      include: {
        members: {
          include: { employee: true }
        }
      }
    });
    
    // Get work areas
    const workAreas = await prisma.workArea.findMany({
      where: { userId }
    });
    
    // Categorize insights
    interface InsightItem {
      id: string;
      title: string;
      description: string;
      category: string;
      evidence: Array<{
        type: 'action' | 'event' | 'oneOnOne';
        id: string;
        title: string;
        date: Date;
      }>;
      frequency: number;
      lastActivity: Date | null;
      mentalModelTips: string[];
    }
    
    const insights: Record<string, InsightItem[]> = {
      'People & Individual Care': [],
      'Team Development': [],
      'Delivery & Execution': [],
      'Strategy & Culture': []
    };
    
    // Analyze 1:1 patterns for People category
    if (oneOnOnes.length > 0) {
      const employeesMet = new Set(oneOnOnes.map(o => o.employeeId));
      insights['People & Individual Care'].push({
        id: 'one-on-ones',
        title: 'Regular 1:1 Meetings',
        description: `You've conducted ${oneOnOnes.length} 1:1 meetings with ${employeesMet.size} team members in the last 3 months.`,
        category: 'People & Individual Care',
        evidence: oneOnOnes.slice(0, 10).map(o => ({
          type: 'oneOnOne' as const,
          id: o.id,
          title: `1:1 with ${o.employee.name}`,
          date: o.date
        })),
        frequency: oneOnOnes.length,
        lastActivity: oneOnOnes[0]?.date || null,
        mentalModelTips: [
          'Ask open-ended questions about career aspirations',
          'Focus on listening 70% of the time',
          'Document follow-up items and track progress'
        ]
      });
    }
    
    // Analyze team events for Team Development
    const teamEvents = events.filter(e => e.teamId);
    const teamEventsByTeam = new Map<string, typeof teamEvents>();
    teamEvents.forEach(e => {
      if (!teamEventsByTeam.has(e.teamId!)) {
        teamEventsByTeam.set(e.teamId!, []);
      }
      teamEventsByTeam.get(e.teamId!)!.push(e);
    });
    
    teamEventsByTeam.forEach((evts, teamId) => {
      const team = teams.find(t => t.id === teamId);
      if (team && evts.length >= 2) {
        insights['Team Development'].push({
          id: `team-${teamId}`,
          title: `${team.name} Engagement`,
          description: `${evts.length} team meetings/activities with ${team.name}`,
          category: 'Team Development',
          evidence: evts.slice(0, 5).map(e => ({
            type: 'event' as const,
            id: e.id,
            title: e.title,
            date: e.startTime
          })),
          frequency: evts.length,
          lastActivity: evts[0]?.startTime || null,
          mentalModelTips: [
            'Regularly check team health and morale',
            'Create psychological safety for open discussions',
            'Celebrate wins, learn from failures together'
          ]
        });
      }
    });
    
    // Analyze work area focus for Delivery
    const actionsByWorkArea = new Map<string, typeof actions>();
    actions.forEach(a => {
      if (a.workAreaId) {
        if (!actionsByWorkArea.has(a.workAreaId)) {
          actionsByWorkArea.set(a.workAreaId, []);
        }
        actionsByWorkArea.get(a.workAreaId)!.push(a);
      }
    });
    
    actionsByWorkArea.forEach((acts, workAreaId) => {
      const workArea = workAreas.find(w => w.id === workAreaId);
      if (workArea && acts.length >= 3) {
        const completed = acts.filter(a => a.status === 'COMPLETED').length;
        insights['Delivery & Execution'].push({
          id: `workarea-${workAreaId}`,
          title: workArea.name,
          description: `${acts.length} actions in this area (${completed} completed)`,
          category: 'Delivery & Execution',
          evidence: acts.slice(0, 5).map(a => ({
            type: 'action' as const,
            id: a.id,
            title: a.title,
            date: a.createdAt
          })),
          frequency: acts.length,
          lastActivity: acts[0]?.createdAt || null,
          mentalModelTips: [
            'Prioritize ruthlessly - not everything is urgent',
            'Delegate to develop others',
            'Track blockers and remove them proactively'
          ]
        });
      }
    });
    
    // Analyze decisions for Strategy
    const decisions = actions.filter(a => a.type === 'DECISION');
    if (decisions.length > 0) {
      insights['Strategy & Culture'].push({
        id: 'decisions',
        title: 'Decision Making',
        description: `You've made ${decisions.length} documented decisions`,
        category: 'Strategy & Culture',
        evidence: decisions.slice(0, 5).map(d => ({
          type: 'action' as const,
          id: d.id,
          title: d.title,
          date: d.createdAt
        })),
        frequency: decisions.length,
        lastActivity: decisions[0]?.createdAt || null,
        mentalModelTips: [
          'Document the "why" behind decisions',
          'Involve stakeholders early for buy-in',
          'Revisit decisions when context changes'
        ]
      });
    }
    
    // Add cross-team coordination if multiple teams
    if (teams.length > 1) {
      insights['Strategy & Culture'].push({
        id: 'cross-team',
        title: 'Cross-Team Coordination',
        description: `Managing ${teams.length} teams with ${teams.reduce((sum, t) => sum + t.members.length, 0)} total members`,
        category: 'Strategy & Culture',
        evidence: [],
        frequency: teams.length,
        lastActivity: null,
        mentalModelTips: [
          'Align teams on shared goals and priorities',
          'Create channels for inter-team communication',
          'Balance autonomy with coordination'
        ]
      });
    }
    
    // Summary stats
    const summary = {
      totalActions: actions.length,
      totalEvents: events.length,
      totalOneOnOnes: oneOnOnes.length,
      teamsManaged: teams.length,
      employeesManaged: teams.reduce((sum, t) => sum + t.members.length, 0),
      workAreasActive: workAreas.length
    };
    
    res.json({
      success: true,
      data: {
        insights,
        summary,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Get responsibility insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get responsibility insights'
    });
  }
});

export default router;

