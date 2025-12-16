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

export default router;

