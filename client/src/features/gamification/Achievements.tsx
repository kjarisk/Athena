import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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
  Lock,
  Target,
  Plus,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Edit2,
  Trash2,
  TrendingUp,
  Award,
  Zap
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { useAuthStore } from '@/stores/authStore';
import { cn, formatDate, getXpProgress } from '@/lib/utils';
import { 
  useGoals, 
  useCreateGoal, 
  useUpdateGoal, 
  useDeleteGoal, 
  useUpdateKeyResult,
  Goal, 
  KeyResult,
  getCurrentQuarter, 
  getQuarterOptions 
} from '@/hooks/useGoals';

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

const CATEGORIES = [
  { value: 'LEADERSHIP', label: 'Leadership', icon: Crown, color: 'text-amber-500' },
  { value: 'TEAM', label: 'Team Development', icon: Users, color: 'text-blue-500' },
  { value: 'TECHNICAL', label: 'Technical', icon: Zap, color: 'text-purple-500' },
  { value: 'PERSONAL', label: 'Personal Growth', icon: TrendingUp, color: 'text-green-500' },
] as const;

// Goal Card Component
function GoalCard({ goal, onEdit, onUpdateKeyResult }: { 
  goal: Goal; 
  onEdit: (goal: Goal) => void;
  onUpdateKeyResult: (goalId: string, krId: string, value: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const deleteGoal = useDeleteGoal();
  const updateGoal = useUpdateGoal();
  
  const category = CATEGORIES.find(c => c.value === goal.category);
  const CategoryIcon = category?.icon || Target;
  
  const isCompleted = goal.status === 'COMPLETED';
  const isAbandoned = goal.status === 'ABANDONED';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={cn(
        'transition-all',
        isCompleted && 'border-green-300 bg-green-50/50',
        isAbandoned && 'border-stone-300 opacity-60'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('p-2 rounded-lg bg-surface', category?.color)}>
              <CategoryIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  'font-semibold text-text-primary',
                  isCompleted && 'line-through text-text-secondary'
                )}>
                  {goal.title}
                </h3>
                {isCompleted && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                )}
              </div>
              {goal.description && (
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                  {goal.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                <span>{category?.label}</span>
                <span>•</span>
                <span>{goal.quarter}</span>
                {goal.targetDate && (
                  <>
                    <span>•</span>
                    <span>Due {formatDate(goal.targetDate)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isCompleted && !isAbandoned && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateGoal.mutate({ 
                  id: goal.id, 
                  data: { status: 'COMPLETED' } 
                })}
                className="text-green-600 hover:bg-green-50"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(goal)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteGoal.mutate(goal.id)}
              className="text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">Progress</span>
            <span className="font-medium">{goal.progress}%</span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                isCompleted ? 'bg-green-500' : 'bg-primary'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${goal.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
        
        {/* Key Results */}
        {goal.keyResults.length > 0 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-4 text-sm text-primary hover:text-primary/80"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {goal.keyResults.length} Key Results
            </button>
            
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3 pl-4 border-l-2 border-surface">
                    {goal.keyResults.map(kr => (
                      <KeyResultItem 
                        key={kr.id} 
                        keyResult={kr} 
                        goalId={goal.id}
                        onUpdate={onUpdateKeyResult}
                        disabled={isCompleted || isAbandoned}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </Card>
    </motion.div>
  );
}

// Key Result Item
function KeyResultItem({ 
  keyResult, 
  goalId,
  onUpdate,
  disabled 
}: { 
  keyResult: KeyResult; 
  goalId: string;
  onUpdate: (goalId: string, krId: string, value: number) => void;
  disabled?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(keyResult.currentValue.toString());
  
  const progress = Math.min(100, (keyResult.currentValue / keyResult.targetValue) * 100);
  const isComplete = keyResult.currentValue >= keyResult.targetValue;
  
  const handleSave = () => {
    const value = parseInt(editValue) || 0;
    onUpdate(goalId, keyResult.id, value);
    setIsEditing(false);
  };
  
  return (
    <div className="text-sm">
      <div className="flex items-center justify-between">
        <span className={cn(
          'text-text-primary',
          isComplete && 'line-through text-text-secondary'
        )}>
          {keyResult.title}
        </span>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-16 h-6 text-xs p-1"
                autoFocus
              />
              <span className="text-text-muted">/ {keyResult.targetValue}</span>
              <Button size="sm" variant="ghost" onClick={handleSave}>
                <Check className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <>
              <span className="text-text-secondary">
                {keyResult.currentValue} / {keyResult.targetValue}
                {keyResult.unit && ` ${keyResult.unit}`}
              </span>
              {!disabled && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setIsEditing(true)}
                  className="h-5 w-5 p-0"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-surface rounded-full mt-1 overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            isComplete ? 'bg-green-500' : 'bg-primary/60'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Goal Form Modal
function GoalFormModal({ 
  isOpen, 
  onClose, 
  goal 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  goal?: Goal | null;
}) {
  const [title, setTitle] = useState(goal?.title || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [category, setCategory] = useState<Goal['category']>(goal?.category || 'LEADERSHIP');
  const [quarter, setQuarter] = useState(goal?.quarter || getCurrentQuarter());
  const [keyResults, setKeyResults] = useState<{ title: string; targetValue: number; unit: string }[]>(
    goal?.keyResults?.map(kr => ({ title: kr.title, targetValue: kr.targetValue, unit: kr.unit || '' })) || 
    [{ title: '', targetValue: 100, unit: '' }]
  );
  
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const quarterOptions = getQuarterOptions();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validKeyResults = keyResults.filter(kr => kr.title.trim());
    
    if (goal) {
      await updateGoal.mutateAsync({
        id: goal.id,
        data: { title, description, category, quarter }
      });
    } else {
      await createGoal.mutateAsync({
        title,
        description,
        category,
        quarter,
        keyResults: validKeyResults
      });
    }
    
    onClose();
    resetForm();
  };
  
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('LEADERSHIP');
    setQuarter(getCurrentQuarter());
    setKeyResults([{ title: '', targetValue: 100, unit: '' }]);
  };
  
  const addKeyResult = () => {
    setKeyResults([...keyResults, { title: '', targetValue: 100, unit: '' }]);
  };
  
  const removeKeyResult = (index: number) => {
    setKeyResults(keyResults.filter((_, i) => i !== index));
  };
  
  const updateKeyResultField = (index: number, field: string, value: any) => {
    const updated = [...keyResults];
    updated[index] = { ...updated[index], [field]: value };
    setKeyResults(updated);
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={goal ? 'Edit Goal' : 'Create Goal'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Goal Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What do you want to achieve?"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more context..."
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            rows={2}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Goal['category'])}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Quarter
            </label>
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {quarterOptions.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
        </div>
        
        {!goal && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-text-secondary">
                Key Results
              </label>
              <button
                type="button"
                onClick={addKeyResult}
                className="text-sm text-primary hover:text-primary/80"
              >
                + Add Key Result
              </button>
            </div>
            <div className="space-y-2">
              {keyResults.map((kr, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={kr.title}
                    onChange={(e) => updateKeyResultField(index, 'title', e.target.value)}
                    placeholder="Key result description"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={kr.targetValue}
                    onChange={(e) => updateKeyResultField(index, 'targetValue', parseInt(e.target.value) || 0)}
                    className="w-20"
                    placeholder="Target"
                  />
                  <Input
                    value={kr.unit}
                    onChange={(e) => updateKeyResultField(index, 'unit', e.target.value)}
                    className="w-20"
                    placeholder="Unit"
                  />
                  {keyResults.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeKeyResult(index)}
                      className="text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!title.trim() || createGoal.isPending || updateGoal.isPending}
          >
            {goal ? 'Update' : 'Create'} Goal
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Achievements() {
  const { user } = useAuthStore();
  const stats = user?.gamificationStats;
  const xpProgress = stats ? getXpProgress(stats.totalXp, stats.level) : null;
  
  const [activeTab, setActiveTab] = useState<'goals' | 'achievements'>('goals');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [quarterFilter, setQuarterFilter] = useState<string>('');
  
  const updateKeyResult = useUpdateKeyResult();

  const { data: goals = [], isLoading: goalsLoading } = useGoals(
    quarterFilter ? { quarter: quarterFilter } : undefined
  );

  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => apiHelpers.getAchievements().then(r => r.data.data)
  });

  const { data: challenges } = useQuery({
    queryKey: ['challenges'],
    queryFn: () => apiHelpers.getChallenges().then(r => r.data.data)
  });

  const isLoading = goalsLoading || achievementsLoading;

  if (isLoading) {
    return <LoadingPage />;
  }

  const unlockedAchievements = achievements?.filter((a: any) => a.unlocked) || [];
  const lockedAchievements = achievements?.filter((a: any) => !a.unlocked) || [];
  
  const activeGoals = goals.filter(g => g.status === 'IN_PROGRESS');
  const completedGoals = goals.filter(g => g.status === 'COMPLETED');
  
  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setShowGoalModal(true);
  };
  
  const handleCloseModal = () => {
    setShowGoalModal(false);
    setEditingGoal(null);
  };
  
  const handleUpdateKeyResult = (goalId: string, krId: string, value: number) => {
    updateKeyResult.mutate({ goalId, krId, data: { currentValue: value } });
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Goals & Progress
          </h1>
          <p className="text-text-secondary mt-1">
            Track your leadership goals and celebrate achievements
          </p>
        </div>
        
        <Button onClick={() => setShowGoalModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Goal
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && xpProgress && (
        <Card className="bg-gradient-ethereal border-2 border-primary/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-warm text-white mb-2">
                <Trophy className="w-6 h-6" />
              </div>
              <p className="text-2xl font-bold text-text-primary">Level {stats.level}</p>
              <p className="text-sm text-text-secondary">Current Level</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-warm text-white mb-2">
                <Star className="w-6 h-6" />
              </div>
              <p className="text-2xl font-bold text-text-primary">{stats.totalXp}</p>
              <p className="text-sm text-text-secondary">Total XP</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-warm text-white mb-2">
                <Target className="w-6 h-6" />
              </div>
              <p className="text-2xl font-bold text-text-primary">{activeGoals.length}</p>
              <p className="text-sm text-text-secondary">Active Goals</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-warm text-white mb-2">
                <Flame className="w-6 h-6" />
              </div>
              <p className="text-2xl font-bold text-text-primary">{stats.streak || 0}</p>
              <p className="text-sm text-text-secondary">Day Streak</p>
            </div>
          </div>
          
          {/* XP Progress */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex justify-between mb-2">
              <span className="font-semibold">Progress to Level {(stats.level || 0) + 1}</span>
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
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('goals')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'goals' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          <Target className="w-4 h-4 inline mr-2" />
          Goals
        </button>
        <button
          onClick={() => setActiveTab('achievements')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'achievements' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-secondary hover:text-text-primary'
          )}
        >
          <Award className="w-4 h-4 inline mr-2" />
          Achievements ({unlockedAchievements.length}/{achievements?.length || 0})
        </button>
      </div>

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="space-y-6">
          {/* Quarter Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">Filter by quarter:</span>
            <select
              value={quarterFilter}
              onChange={(e) => setQuarterFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background"
            >
              <option value="">All Quarters</option>
              {getQuarterOptions().map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
          
          {/* Active Challenges */}
          {challenges && challenges.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-text-primary mb-4">
                Active Challenges
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {challenges.map((challenge: any) => (
                  <Card key={challenge.id} className="border-2 border-amber-200 bg-amber-50/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-text-primary">{challenge.name}</h3>
                        <p className="text-sm text-text-secondary mt-1">{challenge.description}</p>
                      </div>
                      <span className="text-amber-600 font-medium">+{challenge.xpReward} XP</span>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">Progress</span>
                        <span className="font-medium">{challenge.progress} / {challenge.target}</span>
                      </div>
                      <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full" 
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
          
          {/* Active Goals */}
          <section>
            <h2 className="font-display text-lg font-semibold text-text-primary mb-4">
              Active Goals ({activeGoals.length})
            </h2>
            {activeGoals.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {activeGoals.map(goal => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onEdit={handleEditGoal}
                    onUpdateKeyResult={handleUpdateKeyResult}
                  />
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <Target className="w-12 h-12 mx-auto text-text-muted mb-3" />
                <p className="text-text-secondary">No active goals</p>
                <Button 
                  variant="secondary" 
                  className="mt-4"
                  onClick={() => setShowGoalModal(true)}
                >
                  Create your first goal
                </Button>
              </Card>
            )}
          </section>
          
          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-text-primary mb-4">
                Completed ({completedGoals.length})
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {completedGoals.map(goal => (
                  <GoalCard 
                    key={goal.id} 
                    goal={goal} 
                    onEdit={handleEditGoal}
                    onUpdateKeyResult={handleUpdateKeyResult}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-6">
          {/* Unlocked Achievements */}
          <section>
            <h2 className="font-display text-lg font-semibold text-text-primary mb-4">
              Unlocked ({unlockedAchievements.length})
            </h2>
            {unlockedAchievements.length > 0 ? (
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
            ) : (
              <Card className="text-center py-8">
                <Trophy className="w-12 h-12 mx-auto text-text-muted mb-3" />
                <p className="text-text-secondary">No achievements unlocked yet</p>
                <p className="text-sm text-text-muted mt-1">Keep up the great work to earn achievements!</p>
              </Card>
            )}
          </section>

          {/* Locked Achievements */}
          <section>
            <h2 className="font-display text-lg font-semibold text-text-primary mb-4">
              Locked ({lockedAchievements.length})
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {lockedAchievements.map((achievement: any, index: number) => {
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
      )}

      {/* Goal Modal */}
      <GoalFormModal 
        isOpen={showGoalModal} 
        onClose={handleCloseModal}
        goal={editingGoal}
      />
    </div>
  );
}

