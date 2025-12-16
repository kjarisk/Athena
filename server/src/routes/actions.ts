import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { addXp } from '../services/gamification/xp.js';

const router = Router();

router.use(authenticateToken);

// Get all actions
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { 
      status, 
      priority, 
      employeeId, 
      eventId, 
      responsibilityAreaId,
      workAreaId,
      teamId,
      parentId,
      includeSubtasks,
      overdue,
      search,
      limit = '100' 
    } = req.query;
    
    const where: any = { userId: req.userId };
    
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (employeeId) {
      where.employeeId = employeeId;
    }
    
    if (eventId) {
      where.eventId = eventId;
    }
    
    if (responsibilityAreaId) {
      where.responsibilityAreaId = responsibilityAreaId;
    }
    
    if (workAreaId) {
      where.workAreaId = workAreaId;
    }
    
    if (teamId) {
      where.teamId = teamId;
    }
    
    // Filter by parentId or only get top-level actions
    if (parentId) {
      where.parentId = parentId;
    } else if (includeSubtasks !== 'true') {
      // By default, only get top-level actions (no parent)
      where.parentId = null;
    }
    
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const actions = await prisma.action.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        delegatedTo: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            eventType: true
          }
        },
        responsibilityArea: {
          select: {
            id: true,
            name: true,
            category: true,
            responsibility: {
              select: {
                roleType: true
              }
            }
          }
        },
        workArea: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        subtasks: {
          include: {
            employee: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true,
        links: true
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: actions
    });
  } catch (error) {
    console.error('Get actions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get actions'
    });
  }
});

// Get action statistics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [
      total,
      pending,
      inProgress,
      completed,
      overdue,
      completedThisWeek
    ] = await Promise.all([
      prisma.action.count({ where: { userId: req.userId } }),
      prisma.action.count({ where: { userId: req.userId, status: 'PENDING' } }),
      prisma.action.count({ where: { userId: req.userId, status: 'IN_PROGRESS' } }),
      prisma.action.count({ where: { userId: req.userId, status: 'COMPLETED' } }),
      prisma.action.count({
        where: {
          userId: req.userId,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          dueDate: { lt: new Date() }
        }
      }),
      prisma.action.count({
        where: {
          userId: req.userId,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        total,
        pending,
        inProgress,
        completed,
        overdue,
        completedThisWeek
      }
    });
  } catch (error) {
    console.error('Get action stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get action statistics'
    });
  }
});

// Get single action
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const action = await prisma.action.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        employee: true,
        delegatedTo: true,
        event: {
          include: {
            eventType: true
          }
        },
        responsibilityArea: {
          include: {
            responsibility: true
          }
        },
        workArea: true,
        team: true,
        parent: {
          select: { id: true, title: true }
        },
        subtasks: {
          include: {
            employee: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true,
        links: true
      }
    });

    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Action not found'
      });
    }

    res.json({
      success: true,
      data: action
    });
  } catch (error) {
    console.error('Get action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get action'
    });
  }
});

// Create action
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      dueTime,
      xpValue,
      source,
      eventId,
      employeeId,
      delegatedToId,
      responsibilityAreaId,
      workAreaId,
      teamId,
      parentId,
      links
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    const action = await prisma.action.create({
      data: {
        userId: req.userId!,
        title,
        description,
        status: status || 'PENDING',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        dueTime: dueTime || undefined,
        xpValue: xpValue || 10,
        source: source || 'MANUAL',
        eventId,
        employeeId,
        delegatedToId,
        responsibilityAreaId,
        workAreaId,
        teamId,
        parentId,
        links: links?.length ? {
          create: links.map((link: any) => ({
            url: link.url,
            title: link.title,
            description: link.description
          }))
        } : undefined
      },
      include: {
        employee: true,
        delegatedTo: true,
        event: true,
        workArea: true,
        team: true,
        subtasks: true,
        attachments: true,
        links: true
      }
    });

    res.status(201).json({
      success: true,
      data: action
    });
  } catch (error) {
    console.error('Create action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create action'
    });
  }
});

