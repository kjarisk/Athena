import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { AIService } from '../services/ai/index.js';

const router = Router();

router.use(authenticateToken);

// Get available Ollama models
router.get('/ollama/models', async (req: AuthRequest, res) => {
  try {
    const models = await AIService.listOllamaModels();
    
    res.json({
      success: true,
      data: {
        models: models.map(m => ({
          name: m.name,
          size: m.size,
          modified: m.modified_at
        }))
      }
    });
  } catch (error: any) {
    console.error('Error fetching Ollama models:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Ollama models'
    });
  }
});

// Test Ollama connection
router.get('/ollama/status', async (req: AuthRequest, res) => {
  try {
    const models = await AIService.listOllamaModels();
    res.json({
      success: true,
      data: {
        connected: true,
        modelCount: models.length
      }
    });
  } catch (error: any) {
    res.json({
      success: false,
      data: {
        connected: false,
        error: error.message
      }
    });
  }
});

// Helper to get user's AI context
async function getUserAIContext(userId: string): Promise<string | undefined> {
  const aiContext = await prisma.aIContextRule.findUnique({
    where: { userId }
  });
  return aiContext?.isActive ? aiContext.content : undefined;
}

// Extract actions from notes
router.post('/extract-actions', async (req: AuthRequest, res) => {
  try {
    const { notes, context } = req.body;

    if (!notes) {
      return res.status(400).json({
        success: false,
        error: 'Notes are required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { settings: true }
    });

    const settings = user?.settings as any;
    const aiService = new AIService(settings?.aiProvider || 'openai', settings?.ollamaModel || 'mistral:latest');
    const userContext = await getUserAIContext(req.userId!);

    const result = await aiService.extractActions(notes, context, userContext);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Extract actions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extract actions'
    });
  }
});

// Get daily briefing
router.get('/daily-briefing', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, settings: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get overdue actions
    const overdueActions = await prisma.action.findMany({
      where: {
        userId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: new Date() }
      },
      include: {
        employee: { select: { name: true } }
      },
      take: 10
    });

    // Get today's events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents = await prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: today, lt: tomorrow }
      },
      include: { eventType: true },
      orderBy: { startTime: 'asc' }
    });

    // Get due cadence items
    const cadenceRules = await prisma.cadenceRule.findMany({
      where: { userId, isActive: true },
      include: {
        employee: { 
          select: { 
            id: true, 
            name: true,
            oneOnOnes: {
              orderBy: { date: 'desc' },
              take: 1,
              select: { date: true }
            }
          } 
        },
        team: { select: { id: true, name: true } },
        workArea: { select: { id: true, name: true } }
      }
    });

    const now = new Date();
    const dueItems: any[] = [];

    for (const rule of cadenceRules) {
      let lastCompleted: Date | null = null;
      let targetName = '';

      if (rule.targetType === 'EMPLOYEE' && rule.employee) {
        targetName = rule.employee.name;
        if (rule.type === 'ONE_ON_ONE' && rule.employee.oneOnOnes?.[0]) {
          lastCompleted = rule.employee.oneOnOnes[0].date;
        }
      } else if (rule.targetType === 'TEAM' && rule.team) {
        targetName = rule.team.name;
      } else if (rule.targetType === 'WORK_AREA' && rule.workArea) {
        targetName = rule.workArea.name;
      } else if (rule.targetType === 'GLOBAL') {
        targetName = 'All';
      }

      let daysSinceLast = rule.frequencyDays + 1;
      if (lastCompleted) {
        daysSinceLast = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));
      }

      const isDue = daysSinceLast >= rule.frequencyDays;
      const daysOverdue = daysSinceLast - rule.frequencyDays;

      if (isDue) {
        dueItems.push({
          rule,
          targetName,
          daysSinceLast,
          daysOverdue: Math.max(0, daysOverdue),
          lastCompleted
        });
      }
    }

    // Get action stats
    const actionStats = {
      pending: await prisma.action.count({
        where: { userId, status: 'PENDING' }
      }),
      inProgress: await prisma.action.count({
        where: { userId, status: 'IN_PROGRESS' }
      }),
      completedThisWeek: await prisma.action.count({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    };

    const settings = user.settings as any;
    const aiService = new AIService(settings?.aiProvider || 'openai', settings?.ollamaModel || 'mistral:latest');
    const userContext = await getUserAIContext(userId);

    const briefing = await aiService.generateDailyBriefing({
      userName: user.name,
      overdueActions,
      todayEvents,
      dueItems,
      recentActivity: [],
      actionStats
    }, userContext);

    res.json({
      success: true,
      data: {
        briefing,
        stats: {
          overdueCount: overdueActions.length,
          todayEventsCount: todayEvents.length,
          dueItemsCount: dueItems.length,
          ...actionStats
        },
        dueItems: dueItems.slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Daily briefing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate daily briefing'
    });
  }
});

