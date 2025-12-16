import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus,
  Edit2,
  Trash2,
  CheckSquare, 
  Calendar, 
  AlertCircle, 
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  ChevronRight,
  Users,
  Zap,
  Target,
  MoreVertical,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiHelpers } from '@/lib/api';
import { formatDate, getXpProgress, getDueDateLabel, cn } from '@/lib/utils';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import TeamPulse from '@/components/TeamPulse';
import PeopleEvents from '@/components/PeopleEvents';
import toast from 'react-hot-toast';

// Icon mapping for work areas
const iconOptions = [
  { value: 'users', label: 'Team', icon: Users },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'briefcase', label: 'Briefcase', icon: TrendingUp },
  { value: 'zap', label: 'Lightning', icon: Zap },
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
];

const colorOptions = [
  { value: '#7BA087', label: 'Sage Green' },
  { value: '#D4A574', label: 'Warm Gold' },
  { value: '#E8B86D', label: 'Bright Gold' },
  { value: '#CD7F6E', label: 'Terracotta' },
  { value: '#8FBC8F', label: 'Forest Green' },
  { value: '#DAA520', label: 'Goldenrod' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<any>(null);
  const [areaMenuOpen, setAreaMenuOpen] = useState<string | null>(null);
  const [showHiddenAreas, setShowHiddenAreas] = useState(false);

  const stats = user?.gamificationStats;
  const xpProgress = stats ? getXpProgress(stats.totalXp, stats.level) : null;

  const { data: workAreas, isLoading: loadingAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

  const { data: actionStats } = useQuery({
    queryKey: ['actionStats'],
    queryFn: () => apiHelpers.getActionStats().then(r => r.data.data)
  });

  const { data: overdueActions } = useQuery({
    queryKey: ['actions', 'overdue'],
    queryFn: () => apiHelpers.getActions({ overdue: 'true' }).then(r => r.data.data)
  });

  const { data: todayEvents } = useQuery({
    queryKey: ['events', 'today'],
    queryFn: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return apiHelpers.getEvents({ 
        startDate: today.toISOString(), 
        endDate: tomorrow.toISOString() 
      }).then(r => r.data.data);
    }
  });

  const { data: focusSuggestions } = useQuery({
    queryKey: ['focusSuggestions'],
    queryFn: () => apiHelpers.getFocusSuggestions().then(r => r.data.data),
    retry: false
  });

  const { data: dailyBriefing } = useQuery({
    queryKey: ['dailyBriefing'],
    queryFn: () => apiHelpers.getDailyBriefing().then(r => r.data.data),
    retry: false,
    staleTime: 1000 * 60 * 30 // Cache for 30 mins
  });

  const { data: dueItems } = useQuery({
    queryKey: ['dueItems'],
    queryFn: () => apiHelpers.getDueItems().then(r => r.data.data),
    retry: false
  });

  const createAreaMutation = useMutation({
    mutationFn: apiHelpers.createWorkArea,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      setIsAreaModalOpen(false);
      toast.success('Area created');
    }
  });

  const updateAreaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiHelpers.updateWorkArea(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      setEditingArea(null);
      toast.success('Area updated');
    }
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (id: string) => apiHelpers.deleteWorkArea(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      toast.success('Area deleted');
    }
  });

  const toggleHideMutation = useMutation({
    mutationFn: ({ id, isHidden }: { id: string; isHidden: boolean }) => 
      apiHelpers.updateWorkArea(id, { isHidden }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
    }
  });

  if (loadingAreas) {
    return <LoadingPage />;
  }

  // Build smart focus items
  const buildFocusItems = () => {
    const items: any[] = [];
    
    // Overdue actions first
    if (overdueActions?.length > 0) {
      items.push({
        type: 'overdue',
        priority: 1,
        title: `${overdueActions.length} overdue action${overdueActions.length > 1 ? 's' : ''} need attention`,
        description: overdueActions.slice(0, 2).map((a: any) => a.title).join(', '),
        link: '/actions?overdue=true',
        icon: AlertCircle,
        color: 'danger'
      });
    }

    // Due cadence items (1:1s, retros, etc.)
    if (dueItems?.length > 0) {
      dueItems.slice(0, 2).forEach((item: any, i: number) => {
        items.push({
          type: 'cadence',
          priority: 1.5 + (i * 0.1),
          title: `${item.rule.name} is due`,
          description: `${item.daysOverdue > 0 ? `${item.daysOverdue} days overdue` : 'Due today'} - ${item.targetName}`,
          link: item.rule.type === 'ONE_ON_ONE' && item.rule.employeeId 
            ? `/employees/${item.rule.employeeId}` 
            : '/settings',
          icon: Clock,
          color: item.daysOverdue > 7 ? 'danger' : 'warning'
        });
      });
    }

    // Events without actions (need to mark or create actions)
    const eventsNeedingAction = todayEvents?.filter((e: any) => 
      e.needsAction && (!e.actions || e.actions.length === 0)
    ) || [];
    if (eventsNeedingAction.length > 0) {
      items.push({
        type: 'event',
        priority: 2,
        title: `Review ${eventsNeedingAction.length} meeting${eventsNeedingAction.length > 1 ? 's' : ''} from today`,
        description: 'Create actions or mark as no action needed',
        link: '/events',
        icon: Calendar,
        color: 'warning'
      });
    }

    // AI suggestions from daily briefing
    if (dailyBriefing?.briefing?.suggestions?.length > 0) {
      dailyBriefing.briefing.suggestions.slice(0, 2).forEach((suggestion: any, i: number) => {
        items.push({
          type: 'ai-suggestion',
          priority: 3 + i,
          title: suggestion.title,
          description: suggestion.description,
          icon: Sparkles,
          color: 'primary'
        });
      });
    } else if (focusSuggestions?.length > 0) {
      // Fallback to regular focus suggestions
      focusSuggestions.slice(0, 2).forEach((suggestion: any, i: number) => {
        items.push({
          type: 'suggestion',
          priority: 3 + i,
          title: suggestion.title,
          description: suggestion.description,
          icon: Sparkles,
          color: 'primary'
        });
      });
    }

    // Suggest skill improvement if XP is available
    if (stats && stats.currentXp >= 100) {
      items.push({
        type: 'skill',
        priority: 10,
        title: 'You have XP to spend!',
        description: `${stats.currentXp} XP available - unlock a new skill`,
        link: '/skills',
        icon: Zap,
        color: 'success'
      });
    }

    return items.sort((a, b) => a.priority - b.priority).slice(0, 5);
  };

  const focusItems = buildFocusItems();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const getIconComponent = (iconName: string) => {
    const found = iconOptions.find(i => i.value === iconName);
    return found?.icon || Target;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-text-primary">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Leader'}
          </h1>
          <p className="text-text-secondary mt-1 font-body">
            {formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}
            {((actionStats?.pending || 0) > 0 || (todayEvents?.length || 0) > 0) && (
              <span className="ml-2">
                {actionStats?.pending > 0 && (
                  <span className="text-primary">{actionStats.pending} pending action{actionStats.pending !== 1 ? 's' : ''}</span>
                )}
                {actionStats?.pending > 0 && todayEvents?.length > 0 && ' and '}
                {todayEvents?.length > 0 && (
                  <span className="text-secondary">{todayEvents.length} meeting{todayEvents.length !== 1 ? 's' : ''} today</span>
                )}
              </span>
            )}
          </p>
        </div>
      </motion.div>

      {/* Work Areas */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold tracking-wide uppercase text-text-primary">
            Work Areas
          </h2>
          <div className="flex items-center gap-2">
            {workAreas?.some((a: any) => a.isHidden) && (
              <Button 
                size="sm" 
                variant={showHiddenAreas ? 'secondary' : 'ghost'}
                onClick={() => setShowHiddenAreas(!showHiddenAreas)}
                leftIcon={showHiddenAreas ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              >
                {showHiddenAreas ? 'Showing hidden' : 'Show hidden'}
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={() => setIsAreaModalOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Area
            </Button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          {workAreas?.filter((area: any) => showHiddenAreas || !area.isHidden).map((area: any) => {
            const IconComponent = getIconComponent(area.icon);
            return (
              <Card 
                key={area.id} 
                className={cn(
                  "relative group cursor-pointer border-2 border-transparent hover:border-opacity-50 transition-all",
                  area.isHidden && "opacity-40"
                )}
                style={{ 
                  '--area-color': area.color,
                  borderColor: `${area.color}30`
                } as any}
                onClick={() => navigate(`/actions?workAreaId=${area.id}`)}
              >
                {/* Hidden indicator */}
                {area.isHidden && (
                  <div className="absolute top-3 left-3">
                    <EyeOff className="w-4 h-4 text-text-muted" />
                  </div>
                )}

                {/* Area menu button */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAreaMenuOpen(areaMenuOpen === area.id ? null : area.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-surface"
                  >
                    <MoreVertical className="w-4 h-4 text-text-muted" />
                  </button>
                  
                  {/* Dropdown menu */}
                  <AnimatePresence>
                    {areaMenuOpen === area.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-surface py-1 min-w-[140px] z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            toggleHideMutation.mutate({ id: area.id, isHidden: !area.isHidden });
                            setAreaMenuOpen(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2"
                        >
                          {area.isHidden ? (
                            <><Eye className="w-4 h-4" /> Show</>
                          ) : (
                            <><EyeOff className="w-4 h-4" /> Hide</>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingArea(area);
                            setAreaMenuOpen(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this area? Items will be disconnected.')) {
                              deleteAreaMutation.mutate(area.id);
                            }
                            setAreaMenuOpen(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2 text-danger"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${area.color}20` }}
                  >
                    <IconComponent className="w-6 h-6" style={{ color: area.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-text-primary tracking-wide">
                      {area.name}
                    </h3>
                    {area.description && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                        {area.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Link 
                    to={`/actions?workAreaId=${area.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                  >
                    <p className="font-display text-lg font-bold" style={{ color: area.color }}>
                      {area.pendingActions || 0}
                    </p>
                    <p className="text-xs text-text-muted">Actions</p>
                  </Link>
                  <Link 
                    to={`/employees?workAreaId=${area.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                  >
                    <p className="font-display text-lg font-bold" style={{ color: area.color }}>
                      {area._count?.employees || 0}
                    </p>
                    <p className="text-xs text-text-muted">Team</p>
                  </Link>
                  <Link 
                    to={`/events?workAreaId=${area.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                  >
                    <p className="font-display text-lg font-bold" style={{ color: area.color }}>
                      {area._count?.events || 0}
                    </p>
                    <p className="text-xs text-text-muted">Events</p>
                  </Link>
                </div>

                {/* Overdue indicator */}
                {area.overdueActions > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-danger text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{area.overdueActions} overdue</span>
                  </div>
                )}
              </Card>
            );
          })}

          {/* Empty state / Add new */}
          {(!workAreas || workAreas.length === 0) && (
            <Card 
              className="border-2 border-dashed border-text-muted/30 hover:border-primary/50 cursor-pointer transition-colors col-span-full"
              onClick={() => setIsAreaModalOpen(true)}
            >
              <div className="text-center py-8">
                <Plus className="w-10 h-10 text-text-muted mx-auto mb-2" />
                <p className="text-text-secondary">Create your first work area</p>
                <p className="text-sm text-text-muted mt-1">
                  e.g., Team Lead, Competence Lead, Projects
                </p>
              </div>
            </Card>
          )}
        </div>
      </motion.div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Focus & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Focus */}
          <motion.div variants={itemVariants}>
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <CardTitle className="font-display tracking-wide">TODAY'S FOCUS</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {focusItems.length > 0 ? (
                  <ul className="space-y-3">
                    {focusItems.map((item, i) => {
                      const IconComp = item.icon;
                      return (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-xl transition-colors relative",
                            item.link ? "hover:bg-surface cursor-pointer" : "bg-surface"
                          )}
                          onClick={() => item.link && navigate(item.link)}
                        >
                          {/* Priority indicator */}
                          <span className={cn(
                            "absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full",
                            item.priority === 1 && "bg-danger",
                            item.priority === 2 && "bg-warning",
                            item.priority >= 3 && item.priority <= 5 && "bg-primary",
                            item.priority > 5 && "bg-success"
                          )} />
                          <span className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            item.color === 'danger' && "bg-danger/20 text-danger",
                            item.color === 'warning' && "bg-warning/20 text-warning",
                            item.color === 'success' && "bg-success/20 text-success",
                            item.color === 'primary' && "bg-primary/20 text-primary"
                          )}>
                            <IconComp className="w-4 h-4" />
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-text-primary">{item.title}</p>
                              {item.priority === 1 && (
                                <span className="text-[10px] font-bold uppercase text-danger bg-danger/10 px-1.5 py-0.5 rounded">Urgent</span>
                              )}
                            </div>
                            <p className="text-sm text-text-secondary mt-0.5">{item.description}</p>
                          </div>
                          {item.link && <ChevronRight className="w-5 h-5 text-text-muted" />}
                        </motion.li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-center py-6 text-text-secondary">
                    <CheckSquare className="w-10 h-10 mx-auto mb-2 text-success" />
                    <p>All caught up! Great job.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Actions Requiring Attention */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-danger" />
                    <CardTitle className="font-display tracking-wide">ACTIONS REQUIRING ATTENTION</CardTitle>
                  </div>
                  <Link 
                    to="/actions" 
                    className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {overdueActions && overdueActions.length > 0 ? (
                  <ul className="space-y-2">
                    {overdueActions.slice(0, 5).map((action: any) => {
                      const dueLabel = action.dueDate ? getDueDateLabel(action.dueDate) : null;
                      return (
                        <li 
                          key={action.id}
                          className="flex items-center justify-between p-3 bg-surface rounded-xl hover:bg-surface/80 transition-colors cursor-pointer"
                          onClick={() => navigate('/actions')}
                        >
                          <div className="flex items-center gap-3">
                            <CheckSquare className="w-5 h-5 text-text-muted" />
                            <div>
                              <p className="font-medium text-text-primary">{action.title}</p>
                              {action.employee && (
                                <p className="text-sm text-text-secondary">
                                  {action.employee.name}
                                </p>
                              )}
                            </div>
                          </div>
                          {dueLabel && (
                            <Badge variant={dueLabel.variant as any} size="sm">
                              {dueLabel.text}
                            </Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-text-secondary text-center py-4">
                    No overdue actions. Keep it up!
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card padding="sm">
                <div className="text-center">
                  <CheckSquare className="w-6 h-6 text-success mx-auto mb-2" />
                  <div className="flex items-center justify-center gap-1">
                    <p className="font-display text-2xl font-bold">{actionStats?.completed || 0}</p>
                    {actionStats?.completedThisWeek > 0 && (
                      <span className="flex items-center text-success text-xs">
                        <TrendingUp className="w-3 h-3" />
                        {actionStats.completedThisWeek}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">Completed</p>
                </div>
              </Card>
              <Card padding="sm">
                <div className="text-center">
                  <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold">{actionStats?.inProgress || 0}</p>
                  <p className="text-xs text-text-secondary">In Progress</p>
                </div>
              </Card>
              <Card padding="sm">
                <div className="text-center">
                  <AlertCircle className="w-6 h-6 text-danger mx-auto mb-2" />
                  <div className="flex items-center justify-center gap-1">
                    <p className="font-display text-2xl font-bold text-danger">{actionStats?.overdue || 0}</p>
                    {actionStats?.overdue > 0 && (
                      <TrendingDown className="w-3 h-3 text-danger" />
                    )}
                  </div>
                  <p className="text-xs text-text-secondary">Overdue</p>
                </div>
              </Card>
              <Card padding="sm">
                <div className="text-center">
                  <Calendar className="w-6 h-6 text-secondary mx-auto mb-2" />
                  <p className="font-display text-2xl font-bold">{actionStats?.pending || 0}</p>
                  <p className="text-xs text-text-secondary">Pending</p>
                </div>
              </Card>
            </div>
          </motion.div>
        </div>

        {/* Right column - Proactive Insights */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Proactive Insights (replaced Level box) */}
          <Card className="bg-gradient-ethereal border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle className="font-display tracking-wide">INSIGHTS</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* XP to spend */}
                {stats && stats.currentXp > 0 && (
                  <div className="p-3 bg-white/50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Available XP</span>
                      <span className="font-display font-bold text-primary">{stats.currentXp}</span>
                    </div>
                    {stats.currentXp >= 100 && (
                      <Link to="/skills" className="text-xs text-primary hover:underline mt-1 block">
                        Unlock a skill!
                      </Link>
                    )}
                  </div>
                )}

                {/* Streak */}
                {stats && stats.streak > 0 && (
                  <div className="p-3 bg-white/50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Current Streak</span>
                      <span className="font-display font-bold text-warning">{stats.streak} days</span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Keep completing actions daily!
                    </p>
                  </div>
                )}

                {/* Completion rate this week */}
                {actionStats && (
                  <div className="p-3 bg-white/50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">This Week</span>
                      <span className="font-display font-bold text-success">
                        {actionStats.completedThisWeek || 0} done
                      </span>
                    </div>
                  </div>
                )}

                {/* Next skill suggestion */}
                <Link 
                  to="/skills"
                  className="block p-3 bg-white/50 rounded-xl hover:bg-white/70 transition-colors"
                >
                  <p className="text-sm font-medium text-text-primary">Level up your leadership</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Explore the skill constellation
                  </p>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display tracking-wide">QUICK ACTIONS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link
                  to="/extract"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-primary/10 transition-colors"
                >
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-medium">Extract from Notes</span>
                </Link>
                <Link
                  to="/employees"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-secondary/10 transition-colors"
                >
                  <Users className="w-5 h-5 text-secondary" />
                  <span className="font-medium">View Team</span>
                </Link>
                <Link
                  to="/events"
                  className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-accent/10 transition-colors"
                >
                  <Calendar className="w-5 h-5 text-accent" />
                  <span className="font-medium">Events & Meetings</span>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Team Pulse */}
          <TeamPulse />

          {/* Upcoming People Events */}
          <PeopleEvents />
        </motion.div>
      </div>

      {/* Create/Edit Area Modal */}
      <AreaModal
        isOpen={isAreaModalOpen || !!editingArea}
        onClose={() => {
          setIsAreaModalOpen(false);
          setEditingArea(null);
        }}
        area={editingArea}
        onSubmit={(data) => {
          if (editingArea) {
            updateAreaMutation.mutate({ id: editingArea.id, data });
          } else {
            createAreaMutation.mutate(data);
          }
        }}
        isLoading={createAreaMutation.isPending || updateAreaMutation.isPending}
      />
    </motion.div>
  );
}

function AreaModal({ isOpen, onClose, area, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#D4A574',
    icon: 'target'
  });

  // Reset form when modal opens or area changes
  useEffect(() => {
    if (isOpen) {
      if (area) {
        setFormData({
          name: area.name || '',
          description: area.description || '',
          color: area.color || '#D4A574',
          icon: area.icon || 'target'
        });
      } else {
        setFormData({
          name: '',
          description: '',
          color: '#D4A574',
          icon: 'target'
        });
      }
    }
  }, [isOpen, area]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={area ? 'Edit Work Area' : 'Create Work Area'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Team Lead, Projects, Competence"
          required
        />
        
        <Textarea
          label="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What does this area cover?"
        />

        {/* Color picker */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
          <div className="flex gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({ ...formData, color: color.value })}
                className={cn(
                  "w-8 h-8 rounded-lg transition-all",
                  formData.color === color.value && "ring-2 ring-offset-2 ring-text-primary"
                )}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Icon</label>
          <div className="flex gap-2">
            {iconOptions.map((opt) => {
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: opt.value })}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    formData.icon === opt.value 
                      ? "bg-primary text-white" 
                      : "bg-surface text-text-secondary hover:bg-surface/80"
                  )}
                  title={opt.label}
                >
                  <IconComp className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-surface rounded-xl">
          <p className="text-xs text-text-muted mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${formData.color}20` }}
            >
              {(() => {
                const IconComp = iconOptions.find(i => i.value === formData.icon)?.icon || Target;
                return <IconComp className="w-5 h-5" style={{ color: formData.color }} />;
              })()}
            </div>
            <span className="font-display font-semibold">
              {formData.name || 'Area Name'}
            </span>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {area ? 'Save Changes' : 'Create Area'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
