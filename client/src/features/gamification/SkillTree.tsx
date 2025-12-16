import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, Lock, Check, Info } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { cn, getXpProgress } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useState } from 'react';

export default function SkillTree() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedSkill, setSelectedSkill] = useState<any>(null);

  const stats = user?.gamificationStats;
  const xpProgress = stats ? getXpProgress(stats.totalXp, stats.level) : null;

  const { data: skillTree, isLoading } = useQuery({
    queryKey: ['skillTree', 'leadership'],
    queryFn: () => apiHelpers.getSkillTree('leadership').then(r => r.data.data)
  });

  const unlockMutation = useMutation({
    mutationFn: (skillId: string) => apiHelpers.unlockSkill(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skillTree'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      setSelectedSkill(null);
      toast.success('Skill unlocked!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to unlock skill');
    }
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  const skills = skillTree?.skills || [];
  
  // Group skills by category
  const skillsByCategory = skills.reduce((acc: any, skill: any) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {});

  // Calculate SVG viewBox based on skill positions
  const minX = Math.min(...skills.map((s: any) => s.positionX)) - 1;
  const maxX = Math.max(...skills.map((s: any) => s.positionX)) + 1;
  const minY = Math.min(...skills.map((s: any) => s.positionY)) - 1;
  const maxY = Math.max(...skills.map((s: any) => s.positionY)) + 1;

  const scale = 80;
  const offsetX = -minX * scale + 60;
  const offsetY = -minY * scale + 60;

  const canUnlock = (skill: any) => {
    if (skill.unlocked) return false;
    if (!stats) return false;
    
    // Check XP
    if (stats.currentXp < skill.xpRequired) return false;
    
    // Check prerequisites
    if (skill.prerequisites?.length > 0) {
      const unlockedSkillNames = skills
        .filter((s: any) => s.unlocked)
        .map((s: any) => s.name);
      
      return skill.prerequisites.every((prereq: string) => 
        unlockedSkillNames.includes(prereq)
      );
    }
    
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-text-primary">
            Leadership Constellation
          </h1>
          <p className="text-text-secondary mt-1">
            Unlock skills to become a better leader
          </p>
        </div>
        
        {/* XP Display */}
        {stats && xpProgress && (
          <Card padding="sm" className="bg-gradient-ethereal">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-warm flex items-center justify-center text-white font-display text-xl shadow-glow">
                {stats.level}
              </div>
              <div>
                <p className="text-sm text-text-secondary">Available XP</p>
                <p className="font-display text-xl font-semibold text-primary">
                  {stats.currentXp} XP
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Skill Tree Visualization */}
      <Card className="overflow-hidden">
        <CardContent padding="none" className="p-0">
          <div className="relative bg-gradient-ethereal min-h-[500px] overflow-auto">
            {/* Star background effect */}
            <div className="absolute inset-0 opacity-30">
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-primary rounded-full animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 3}s`
                  }}
                />
              ))}
            </div>

            {/* SVG for connections */}
            <svg 
              className="absolute inset-0 w-full h-full"
              viewBox={`0 0 ${(maxX - minX + 2) * scale + 120} ${(maxY - minY + 2) * scale + 120}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Draw connections */}
              {skills.map((skill: any) => 
                skill.prerequisites?.map((prereqName: string) => {
                  const prereq = skills.find((s: any) => s.name === prereqName);
                  if (!prereq) return null;
                  
                  const x1 = prereq.positionX * scale + offsetX;
                  const y1 = prereq.positionY * scale + offsetY;
                  const x2 = skill.positionX * scale + offsetX;
                  const y2 = skill.positionY * scale + offsetY;
                  
                  const isActive = prereq.unlocked;
                  
                  return (
                    <line
                      key={`${prereq.name}-${skill.name}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      className={cn(
                        "skill-connection",
                        isActive && "skill-connection-active"
                      )}
                    />
                  );
                })
              )}
            </svg>

            {/* Skill Nodes */}
            <div className="relative" style={{ 
              width: (maxX - minX + 2) * scale + 120,
              height: (maxY - minY + 2) * scale + 120 
            }}>
              {skills.map((skill: any) => {
                const x = skill.positionX * scale + offsetX;
                const y = skill.positionY * scale + offsetY;
                const isUnlocked = skill.unlocked;
                const isAvailable = canUnlock(skill);
                
                return (
                  <motion.button
                    key={skill.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => setSelectedSkill(skill)}
                    className={cn(
                      "skill-node absolute -translate-x-1/2 -translate-y-1/2",
                      isUnlocked && "skill-node-unlocked",
                      !isUnlocked && isAvailable && "skill-node-available",
                      !isUnlocked && !isAvailable && "skill-node-locked"
                    )}
                    style={{ left: x, top: y }}
                    title={skill.name}
                  >
                    {isUnlocked ? (
                      <Check className="w-6 h-6" />
                    ) : !isAvailable ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    
                    {/* Level indicator */}
                    {skill.currentLevel > 0 && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full text-xs font-bold text-primary flex items-center justify-center shadow-sm">
                        {skill.currentLevel}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skill Categories Legend */}
      <div className="grid md:grid-cols-4 gap-4">
        {Object.entries(skillsByCategory).map(([category, categorySkills]: [string, any]) => {
          const unlockedCount = categorySkills.filter((s: any) => s.unlocked).length;
          
          return (
            <Card key={category} padding="sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text-primary">{category}</h3>
                <span className="text-sm text-text-muted">
                  {unlockedCount}/{categorySkills.length}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {categorySkills.map((skill: any) => (
                  <li 
                    key={skill.id}
                    className={cn(
                      "text-sm flex items-center gap-2",
                      skill.unlocked ? "text-success" : "text-text-muted"
                    )}
                  >
                    {skill.unlocked ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                    {skill.name}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          canUnlock={canUnlock(selectedSkill)}
          currentXp={stats?.currentXp || 0}
          onClose={() => setSelectedSkill(null)}
          onUnlock={() => unlockMutation.mutate(selectedSkill.id)}
          isUnlocking={unlockMutation.isPending}
        />
      )}
    </div>
  );
}

function SkillDetailModal({ skill, canUnlock, currentXp, onClose, onUnlock, isUnlocking }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
      >
        <div className="text-center mb-4">
          <div className={cn(
            "w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3",
            skill.unlocked ? "bg-gradient-warm shadow-glow" : "bg-surface"
          )}>
            {skill.unlocked ? (
              <Check className="w-8 h-8 text-white" />
            ) : (
              <Sparkles className={cn(
                "w-8 h-8",
                canUnlock ? "text-primary" : "text-text-muted"
              )} />
            )}
          </div>
          <h2 className="font-display text-xl font-semibold">{skill.name}</h2>
          <p className="text-sm text-text-secondary">{skill.category}</p>
        </div>

        {skill.description && (
          <p className="text-text-secondary text-center mb-4">{skill.description}</p>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Level</span>
            <span className="font-medium">{skill.currentLevel || 0} / {skill.maxLevel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">XP Required</span>
            <span className={cn(
              "font-medium",
              currentXp >= skill.xpRequired ? "text-success" : "text-danger"
            )}>
              {skill.xpRequired} XP
            </span>
          </div>
          {skill.prerequisites?.length > 0 && (
            <div className="text-sm">
              <span className="text-text-secondary">Prerequisites: </span>
              <span className="font-medium">{skill.prerequisites.join(', ')}</span>
            </div>
          )}
        </div>

        {skill.benefits?.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-text-secondary mb-2">Benefits</h4>
            <ul className="space-y-1">
              {skill.benefits.map((benefit: string, i: number) => (
                <li key={i} className="text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Close
          </Button>
          {!skill.unlocked && (
            <Button 
              className="flex-1" 
              disabled={!canUnlock}
              onClick={onUnlock}
              isLoading={isUnlocking}
            >
              {canUnlock ? `Unlock (${skill.xpRequired} XP)` : 'Locked'}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

