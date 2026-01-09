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

    // For each team, also fetch auto-included employees
    const teamsWithAutoMembers = await Promise.all(teams.map(async (team) => {
      const explicitEmployeeIds = team.members
        .filter(m => m.employeeId)
        .map(m => m.employeeId);

      const autoEmployees = await prisma.employee.findMany({
        where: {
          userId: req.userId,
          team: { equals: team.name, mode: 'insensitive' },
          id: { notIn: explicitEmployeeIds as string[] }
        },
        select: {
          id: true,
          name: true,
          role: true,
          avatarUrl: true,
          status: true
        }
      });

      // Convert auto-included employees to member format
      const autoMembers = autoEmployees.map(emp => ({
        id: `auto-${emp.id}`,
        teamId: team.id,
        employeeId: emp.id,
        employee: emp,
        role: mapEmployeeRoleToTeamRole(emp.role),
        secondaryRole: null,
        isExternal: false,
        isAutoIncluded: true,
        name: null,
        email: null
      }));

      return {
        ...team,
        members: [...team.members, ...autoMembers]
      };
    }));

    res.json({
      success: true,
      data: teamsWithAutoMembers
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

    // Fetch employees who have this team name in their "team" field
    // but are NOT already in the explicit members list
    const explicitEmployeeIds = team.members
      .filter(m => m.employeeId)
      .map(m => m.employeeId);

    const autoEmployees = await prisma.employee.findMany({
      where: {
        userId: req.userId,
        team: { equals: team.name, mode: 'insensitive' },
        id: { notIn: explicitEmployeeIds as string[] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        status: true,
        startDate: true
      }
    });

    // Convert auto-included employees to member format
    const autoMembers = autoEmployees.map(emp => ({
      id: `auto-${emp.id}`, // Prefixed ID to distinguish from explicit members
      teamId: team.id,
      employeeId: emp.id,
      employee: emp,
      role: mapEmployeeRoleToTeamRole(emp.role),
      secondaryRole: null,
      isExternal: false,
      isAutoIncluded: true, // Flag to indicate this came from employee.team field
      name: null,
      email: null,
      createdAt: new Date()
    }));

    // Merge explicit members with auto-included ones
    const allMembers = [
      ...team.members.map(m => ({ ...m, isAutoIncluded: false })),
      ...autoMembers
    ];

    res.json({
      success: true,
      data: {
        ...team,
        members: allMembers
      }
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team'
    });
  }
});

// Helper function to map employee role string to TeamRole enum
function mapEmployeeRoleToTeamRole(role: string): string {
  const lowerRole = role.toLowerCase();
  
  // Check for keywords in any position (handles "Senior Frontend Developer", "Mid-level Backend", etc.)
  if (lowerRole.includes('frontend') || lowerRole.includes('front-end') || lowerRole.includes('front end')) {
    return 'FRONTEND';
  }
  if (lowerRole.includes('backend') || lowerRole.includes('back-end') || lowerRole.includes('back end')) {
    return 'BACKEND';
  }
  if (lowerRole.includes('fullstack') || lowerRole.includes('full-stack') || lowerRole.includes('full stack')) {
    return 'FULLSTACK';
  }
  if (lowerRole.includes('designer') || lowerRole.includes('ux') || lowerRole.includes('ui')) {
    return 'DESIGNER';
  }
  if (lowerRole.includes('qa') || lowerRole.includes('quality') || lowerRole.includes('test')) {
    return 'QA';
  }
  if (lowerRole.includes('team lead') || lowerRole.includes('tech lead') || lowerRole.includes('lead developer')) {
    return 'TEAM_LEAD';
  }
  if (lowerRole.includes('devops') || lowerRole.includes('sre') || lowerRole.includes('platform') || lowerRole.includes('infrastructure')) {
    return 'DEVOPS';
  }
  if (lowerRole.includes('project leader') || lowerRole.includes('project manager')) {
    return 'PROJECT_LEADER';
  }
  if (lowerRole.includes('product owner') || lowerRole.includes('product manager')) {
    return 'PRODUCT_OWNER';
  }
  
  return 'OTHER';
}

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

// Add member to team (supports both employees and external stakeholders)
router.post('/:id/members', async (req: AuthRequest, res) => {
  try {
    const { employeeId, role, secondaryRole, isExternal, name, email } = req.body;

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

    // For external stakeholders
    if (isExternal) {
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required for external stakeholders'
        });
      }

      const member = await prisma.teamMember.create({
        data: {
          teamId: req.params.id,
          isExternal: true,
          name,
          email,
          role: role || 'PROJECT_LEADER',
          secondaryRole
        }
      });

      res.status(201).json({
        success: true,
        data: { ...member, employee: null }
      });
      return;
    }

    // For internal employees
    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required for internal members'
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
        role: role || 'OTHER',
        secondaryRole,
        isExternal: false
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
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
    const { role, secondaryRole, name, email, employeeId } = req.body;

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

    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (secondaryRole !== undefined) updateData.secondaryRole = secondaryRole;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    let member;

    // Check if this is an auto-included member (ID starts with 'auto-')
    if (req.params.memberId.startsWith('auto-')) {
      const actualEmployeeId = employeeId || req.params.memberId.replace('auto-', '');
      
      // Create a new TeamMember record for this auto-included employee
      member = await prisma.teamMember.create({
        data: {
          teamId: team.id,
          employeeId: actualEmployeeId,
          role: role || 'OTHER',
          secondaryRole: secondaryRole || null
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true
            }
          }
        }
      });
    } else {
      // Regular update for existing TeamMember records
      member = await prisma.teamMember.update({
        where: { id: req.params.memberId },
        data: updateData,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true
            }
          }
        }
      });
    }

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

// ============================================
// Team Notes
// ============================================

// Get notes for a team
router.get('/:id/notes', async (req: AuthRequest, res) => {
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

    const notes = await prisma.teamNote.findMany({
      where: { teamId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Get team notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get team notes'
    });
  }
});

// Add note to team
router.post('/:id/notes', async (req: AuthRequest, res) => {
  try {
    const { content, type, draftActions } = req.body;

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

    const note = await prisma.teamNote.create({
      data: {
        teamId: team.id,
        content,
        type: type || 'GENERAL',
        draftActions: draftActions || null
      }
    });

    res.status(201).json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error('Add team note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add team note'
    });
  }
});

// Update team note
router.patch('/:id/notes/:noteId', async (req: AuthRequest, res) => {
  try {
    const { content, type, draftActions } = req.body;

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

    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (draftActions !== undefined) updateData.draftActions = draftActions;

    const note = await prisma.teamNote.update({
      where: { id: req.params.noteId },
      data: updateData
    });

    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error('Update team note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update team note'
    });
  }
});

// Delete team note
router.delete('/:id/notes/:noteId', async (req: AuthRequest, res) => {
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

    await prisma.teamNote.delete({
      where: { id: req.params.noteId }
    });

    res.json({
      success: true,
      message: 'Note deleted'
    });
  } catch (error) {
    console.error('Delete team note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete team note'
    });
  }
});

export default router;