// Get focus suggestions (smart prioritization)
router.get('/focus/suggestions', async (req: AuthRequest, res) => {
  try {
    const suggestions: any[] = [];
    
    // Check for areas with no recent actions
    const workAreas = await prisma.workArea.findMany({
      where: { userId: req.userId },
      include: {
        actions: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          select: { id: true }
        }
      }
    });
    
    workAreas.forEach(area => {
      if (area.actions.length === 0) {
        suggestions.push({
          type: 'neglected_area',
          title: `Check on ${area.name}`,
          description: 'No actions created in this area for a week'
        });
      }
    });

    // Check for employees without recent 1:1s
    const employees = await prisma.employee.findMany({
      where: { 
        userId: req.userId,
        status: 'ACTIVE'
      },
      include: {
        oneOnOnes: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    employees.forEach(emp => {
      const lastOneOnOne = emp.oneOnOnes[0];
      if (!lastOneOnOne || new Date(lastOneOnOne.date) < twoWeeksAgo) {
        suggestions.push({
          type: 'schedule_1on1',
          title: `Schedule 1:1 with ${emp.name}`,
          description: lastOneOnOne 
            ? 'Last 1:1 was over two weeks ago' 
            : 'No 1:1 recorded yet'
        });
      }
    });

    res.json({
      success: true,
      data: suggestions.slice(0, 5)
    });
  } catch (error) {
    console.error('Get focus suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get focus suggestions'
    });
  }
});

// Update action
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const action = await prisma.action.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Action not found'
      });
    }

    const { links, ...data } = req.body;

    // Handle status change to completed
    if (data.status === 'COMPLETED' && action.status !== 'COMPLETED') {
      data.completedAt = new Date();
      // Award XP
      await addXp(req.userId!, action.xpValue, 'action_completed');
    }

    // Handle date conversion
    if (data.dueDate) data.dueDate = new Date(data.dueDate);

    const updated = await prisma.action.update({
      where: { id: req.params.id },
      data,
      include: {
        employee: true,
        delegatedTo: true,
        event: true,
        attachments: true,
        links: true
      }
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Update action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update action'
    });
  }
});

// Delete action
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const action = await prisma.action.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Action not found'
      });
    }

    await prisma.action.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Action deleted'
    });
  } catch (error) {
    console.error('Delete action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete action'
    });
  }
});

// Add link to action
router.post('/:id/links', async (req: AuthRequest, res) => {
  try {
    const { url, title, description } = req.body;

    const action = await prisma.action.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!action) {
      return res.status(404).json({
        success: false,
        error: 'Action not found'
      });
    }

    const link = await prisma.actionLink.create({
      data: {
        actionId: req.params.id,
        url,
        title,
        description
      }
    });

    res.status(201).json({
      success: true,
      data: link
    });
  } catch (error) {
    console.error('Add link error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add link'
    });
  }
});

// Create grouped actions (parent with subtasks)
router.post('/grouped', async (req: AuthRequest, res) => {
  try {
    const { parentAction, subtasks } = req.body;

    if (!parentAction?.title || !subtasks?.length) {
      return res.status(400).json({
        success: false,
        error: 'Parent action title and subtasks are required'
      });
    }

    // Create parent action first
    const parent = await prisma.action.create({
      data: {
        userId: req.userId!,
        title: parentAction.title,
        description: parentAction.description,
        status: parentAction.status || 'PENDING',
        priority: parentAction.priority || 'MEDIUM',
        dueDate: parentAction.dueDate ? new Date(parentAction.dueDate) : undefined,
        source: parentAction.source || 'ONE_ON_ONE',
        employeeId: parentAction.employeeId,
        workAreaId: parentAction.workAreaId,
        teamId: parentAction.teamId
      }
    });

    // Create subtasks linked to parent
    const createdSubtasks = await Promise.all(
      subtasks.map((subtask: any) =>
        prisma.action.create({
          data: {
            userId: req.userId!,
            parentId: parent.id,
            title: subtask.title,
            description: subtask.description,
            status: subtask.status || 'PENDING',
            priority: subtask.priority || 'MEDIUM',
            dueDate: subtask.dueDate ? new Date(subtask.dueDate) : undefined,
            source: subtask.source || 'ONE_ON_ONE',
            employeeId: subtask.employeeId ?? parentAction.employeeId,
            workAreaId: subtask.workAreaId ?? parentAction.workAreaId,
            teamId: subtask.teamId ?? parentAction.teamId
          }
        })
      )
    );

    // Fetch the complete parent with subtasks
    const result = await prisma.action.findUnique({
      where: { id: parent.id },
      include: {
        employee: true,
        workArea: true,
        team: true,
        subtasks: {
          include: {
            employee: { select: { id: true, name: true } }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Create grouped actions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create grouped actions'
    });
  }
});

// Bulk update action status
router.post('/bulk-status', async (req: AuthRequest, res) => {
  try {
    const { actionIds, status } = req.body;

    if (!actionIds?.length || !status) {
      return res.status(400).json({
        success: false,
        error: 'Action IDs and status are required'
      });
    }

    const data: any = { status };
    if (status === 'COMPLETED') {
      data.completedAt = new Date();
    }

    await prisma.action.updateMany({
      where: {
        id: { in: actionIds },
        userId: req.userId
      },
      data
    });

    // Award XP for completed actions
    if (status === 'COMPLETED') {
      const actions = await prisma.action.findMany({
        where: {
          id: { in: actionIds },
          userId: req.userId
        }
      });
      
      const totalXp = actions.reduce((sum, a) => sum + a.xpValue, 0);
      await addXp(req.userId!, totalXp, 'bulk_action_completed');
    }

    res.json({
      success: true,
      message: `Updated ${actionIds.length} actions`
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update actions'
    });
  }
});

export default router;

