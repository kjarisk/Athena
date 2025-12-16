import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Get all teams with member counts
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { workAreaId } = req.query;
    
    const where: any = { userId: req.userId };
    if (workAreaId) {
      where.workAreaId = workAreaId;
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        workArea: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        members: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                role: true,
                avatarUrl: true,
                status: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            actions: true,
            events: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: teams
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get teams'
    });
  }
});

// Get single team with details
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const team = await prisma.team.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        workArea: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        members: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                status: true,
                startDate: true
              }
            }
          },
          orderBy: {
            role: 'asc'
          }
        },
        actions: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] }
          },
          include: {
            employee: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        events: {
          include: {
            eventType: true
          },
          orderBy: { startTime: 'desc' },
          take: 10
        },
        _count: {
          select: {
            members: true,
            actions: true,
            events: true
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team'
    });
  }
});

// Create team
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, description, color, workAreaId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const team = await prisma.team.create({
      data: {
        userId: req.userId!,
        name,
        description,
        color: color || '#7BA087',
        workAreaId
      },
      include: {
        workArea: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        members: true,
        _count: {
          select: {
            members: true,
            actions: true,
            events: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create team'
    });
  }
});

// Update team
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const team = await prisma.team.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    const { name, description, color, workAreaId } = req.body;

    const updated = await prisma.team.update({
      where: { id: req.params.id },
      data: {
        name,
        description,
        color,
        workAreaId
      },
      include: {
        workArea: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        members: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                role: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            actions: true,
            events: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update team'
    });
  }
});

// Delete team
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const team = await prisma.team.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Remove team relations from actions and events
    await prisma.$transaction([
      prisma.action.updateMany({
        where: { teamId: req.params.id },
        data: { teamId: null }
      }),
      prisma.event.updateMany({
        where: { teamId: req.params.id },
        data: { teamId: null }
      }),
      prisma.teamMember.deleteMany({
        where: { teamId: req.params.id }
      }),
      prisma.team.delete({
        where: { id: req.params.id }
      })
    ]);

    res.json({
      success: true,
      message: 'Team deleted'
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete team'
    });
  }
});

// Add member to team
router.post('/:id/members', async (req: AuthRequest, res) => {
  try {
    const { employeeId, role } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required'
      });
    }

    // Verify team belongs to user
    const team = await prisma.team.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

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

    // Check if already a member
    const existing = await prisma.teamMember.findUnique({
      where: {
        teamId_employeeId: {
          teamId: req.params.id,
          employeeId
        }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Employee is already a member of this team'
      });
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId: req.params.id,
        employeeId,
        role: role || 'OTHER'
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
            status: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add team member'
    });
  }
});

// Update member role
router.patch('/:id/members/:memberId', async (req: AuthRequest, res) => {
  try {
    const { role } = req.body;

    // Verify team belongs to user
    const team = await prisma.team.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    const member = await prisma.teamMember.update({
      where: { id: req.params.memberId },
      data: { role },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update team member'
    });
  }
});

// Remove member from team
router.delete('/:id/members/:memberId', async (req: AuthRequest, res) => {
  try {
    // Verify team belongs to user
    const team = await prisma.team.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    await prisma.teamMember.delete({
      where: { id: req.params.memberId }
    });

    res.json({
      success: true,
      message: 'Member removed from team'
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove team member'
    });
  }
});

export default router;

