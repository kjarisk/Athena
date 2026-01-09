import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { checkAchievements } from '../services/gamification/achievements.js';

const router = Router();

router.use(authenticateToken);

// Get user's gamification stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { gamificationStats: true }
    });

    res.json({
      success: true,
      data: user?.gamificationStats
    });
  } catch (error) {
    console.error('Get gamification stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gamification stats'
    });
  }
});

// Get all achievements
router.get('/achievements', async (req: AuthRequest, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
      include: {
        users: {
          where: { userId: req.userId }
        }
      }
    });

    const mapped = achievements.map(a => ({
      ...a,
      unlocked: a.users.length > 0,
      unlockedAt: a.users[0]?.unlockedAt
    }));

    res.json({
      success: true,
      data: mapped
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get achievements'
    });
  }
});

// Get active challenges
router.get('/challenges', async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    
    const challenges = await prisma.challenge.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        users: {
          where: { userId: req.userId }
        }
      }
    });

    const mapped = challenges.map(c => ({
      ...c,
      progress: c.users[0]?.progress || 0,
      completed: c.users[0]?.completed || false
    }));

    res.json({
      success: true,
      data: mapped
    });
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get challenges'
    });
  }
});

// Get skill tree
router.get('/skill-tree/:type', async (req: AuthRequest, res) => {
  try {
    const { type } = req.params;
    
    const skillTree = await prisma.skillTree.findFirst({
      where: {
        type: type.toUpperCase() as any
      },
      include: {
        skills: {
          include: {
            userSkills: {
              where: { userId: req.userId }
            }
          }
        }
      }
    });

    if (!skillTree) {
      return res.status(404).json({
        success: false,
        error: 'Skill tree not found'
      });
    }

    // Map skills with user progress
    const mappedSkills = skillTree.skills.map(skill => ({
      ...skill,
      currentLevel: skill.userSkills[0]?.level || 0,
      unlocked: skill.userSkills[0]?.unlocked || false
    }));

    res.json({
      success: true,
      data: {
        ...skillTree,
        skills: mappedSkills
      }
    });
  } catch (error) {
    console.error('Get skill tree error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get skill tree'
    });
  }
});

// Unlock skill node
router.post('/skill-tree/unlock', async (req: AuthRequest, res) => {
  try {
    const { skillId } = req.body;

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        userSkills: {
          where: { userId: req.userId }
        }
      }
    });

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      });
    }

    // Check prerequisites
    if (skill.prerequisites.length > 0) {
      const prerequisiteSkills = await prisma.userSkillNode.findMany({
        where: {
          userId: req.userId,
          skillId: { in: skill.prerequisites },
          unlocked: true
        }
      });

      if (prerequisiteSkills.length !== skill.prerequisites.length) {
        return res.status(400).json({
          success: false,
          error: 'Prerequisites not met'
        });
      }
    }

    // Check XP
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { gamificationStats: true }
    });

    const stats = user?.gamificationStats as any;
    if (stats.currentXp < skill.xpRequired) {
      return res.status(400).json({
        success: false,
        error: 'Not enough XP'
      });
    }

    // Unlock or level up
    const existing = skill.userSkills[0];
    
    if (existing) {
      if (existing.level >= skill.maxLevel) {
        return res.status(400).json({
          success: false,
          error: 'Skill already at max level'
        });
      }

      await prisma.userSkillNode.update({
        where: { id: existing.id },
        data: {
          level: existing.level + 1,
          unlocked: true
        }
      });
    } else {
      await prisma.userSkillNode.create({
        data: {
          userId: req.userId!,
          skillId,
          level: 1,
          unlocked: true
        }
      });
    }

    // Deduct XP
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        gamificationStats: {
          ...stats,
          currentXp: stats.currentXp - skill.xpRequired
        }
      }
    });

    res.json({
      success: true,
      message: 'Skill unlocked'
    });
  } catch (error) {
    console.error('Unlock skill error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlock skill'
    });
  }
});

// Check and award achievements (internal endpoint)
router.post('/check-achievements', async (req: AuthRequest, res) => {
  try {
    const newAchievements = await checkAchievements(req.userId!);
    
    res.json({
      success: true,
      data: newAchievements
    });
  } catch (error) {
    console.error('Check achievements error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check achievements'
    });
  }
});

// Get leaderboard (for future multi-user)
router.get('/leaderboard', async (req: AuthRequest, res) => {
  try {
    // For now, just return the current user's rank
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        gamificationStats: true
      }
    });

    res.json({
      success: true,
      data: [user]
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

// Get user's competency self-assessment ratings
router.get('/competencies', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { settings: true }
    });

    const settings = (user?.settings as any) || {};
    const competencyRatings = settings.competencyRatings || [];
    const lastAssessment = settings.lastCompetencyAssessment || null;

    res.json({
      success: true,
      data: {
        ratings: competencyRatings,
        lastAssessment
      }
    });
  } catch (error) {
    console.error('Get competencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get competencies'
    });
  }
});

