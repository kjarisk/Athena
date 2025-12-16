import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  Medal, 
  Crown, 
  Users, 
  MessageCircle, 
  Presentation,
  Flame,
  Clock,
  Lock
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatDate, getXpProgress } from '@/lib/utils';

const iconMap: Record<string, any> = {
  trophy: Trophy,
  star: Star,
  medal: Medal,
  crown: Crown,
  users: Users,
  'message-circle': MessageCircle,
  presentation: Presentation,
  flame: Flame,
  fire: Flame,
  clock: Clock
};

export default function Achievements() {
  const { user } = useAuthStore();
  const stats = user?.gamificationStats;
  const xpProgress = stats ? getXpProgress(stats.totalXp, stats.level) : null;

  const { data: achievements, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => apiHelpers.getAchievements().then(r => r.data.data)
  });

  const { data: challenges } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => apiHelpers.getChallenges().then(r => r.data.data)
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  const unlockedAchievements = achievements?.filter((a: any) => a.unlocked) || [];
  const lockedAchievements = achievements?.filter((a: any) => !a.unlocked) || [];

  return (
    <div className="space-y-8">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-text-primary">Achievements</h1>
          <p className="text-text-secondary mt-1">
            Track your progress and earn rewards
          </p>
        </div>

        {/* Stats Cards */}
        {stats && xpProgress && (
          <div className="flex gap-4">
            <Card padding="sm" className="bg-gradient-warm text-white">
              <div className="text-center px-4">
                <p className="text-white/80 text-sm">Level</p>
                <p className="font-display text-3xl font-bold">{stats.level}</p>
              </div>
            </Card>
            <Card padding="sm">
              <div className="text-center px-4">
                <p className="text-text-secondary text-sm">Total XP</p>
                <p className="font-display text-3xl font-bold text-primary">{stats.totalXp}</p>
              </div>
            </Card>
            <Card padding="sm" className="bg-warning/10">
              <div className="text-center px-4">
                <p className="text-text-secondary text-sm">Streak</p>
                <p className="font-display text-3xl font-bold text-warning">{stats.streak}</p>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* XP Progress */}
      {xpProgress && (
        <Card className="bg-gradient-ethereal">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-gradient-warm flex items-center justify-center text-white shadow-glow flex-shrink-0">
              <span className="font-display text-2xl font-bold">{stats?.level}</span>
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Progress to Level {(stats?.level || 0) + 1}</span>
                <span className="text-text-secondary">{xpProgress.current} / {xpProgress.required} XP</span>
              </div>
              <div className="xp-bar h-4">
                <motion.div 
                  className="xp-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress.percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Active Challenges */}
      {challenges && challenges.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-text-primary mb-4">
            Active Challenges
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {challenges.map((challenge: any) => (
              <Card key={challenge.id} className="border-2 border-primary/20">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-text-primary">{challenge.name}</h3>
                    <p className="text-sm text-text-secondary mt-1">{challenge.description}</p>
                  </div>
                  <span className="text-primary font-medium">+{challenge.xpReward} XP</span>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">Progress</span>
                    <span className="font-medium">{challenge.progress} / {challenge.target}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Ends {formatDate(challenge.endDate)}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Unlocked Achievements */}
      <section>
        <h2 className="font-display text-xl font-semibold text-text-primary mb-4">
          Unlocked ({unlockedAchievements.length})
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {unlockedAchievements.map((achievement: any, index: number) => {
            const Icon = iconMap[achievement.icon] || Trophy;
            
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="text-center bg-gradient-ethereal border-2 border-primary/30">
                  <div className="w-14 h-14 mx-auto rounded-full bg-gradient-warm flex items-center justify-center text-white shadow-glow mb-3">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-text-primary">{achievement.name}</h3>
                  <p className="text-sm text-text-secondary mt-1">{achievement.description}</p>
                  <p className="text-primary font-medium mt-2">+{achievement.xpReward} XP</p>
                  {achievement.unlockedAt && (
                    <p className="text-xs text-text-muted mt-1">
                      {formatDate(achievement.unlockedAt)}
                    </p>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Locked Achievements */}
      <section>
        <h2 className="font-display text-xl font-semibold text-text-primary mb-4">
          Locked ({lockedAchievements.length})
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {lockedAchievements.map((achievement: any, index: number) => {
            const Icon = iconMap[achievement.icon] || Trophy;
            
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="text-center opacity-60">
                  <div className="w-14 h-14 mx-auto rounded-full bg-surface flex items-center justify-center text-text-muted mb-3">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-text-primary">{achievement.name}</h3>
                  <p className="text-sm text-text-secondary mt-1">{achievement.description}</p>
                  <p className="text-text-muted font-medium mt-2">+{achievement.xpReward} XP</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