// Get focus suggestions
router.get('/suggestions/focus', async (req: AuthRequest, res) => {
  try {
    // Get overdue actions
    const overdueActions = await prisma.action.findMany({
      where: {
        userId: req.userId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: new Date() }
      },
      include: {
        employee: { select: { name: true } }
      },
      take: 5
    });

    // Get upcoming 1:1s
    const upcomingEvents = await prisma.event.findMany({
      where: {
        userId: req.userId,
        startTime: {
          gte: new Date(),
          lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
        }
      },
      include: {
        eventType: true,
        participants: {
          include: {
            employee: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { startTime: 'asc' },
      take: 5
    });

    // Get high priority pending actions
    const urgentActions = await prisma.action.findMany({
      where: {
        userId: req.userId,
        status: 'PENDING',
        priority: { in: ['HIGH', 'URGENT'] }
      },
      include: {
        employee: { select: { name: true } }
      },
      take: 5
    });

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { settings: true }
    });

    const settings = user?.settings as any;
    const aiService = new AIService(settings?.aiProvider || 'openai', settings?.ollamaModel || 'mistral:latest');
    const userContext = await getUserAIContext(req.userId!);

    const suggestions = await aiService.generateFocusSuggestions({
      overdueActions,
      upcomingEvents,
      urgentActions
    }, userContext);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Get focus suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get focus suggestions'
    });
  }
});

// Generate message draft
router.post('/generate-message', async (req: AuthRequest, res) => {
  try {
    const { type, context, tone } = req.body;

    if (!type || !context) {
      return res.status(400).json({
        success: false,
        error: 'Type and context are required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { settings: true }
    });

    const settings = user?.settings as any;
    const aiService = new AIService(settings?.aiProvider || 'openai', settings?.ollamaModel || 'mistral:latest');
    const userContext = await getUserAIContext(req.userId!);

    const message = await aiService.generateMessage(type, context, tone, userContext);

    res.json({
      success: true,
      data: { message }
    });
  } catch (error) {
    console.error('Generate message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate message'
    });
  }
});

// Prepare for meeting
router.get('/meeting-prep/:eventId', async (req: AuthRequest, res) => {
  try {
    const event = await prisma.event.findFirst({
      where: {
        id: req.params.eventId,
        userId: req.userId
      },
      include: {
        eventType: true,
        participants: {
          include: {
            employee: {
              include: {
                oneOnOnes: {
                  orderBy: { date: 'desc' },
                  take: 3
                },
                actions: {
                  where: {
                    status: { notIn: ['COMPLETED', 'CANCELLED'] }
                  },
                  take: 5
                },
                notes: {
                  orderBy: { createdAt: 'desc' },
                  take: 3
                }
              }
            }
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { settings: true }
    });

    const settings = user?.settings as any;
    const aiService = new AIService(settings?.aiProvider || 'openai', settings?.ollamaModel || 'mistral:latest');
    const userContext = await getUserAIContext(req.userId!);

    const prep = await aiService.prepareMeeting(event, userContext);

    res.json({
      success: true,
      data: prep
    });
  } catch (error) {
    console.error('Meeting prep error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to prepare meeting'
    });
  }
});

// Summarize notes
router.post('/summarize', async (req: AuthRequest, res) => {
  try {
    const { text, format } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { settings: true }
    });

    const settings = user?.settings as any;
    const aiService = new AIService(settings?.aiProvider || 'openai', settings?.ollamaModel || 'mistral:latest');

    const summary = await aiService.summarize(text, format);

    res.json({
      success: true,
      data: { summary }
    });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to summarize'
    });
  }
});

