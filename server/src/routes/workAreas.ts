import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Get all work areas with counts
router.get('/', async (req: AuthRequest, res) => {
  try {
    const workAreas = await prisma.workArea.findMany({
      where: { userId: req.userId },
      include: {
        _count: {
          select: {
            employees: true,
            actions: true,
            events: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    // Get active action counts per area
    const areasWithStats = await Promise.all(
      workAreas.map(async (area) => {
        const pendingActions = await prisma.action.count({
          where: {
            workAreaId: area.id,
            status: { notIn: ['COMPLETED', 'CANCELLED'] }
          }
        });
        
        const overdueActions = await prisma.action.count({
          where: {
            workAreaId: area.id,
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
            dueDate: { lt: new Date() }
          }
        });

        return {
          ...area,
          pendingActions,
          overdueActions
        };
      })
    );

    res.json({
      success: true,
      data: areasWithStats
    });
  } catch (error) {
    console.error('Get work areas error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get work areas'
    });
  }
});

// Get single work area with details
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const workArea = await prisma.workArea.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
            status: true
          }
        },
        actions: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED'] }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        events: {
          orderBy: { startTime: 'desc' },
          take: 10
        },
        _count: {
          select: {
            employees: true,
            actions: true,
            events: true
          }
        }
      }
    });

    if (!workArea) {
      return res.status(404).json({
        success: false,
        error: 'Work area not found'
      });
    }

    res.json({
      success: true,
      data: workArea
    });
  } catch (error) {
    console.error('Get work area error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get work area'
    });
  }
});

// Create work area
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, color, icon, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    // Get max sort order
    const maxOrder = await prisma.workArea.aggregate({
      where: { userId: req.userId },
      _max: { sortOrder: true }
    });

    const workArea = await prisma.workArea.create({
      data: {
        userId: req.userId!,
        name,
        color: color || '#D4A574',
        icon: icon || 'briefcase',
        description,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1
      },
      include: {
        _count: {
          select: {
            employees: true,
            actions: true,
            events: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: workArea
    });
  } catch (error) {
    console.error('Create work area error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create work area'
    });
  }
});

// Update work area
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const workArea = await prisma.workArea.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });

    if (!workArea) {
      return res.status(404).json({
        success: false,
        error: 'Work area not found'
      });
    }

    const updated = await prisma.workArea.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        _count: {
          select: {
            employees: true,
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
    console.error('Update work area error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update work area'
    });
  }
});

// Delete work area (with option to reassign or disconnect items)
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { reassignToId } = req.query;

    const workArea = await prisma.workArea.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        _count: {
          select: {
            employees: true,
            actions: true,
            events: true
          }
        }
      }
    });

    if (!workArea) {
      return res.status(404).json({
        success: false,
        error: 'Work area not found'
      });
    }

    // If reassign target provided, move items there
    if (reassignToId && typeof reassignToId === 'string') {
      await prisma.$transaction([
        prisma.employee.updateMany({
          where: { workAreaId: req.params.id },
          data: { workAreaId: reassignToId }
        }),
        prisma.action.updateMany({
          where: { workAreaId: req.params.id },
          data: { workAreaId: reassignToId }
        }),
        prisma.event.updateMany({
          where: { workAreaId: req.params.id },
          data: { workAreaId: reassignToId }
        })
      ]);
    } else {
      // Disconnect items (set to null)
      await prisma.$transaction([
        prisma.employee.updateMany({
          where: { workAreaId: req.params.id },
          data: { workAreaId: null }
        }),
        prisma.action.updateMany({
          where: { workAreaId: req.params.id },
          data: { workAreaId: null }
        }),
        prisma.event.updateMany({
          where: { workAreaId: req.params.id },
          data: { workAreaId: null }
        })
      ]);
    }

    await prisma.workArea.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Work area deleted'
    });
  } catch (error) {
    console.error('Delete work area error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete work area'
    });
  }
});

// Reorder work areas
router.post('/reorder', async (req: AuthRequest, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({
        success: false,
        error: 'orderedIds array is required'
      });
    }

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.workArea.update({
          where: { id },
          data: { sortOrder: index }
        })
      )
    );

    res.json({
      success: true,
      message: 'Work areas reordered'
    });
  } catch (error) {
    console.error('Reorder work areas error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder work areas'
    });
  }
});

export default router;

