import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get all employees
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, team, search, workAreaId } = req.query;
    
    const where: any = { userId: req.userId };
    
    if (status) {
      where.status = status;
    }
    
    if (team) {
      where.team = team;
    }
    
    if (workAreaId) {
      where.workAreaId = workAreaId;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { role: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        workArea: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        _count: {
          select: {
            actions: true,
            oneOnOnes: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get employees'
    });
  }
});

// Get single employee with full details
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        oneOnOnes: {
          orderBy: { date: 'desc' },
          take: 10
        },
        skills: {
          include: {
            skill: true
          }
        },
        eventParticipations: {
          include: {
            event: {
              include: {
                eventType: true
              }
            }
          },
          orderBy: {
            event: {
              startTime: 'desc'
            }
          },
          take: 10
        }
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get employee'
    });
  }
});

// Create employee
router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      name,
      email,
      role,
      team,
      startDate,
      birthday,
      status,
      avatarUrl,
      strengths,
      growthAreas,
      developmentPlan,
      workAreaId
    } = req.body;

    if (!name || !role) {
      return res.status(400).json({
        success: false,
        error: 'Name and role are required'
      });
    }

    const employee = await prisma.employee.create({
      data: {
        userId: req.userId!,
        name,
        email,
        role,
        team: team || 'Unassigned',
        startDate: startDate ? new Date(startDate) : new Date(),
        birthday: birthday ? new Date(birthday) : null,
        status: status || 'ACTIVE',
        avatarUrl,
        strengths: strengths || [],
        growthAreas: growthAreas || [],
        developmentPlan,
        workAreaId
      },
      include: {
        workArea: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create employee'
    });
  }
});

// Update employee
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Handle date fields
    const updateData = { ...req.body };
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.birthday) {
      updateData.birthday = new Date(updateData.birthday);
    }
    if (updateData.birthday === '') {
      updateData.birthday = null;
    }

    const updated = await prisma.employee.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update employee'
    });
  }
});

// Delete employee
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    await prisma.employee.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Employee deleted'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete employee'
    });
  }
});

// Add note to employee
router.post('/:id/notes', async (req: AuthRequest, res) => {
  try {
    const { content, type } = req.body;

    const employee = await prisma.employee.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    const note = await prisma.employeeNote.create({
      data: {
        employeeId: req.params.id,
        content,
        type: type || 'GENERAL'
      }
    });

    res.status(201).json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add note'
    });
  }
});

// Add 1:1 record
router.post('/:id/one-on-ones', async (req: AuthRequest, res) => {
  try {
    const { date, notes, mood, topics, followUps, eventId } = req.body;

    const employee = await prisma.employee.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    const oneOnOne = await prisma.oneOnOne.create({
      data: {
        employeeId: req.params.id,
        eventId,
        date: date ? new Date(date) : new Date(),
        notes,
        mood,
        topics: topics || [],
        followUps: followUps || []
      }
    });

    res.status(201).json({
      success: true,
      data: oneOnOne
    });
  } catch (error) {
    console.error('Add 1:1 error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add 1:1 record'
    });
  }
});

// Get all teams (for filtering)
router.get('/meta/teams', async (req: AuthRequest, res) => {
  try {
    const teams = await prisma.employee.findMany({
      where: { userId: req.userId },
      select: { team: true },
      distinct: ['team']
    });

    res.json({
      success: true,
      data: teams.map(t => t.team)
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get teams'
    });
  }
});

// Get employee competencies
router.get('/:id/competencies', async (req: AuthRequest, res) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    const competencies = await prisma.employeeCompetency.findMany({
      where: { employeeId: req.params.id },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: competencies
    });
  } catch (error) {
    console.error('Get competencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get competencies'
    });
  }
});

// Update or create competency
router.post('/:id/competencies', async (req: AuthRequest, res) => {
  try {
    const { category, name, rating, notes } = req.body;

    const employee = await prisma.employee.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    const competency = await prisma.employeeCompetency.upsert({
      where: {
        employeeId_category_name: {
          employeeId: req.params.id,
          category,
          name
        }
      },
      update: {
        rating,
        notes
      },
      create: {
        employeeId: req.params.id,
        category,
        name,
        rating,
        notes
      }
    });

    res.json({
      success: true,
      data: competency
    });
  } catch (error) {
    console.error('Update competency error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update competency'
    });
  }
});

// Bulk update competencies
router.put('/:id/competencies', async (req: AuthRequest, res) => {
  try {
    const { competencies } = req.body;

    const employee = await prisma.employee.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Upsert all competencies
    const results = await Promise.all(
      competencies.map((c: any) =>
        prisma.employeeCompetency.upsert({
          where: {
            employeeId_category_name: {
              employeeId: req.params.id,
              category: c.category,
              name: c.name
            }
          },
          update: {
            rating: c.rating,
            notes: c.notes
          },
          create: {
            employeeId: req.params.id,
            category: c.category,
            name: c.name,
            rating: c.rating,
            notes: c.notes
          }
        })
      )
    );

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Bulk update competencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update competencies'
    });
  }
});

export default router;