// Analyze 1:1 meeting notes
router.post('/analyze-one-on-one', async (req: AuthRequest, res) => {
  try {
    const { notes, employeeId } = req.body;

    if (!notes) {
      return res.status(400).json({
        success: false,
        error: 'Notes are required'
      });
    }

    // Get employee context if provided
    let employeeContext = undefined;
    if (employeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: employeeId,
          userId: req.userId
        },
        include: {
          oneOnOnes: {
            orderBy: { date: 'desc' },
            take: 5,
            select: { topics: true }
          }
        }
      });

      if (employee) {
        employeeContext = {
          name: employee.name,
          role: employee.role,
          recentTopics: employee.oneOnOnes.flatMap(o => o.topics).slice(0, 10),
          strengths: employee.strengths,
          growthAreas: employee.growthAreas
        };
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { settings: true }
    });

    const settings = user?.settings as any;
    const aiService = new AIService(settings?.aiProvider || 'openai', settings?.ollamaModel || 'mistral:latest');

    const analysis = await aiService.analyzeOneOnOne(notes, employeeContext);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Analyze 1:1 error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze 1:1 notes'
    });
  }
});

// Analyze competencies for an employee
router.post('/analyze-competencies', async (req: AuthRequest, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    // Get comprehensive employee data
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        userId: req.userId
      },
      include: {
        oneOnOnes: {
          orderBy: { date: 'desc' },
          take: 10,
          select: {
            notes: true,
            mood: true,
            topics: true
          }
        },
        competencies: true
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { settings: true }
    });

    const settings = user?.settings as any;
    const aiService = new AIService(settings?.aiProvider || 'openai', settings?.ollamaModel || 'mistral:latest');
    const userContext = await getUserAIContext(req.userId!);

    const analysis = await aiService.analyzeCompetencies({
      name: employee.name,
      role: employee.role,
      strengths: employee.strengths,
      growthAreas: employee.growthAreas,
      recentOneOnOnes: employee.oneOnOnes?.map(o => ({
        notes: o.notes || '',
        mood: o.mood || 0,
        topics: o.topics
      })) || [],
      currentCompetencies: employee.competencies?.map(c => ({
        name: c.name,
        rating: c.rating,
        category: c.category
      })) || []
    }, userContext);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Analyze competencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze competencies'
    });
  }
});

