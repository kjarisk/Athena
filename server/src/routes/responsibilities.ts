import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

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

export default router;

