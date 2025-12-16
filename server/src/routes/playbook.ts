import { Router, Request, Response } from 'express';
import { prisma } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// ============================================
// Cadence Rules
// ============================================

// Get all cadence rules for the user
router.get('/cadence', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    const cadenceRules = await prisma.cadenceRule.findMany({
      where: { userId },
      include: {
        employee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        workArea: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: cadenceRules });
  } catch (error) {
    console.error('Error fetching cadence rules:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch cadence rules' });
  }
});

// Create a new cadence rule
router.post('/cadence', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { type, name, frequencyDays, targetType, employeeId, teamId, workAreaId } = req.body;

    if (!type || !name || !frequencyDays || !targetType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: type, name, frequencyDays, targetType' 
      });
    }

    const cadenceRule = await prisma.cadenceRule.create({
      data: {
        userId,
        type,
        name,
        frequencyDays: parseInt(frequencyDays),
        targetType,
        employeeId: employeeId || null,
        teamId: teamId || null,
        workAreaId: workAreaId || null
      },
      include: {
        employee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        workArea: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, data: cadenceRule });
  } catch (error) {
    console.error('Error creating cadence rule:', error);
    res.status(500).json({ success: false, error: 'Failed to create cadence rule' });
  }
});

// Update a cadence rule
router.patch('/cadence/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { type, name, frequencyDays, targetType, employeeId, teamId, workAreaId, isActive } = req.body;

    // Verify ownership
    const existing = await prisma.cadenceRule.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Cadence rule not found' });
    }

    const cadenceRule = await prisma.cadenceRule.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(name !== undefined && { name }),
        ...(frequencyDays !== undefined && { frequencyDays: parseInt(frequencyDays) }),
        ...(targetType !== undefined && { targetType }),
        ...(employeeId !== undefined && { employeeId: employeeId || null }),
        ...(teamId !== undefined && { teamId: teamId || null }),
        ...(workAreaId !== undefined && { workAreaId: workAreaId || null }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        employee: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        workArea: { select: { id: true, name: true } }
      }
    });

    res.json({ success: true, data: cadenceRule });
  } catch (error) {
    console.error('Error updating cadence rule:', error);
    res.status(500).json({ success: false, error: 'Failed to update cadence rule' });
  }
});

// Delete a cadence rule
router.delete('/cadence/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.cadenceRule.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Cadence rule not found' });
    }

    await prisma.cadenceRule.delete({ where: { id } });

    res.json({ success: true, message: 'Cadence rule deleted' });
  } catch (error) {
    console.error('Error deleting cadence rule:', error);
    res.status(500).json({ success: false, error: 'Failed to delete cadence rule' });
  }
});

// Get due items based on cadence rules
router.get('/due-items', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
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
        // For 1:1s, check last oneOnOne date
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

      // Calculate if due
      let daysSinceLast = rule.frequencyDays + 1; // Default to overdue if no last date
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

    // Sort by most overdue first
    dueItems.sort((a, b) => b.daysOverdue - a.daysOverdue);

    res.json({ success: true, data: dueItems });
  } catch (error) {
    console.error('Error fetching due items:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch due items' });
  }
});

// ============================================
// AI Context
// ============================================

// Get AI context for the user
router.get('/ai-context', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    const aiContext = await prisma.aIContextRule.findUnique({
      where: { userId }
    });

    res.json({ 
      success: true, 
      data: aiContext || { content: '', isActive: true } 
    });
  } catch (error) {
    console.error('Error fetching AI context:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch AI context' });
  }
});

// Save AI context (upsert)
router.put('/ai-context', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { content, isActive = true } = req.body;

    if (content === undefined) {
      return res.status(400).json({ success: false, error: 'Content is required' });
    }

    const aiContext = await prisma.aIContextRule.upsert({
      where: { userId },
      update: { content, isActive },
      create: { userId, content, isActive }
    });

    res.json({ success: true, data: aiContext });
  } catch (error) {
    console.error('Error saving AI context:', error);
    res.status(500).json({ success: false, error: 'Failed to save AI context' });
  }
});

export default router;