// Generate development plan for an employee
router.post('/generate-development-plan', async (req: AuthRequest, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    // Get comprehensive employee data
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        userId: req.userId
      },
      include: {
        oneOnOnes: {
          orderBy: { date: 'desc' },
          take: 5,
          select: {
            notes: true,
            mood: true,
            topics: true,
            followUps: true
          }
        },
        competencies: true,
        actions: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] }
          },
          take: 10,
          select: {
            title: true,
            status: true,
            priority: true
          }
        }
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Calculate tenure in months
    const startDate = new Date(employee.startDate);
    const now = new Date();
    const tenure = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { settings: true }
    });

    const settings = user?.settings as any;
    const aiService = new AIService(settings?.aiProvider || 'openai', settings?.ollamaModel || 'mistral:latest');
    const userContext = await getUserAIContext(req.userId!);

    const plan = await aiService.generateDevelopmentPlan({
      name: employee.name,
      role: employee.role,
      strengths: employee.strengths,
      growthAreas: employee.growthAreas,
      competencies: employee.competencies?.map(c => ({
        name: c.name,
        rating: c.rating,
        category: c.category
      })) || [],
      recentOneOnOnes: employee.oneOnOnes?.map(o => ({
        notes: o.notes || '',
        topics: o.topics,
        followUps: o.followUps
      })) || [],
      openActions: employee.actions?.map(a => ({
        title: a.title,
        status: a.status,
        priority: a.priority
      })) || [],
      tenure
    }, userContext);

    // Save the development plan to the database
    const savedPlan = await prisma.developmentPlan.upsert({
      where: {
        id: (await prisma.developmentPlan.findFirst({
          where: { employeeId, status: 'ACTIVE' },
          select: { id: true }
        }))?.id || 'new'
      },
      update: {
        goals: plan.goals,
        summary: plan.summary,
        focusAreas: [...plan.quickWins, ...plan.goals.map((g: any) => g.title)].slice(0, 5),
        generatedAt: new Date()
      },
      create: {
        employeeId,
        goals: plan.goals,
        summary: plan.summary,
        focusAreas: [...plan.quickWins, ...plan.goals.map((g: any) => g.title)].slice(0, 5),
        status: 'ACTIVE'
      }
    });

    res.json({
      success: true,
      data: {
        ...plan,
        id: savedPlan.id,
        savedAt: savedPlan.generatedAt
      }
    });
  } catch (error) {
    console.error('Generate development plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate development plan'
    });
  }
});

// Get development plan for an employee
router.get('/development-plan/:employeeId', async (req: AuthRequest, res) => {
  try {
    const { employeeId } = req.params;

    // Verify employee belongs to user
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        userId: req.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    const plan = await prisma.developmentPlan.findFirst({
      where: {
        employeeId,
        status: 'ACTIVE'
      },
      orderBy: { generatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Get development plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get development plan'
    });
  }
});

// Analyze time management
router.post('/time-insights', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Get user settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        settings: true,
        aiContextRules: {
          select: { content: true }
        }
      }
    });

    const settings = user?.settings as any || {};
    const aiProvider = settings.aiProvider || 'openai';
    const ollamaModel = settings.ollamaModel || 'mistral:latest';
    const userContext = user?.aiContextRules?.[0]?.content || '';

    // Get upcoming events (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const events = await prisma.event.findMany({
      where: {
        userId,
        startTime: { gte: now, lte: nextWeek }
      },
      include: {
        workArea: { select: { name: true } }
      },
      orderBy: { startTime: 'asc' }
    });

    // Get open actions
    const actions = await prisma.action.findMany({
      where: {
        userId,
        status: { not: 'COMPLETED' }
      },
      include: {
        workArea: { select: { name: true } }
      },
      orderBy: { dueDate: 'asc' }
    });

    // Get work areas
    const workAreas = await prisma.workArea.findMany({
      where: { userId, isHidden: false },
      select: { name: true, description: true }
    });

    // Transform data for AI
    const eventData = events.map(e => ({
      title: e.title,
      startTime: e.startTime,
      endTime: e.endTime,
      workAreaId: e.workAreaId,
      workAreaName: e.workArea?.name
    }));

    const actionData = actions.map(a => ({
      title: a.title,
      priority: a.priority,
      dueDate: a.dueDate,
      status: a.status,
      workAreaName: a.workArea?.name || undefined
    }));

    // Call AI service
    const aiService = new AIService(aiProvider as any, ollamaModel);
    const analysis = await aiService.analyzeTimeManagement(
      {
        events: eventData,
        actions: actionData,
        workAreas: workAreas.map(w => ({
          name: w.name,
          description: w.description || undefined
        }))
      },
      userContext
    );

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Time insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate time insights'
    });
  }
});

export default router;