// Save competency self-assessment ratings
router.post('/competencies', async (req: AuthRequest, res) => {
  try {
    const { ratings } = req.body;
    
    // Convert ratings object to array format
    const ratingsArray = Object.entries(ratings).map(([competencyId, rating]) => ({
      competencyId,
      rating,
      updatedAt: new Date().toISOString()
    }));

    // Get current settings
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { settings: true }
    });

    const currentSettings = (user?.settings as any) || {};

    // Update settings with new ratings
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        settings: {
          ...currentSettings,
          competencyRatings: ratingsArray,
          lastCompetencyAssessment: new Date().toISOString()
        }
      }
    });

    res.json({
      success: true,
      data: {
        ratings: ratingsArray,
        lastAssessment: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Save competencies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save competencies'
    });
  }
});

// ============================================
// Personal Goals / OKRs
// ============================================

// Get all goals for user
router.get('/goals', async (req: AuthRequest, res) => {
  try {
    const { quarter, status } = req.query;
    
    const where: any = { userId: req.userId };
    if (quarter) where.quarter = quarter;
    if (status) where.status = status;

    const goals = await prisma.goal.findMany({
      where,
      include: {
        keyResults: true
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: goals
    });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get goals'
    });
  }
});

// Create a new goal
router.post('/goals', async (req: AuthRequest, res) => {
  try {
    const { title, description, category, quarter, targetDate, keyResults } = req.body;

    if (!title || !category || !quarter) {
      return res.status(400).json({
        success: false,
        error: 'Title, category, and quarter are required'
      });
    }

    const goal = await prisma.goal.create({
      data: {
        userId: req.userId!,
        title,
        description,
        category,
        quarter,
        targetDate: targetDate ? new Date(targetDate) : null,
        keyResults: keyResults ? {
          create: keyResults.map((kr: any) => ({
            title: kr.title,
            targetValue: kr.targetValue || 100,
            unit: kr.unit
          }))
        } : undefined
      },
      include: {
        keyResults: true
      }
    });

    res.status(201).json({
      success: true,
      data: goal
    });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create goal'
    });
  }
});

// Update a goal
router.put('/goals/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, quarter, targetDate, status, progress } = req.body;

    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(quarter && { quarter }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
        ...(status && { status }),
        ...(progress !== undefined && { progress })
      },
      include: {
        keyResults: true
      }
    });

    res.json({
      success: true,
      data: goal
    });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update goal'
    });
  }
});

// Delete a goal
router.delete('/goals/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id, userId: req.userId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    await prisma.goal.delete({
      where: { id }
    });

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete goal'
    });
  }
});

// Update a key result
router.put('/goals/:goalId/key-results/:krId', async (req: AuthRequest, res) => {
  try {
    const { goalId, krId } = req.params;
    const { title, currentValue, targetValue, unit } = req.body;

    // Verify ownership via goal
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: req.userId },
      include: { keyResults: true }
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    const keyResult = await prisma.keyResult.update({
      where: { id: krId },
      data: {
        ...(title && { title }),
        ...(currentValue !== undefined && { currentValue }),
        ...(targetValue !== undefined && { targetValue }),
        ...(unit !== undefined && { unit })
      }
    });

    // Recalculate goal progress based on key results
    const allKeyResults = await prisma.keyResult.findMany({
      where: { goalId }
    });

    if (allKeyResults.length > 0) {
      const totalProgress = allKeyResults.reduce((sum, kr) => {
        return sum + Math.min(100, (kr.currentValue / kr.targetValue) * 100);
      }, 0);
      const avgProgress = Math.round(totalProgress / allKeyResults.length);

      await prisma.goal.update({
        where: { id: goalId },
        data: { progress: avgProgress }
      });
    }

    res.json({
      success: true,
      data: keyResult
    });
  } catch (error) {
    console.error('Update key result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update key result'
    });
  }
});

// Add a key result to a goal
router.post('/goals/:goalId/key-results', async (req: AuthRequest, res) => {
  try {
    const { goalId } = req.params;
    const { title, targetValue, unit } = req.body;

    // Verify ownership
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: req.userId }
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    const keyResult = await prisma.keyResult.create({
      data: {
        goalId,
        title,
        targetValue: targetValue || 100,
        unit
      }
    });

    res.status(201).json({
      success: true,
      data: keyResult
    });
  } catch (error) {
    console.error('Add key result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add key result'
    });
  }
});

// Delete a key result
router.delete('/goals/:goalId/key-results/:krId', async (req: AuthRequest, res) => {
  try {
    const { goalId, krId } = req.params;

    // Verify ownership via goal
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId: req.userId }
    });

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    await prisma.keyResult.delete({
      where: { id: krId }
    });

    res.json({
      success: true,
      data: { id: krId }
    });
  } catch (error) {
    console.error('Delete key result error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete key result'
    });
  }
});

export default router;

