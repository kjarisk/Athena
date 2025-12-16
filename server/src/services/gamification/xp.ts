import { prisma } from '../../index.js';

// XP thresholds for each level
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  850,    // Level 5
  1300,   // Level 6
  1900,   // Level 7
  2600,   // Level 8
  3500,   // Level 9
  4600,   // Level 10
  6000,   // Level 11
  7700,   // Level 12
  9700,   // Level 13
  12000,  // Level 14
  15000,  // Level 15
  18500,  // Level 16
  22500,  // Level 17
  27000,  // Level 18
  32000,  // Level 19
  38000   // Level 20
];

export function calculateLevel(totalXp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function getXpForNextLevel(level: number): number {
  if (level >= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - LEVEL_THRESHOLDS.length + 1) * 5000;
  }
  return LEVEL_THRESHOLDS[level];
}

export function getXpProgress(totalXp: number): { current: number; required: number; percentage: number } {
  const level = calculateLevel(totalXp);
  const currentLevelXp = level > 1 ? LEVEL_THRESHOLDS[level - 1] : 0;
  const nextLevelXp = getXpForNextLevel(level);
  
  const current = totalXp - currentLevelXp;
  const required = nextLevelXp - currentLevelXp;
  const percentage = Math.round((current / required) * 100);
  
  return { current, required, percentage };
}

export async function addXp(
  userId: string, 
  amount: number, 
  reason: string
): Promise<{ newXp: number; newLevel: number; leveledUp: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gamificationStats: true }
  });

  const stats = user?.gamificationStats as any || {
    level: 1,
    currentXp: 0,
    totalXp: 0,
    streak: 0,
    longestStreak: 0,
    achievements: [],
    lastActivityDate: new Date().toISOString()
  };

  const oldLevel = stats.level;
  const newTotalXp = stats.totalXp + amount;
  const newLevel = calculateLevel(newTotalXp);
  const leveledUp = newLevel > oldLevel;
  
  // Update streak
  const today = new Date().toDateString();
  const lastActivity = new Date(stats.lastActivityDate).toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  
  let newStreak = stats.streak;
  if (lastActivity !== today) {
    if (lastActivity === yesterday) {
      newStreak = stats.streak + 1;
    } else {
      newStreak = 1;
    }
  }

  const newStats = {
    ...stats,
    level: newLevel,
    currentXp: stats.currentXp + amount,
    totalXp: newTotalXp,
    streak: newStreak,
    longestStreak: Math.max(stats.longestStreak, newStreak),
    lastActivityDate: new Date().toISOString()
  };

  await prisma.user.update({
    where: { id: userId },
    data: { gamificationStats: newStats }
  });

  return {
    newXp: newTotalXp,
    newLevel,
    leveledUp
  };
}

export async function getStreak(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gamificationStats: true }
  });

  const stats = user?.gamificationStats as any;
  return stats?.streak || 0;
}

