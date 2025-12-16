import { prisma } from '../../index.js';
import { addXp } from './xp.js';

interface AchievementCheck {
  achievementId: string;
  check: (userId: string) => Promise<boolean>;
}

// Achievement check functions
const achievementChecks: AchievementCheck[] = [
  {
    achievementId: 'first-action',
    check: async (userId: string) => {
      const count = await prisma.action.count({
        where: { userId, status: 'COMPLETED' }
      });
      return count >= 1;
    }
  },
  {
    achievementId: 'action-starter',
    check: async (userId: string) => {
      const count = await prisma.action.count({
        where: { userId, status: 'COMPLETED' }
      });
      return count >= 10;
    }
  },
  {
    achievementId: 'action-master',
    check: async (userId: string) => {
      const count = await prisma.action.count({
        where: { userId, status: 'COMPLETED' }
      });
      return count >= 50;
    }
  },
  {
    achievementId: 'action-legend',
    check: async (userId: string) => {
      const count = await prisma.action.count({
        where: { userId, status: 'COMPLETED' }
      });
      return count >= 100;
    }
  },
  {
    achievementId: 'team-builder',
    check: async (userId: string) => {
      const count = await prisma.employee.count({
        where: { userId }
      });
      return count >= 5;
    }
  },
  {
    achievementId: 'one-on-one-champion',
    check: async (userId: string) => {
      const count = await prisma.oneOnOne.count({
        where: {
          employee: { userId }
        }
      });
      return count >= 20;
    }
  },
  {
    achievementId: 'workshop-warrior',
    check: async (userId: string) => {
      const count = await prisma.event.count({
        where: {
          userId,
          eventType: {
            category: 'WORKSHOP'
          }
        }
      });
      return count >= 10;
    }
  },
  {
    achievementId: 'streak-starter',
    check: async (userId: string) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { gamificationStats: true }
      });
      const stats = user?.gamificationStats as any;
      return (stats?.streak || 0) >= 7;
    }
  },
  {
    achievementId: 'streak-master',
    check: async (userId: string) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { gamificationStats: true }
      });
      const stats = user?.gamificationStats as any;
      return (stats?.streak || 0) >= 30;
    }
  },
  {
    achievementId: 'early-bird',
    check: async (userId: string) => {
      const completedEarly = await prisma.action.count({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            lt: prisma.action.fields.dueDate
          }
        }
      });
      return completedEarly >= 10;
    }
  }
];

export async function checkAchievements(userId: string): Promise<string[]> {
  const newlyUnlocked: string[] = [];

  // Get user's existing achievements
  const existingAchievements = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true }
  });
  const existingIds = new Set(existingAchievements.map(a => a.achievementId));

  // Get all achievements
  const allAchievements = await prisma.achievement.findMany();
  const achievementMap = new Map(allAchievements.map(a => [a.name, a]));

  for (const check of achievementChecks) {
    const achievement = achievementMap.get(check.achievementId);
    if (!achievement) continue;
    
    if (existingIds.has(achievement.id)) continue;

    try {
      const earned = await check.check(userId);
      if (earned) {
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id
          }
        });

        // Award XP
        await addXp(userId, achievement.xpReward, `achievement:${achievement.name}`);
        
        newlyUnlocked.push(achievement.name);
      }
    } catch (error) {
      console.error(`Error checking achievement ${check.achievementId}:`, error);
    }
  }

  return newlyUnlocked;
}

export async function initializeAchievements(): Promise<void> {
  const achievements = [
    {
      name: 'first-action',
      description: 'Complete your first action',
      icon: 'trophy',
      xpReward: 50,
      condition: { type: 'count', target: 1, metric: 'actions_completed' }
    },
    {
      name: 'action-starter',
      description: 'Complete 10 actions',
      icon: 'star',
      xpReward: 100,
      condition: { type: 'count', target: 10, metric: 'actions_completed' }
    },
    {
      name: 'action-master',
      description: 'Complete 50 actions',
      icon: 'medal',
      xpReward: 250,
      condition: { type: 'count', target: 50, metric: 'actions_completed' }
    },
    {
      name: 'action-legend',
      description: 'Complete 100 actions',
      icon: 'crown',
      xpReward: 500,
      condition: { type: 'count', target: 100, metric: 'actions_completed' }
    },
    {
      name: 'team-builder',
      description: 'Add 5 team members',
      icon: 'users',
      xpReward: 100,
      condition: { type: 'count', target: 5, metric: 'employees_added' }
    },
    {
      name: 'one-on-one-champion',
      description: 'Complete 20 one-on-one meetings',
      icon: 'message-circle',
      xpReward: 200,
      condition: { type: 'count', target: 20, metric: 'one_on_ones' }
    },
    {
      name: 'workshop-warrior',
      description: 'Host 10 workshops',
      icon: 'presentation',
      xpReward: 200,
      condition: { type: 'count', target: 10, metric: 'workshops' }
    },
    {
      name: 'streak-starter',
      description: 'Maintain a 7-day streak',
      icon: 'flame',
      xpReward: 150,
      condition: { type: 'streak', target: 7, metric: 'daily_activity' }
    },
    {
      name: 'streak-master',
      description: 'Maintain a 30-day streak',
      icon: 'fire',
      xpReward: 500,
      condition: { type: 'streak', target: 30, metric: 'daily_activity' }
    },
    {
      name: 'early-bird',
      description: 'Complete 10 actions before their due date',
      icon: 'clock',
      xpReward: 150,
      condition: { type: 'count', target: 10, metric: 'early_completions' }
    }
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: achievement,
      create: achievement
    });
  }
}

