import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Users,
  Target,
  Calendar,
  Briefcase,
  MoreVertical,
  Plus,
  ExternalLink,
  CheckSquare
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { apiHelpers } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DueItem {
  rule: {
    id: string;
    type: string;
    name: string;
    targetType: string;
    employee?: { id: string; name: string };
    team?: { id: string; name: string };
    workArea?: { id: string; name: string };
  };
  daysOverdue: number;
  message: string;
}

interface LeadershipCadenceProps {
  dueItems?: DueItem[];
}

const cadenceTypeIcons: Record<string, any> = {
  ONE_ON_ONE: Users,
  RETRO: Target,
  SOCIAL: Calendar,
  CAREER_CHAT: Briefcase,
  TEAM_MEETING: Users,
  CUSTOM: Clock,
};

const cadenceTypeColors: Record<string, string> = {
  ONE_ON_ONE: 'text-primary',
  RETRO: 'text-secondary',
  SOCIAL: 'text-warning',
  CAREER_CHAT: 'text-accent',
  TEAM_MEETING: 'text-primary',
  CUSTOM: 'text-text-secondary',
};

export default function LeadershipCadence({ dueItems = [] }: LeadershipCadenceProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Fetch event types for mapping
  const { data: eventTypes } = useQuery({
    queryKey: ['eventTypes'],
    queryFn: () => apiHelpers.getEventTypes().then(r => r.data.data)
  });

  // Filter to only show TEAM, WORK_AREA, and GLOBAL target types (exclude EMPLOYEE)
  const visibleItems = dueItems
    .filter(item => ['TEAM', 'WORK_AREA', 'GLOBAL'].includes(item.rule.targetType))
    .slice(0, 5);

  const createEventMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dueItems'] });
      toast.success('Event created');
    },
    onError: () => {
      toast.error('Failed to create event');
    }
  });

  const createActionMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.createAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actionStats'] });
      toast.success('Action created');
    },
    onError: () => {
      toast.error('Failed to create action');
    }
  });

  const getUrgencyBadge = (daysOverdue: number) => {
    if (daysOverdue > 7) {
      return <Badge variant="danger" size="sm">Overdue {daysOverdue}d</Badge>;
    } else if (daysOverdue > 0) {
      return <Badge variant="warning" size="sm">Due {daysOverdue}d ago</Badge>;
    } else if (daysOverdue > -7) {
      return <Badge variant="success" size="sm">Due in {Math.abs(daysOverdue)}d</Badge>;
    }
    return <Badge variant="default" size="sm">Upcoming</Badge>;
  };

  const handleCreateEvent = (item: DueItem) => {
    const startTime = new Date();
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(11, 0, 0, 0);

    // Find the appropriate event type
    const eventType = eventTypes?.find((et: any) => {
      // Map cadence types to event categories
      const categoryMap: Record<string, string> = {
        'ONE_ON_ONE': 'ONE_ON_ONE',
        'RETRO': 'REVIEW',
        'TEAM_MEETING': 'TEAM_MEETING',
        'SOCIAL': 'OTHER',
        'CAREER_CHAT': 'ONE_ON_ONE',
        'CUSTOM': 'OTHER',
      };
      return et.category === categoryMap[item.rule.type];
    });

    createEventMutation.mutate({
      title: item.rule.name,
      eventTypeId: eventType?.id || eventTypes?.[0]?.id, // Fallback to first event type
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      teamId: item.rule.team?.id,
      workAreaId: item.rule.workArea?.id,
    });
    setOpenMenuId(null);
  };

  const handleCreateAction = (item: DueItem) => {
    createActionMutation.mutate({
      title: `Schedule: ${item.rule.name}`,
      priority: item.daysOverdue > 0 ? 'HIGH' : 'MEDIUM',
      teamId: item.rule.team?.id,
      workAreaId: item.rule.workArea?.id,
    });
    setOpenMenuId(null);
  };

  const handleNavigate = (item: DueItem) => {
    if (item.rule.team?.id) {
      navigate(`/teams/${item.rule.team.id}`);
    } else if (item.rule.workArea?.id) {
      // Navigate to dashboard filtered by work area, or to settings
      navigate('/');
    } else {
      navigate('/settings#playbook');
    }
    setOpenMenuId(null);
  };

  if (visibleItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-success" />
            <CardTitle className="font-display tracking-wide">LEADERSHIP CADENCE</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<CheckSquare className="w-8 h-8" />}
            title="All up to date"
            description="No cadence items due"
          />
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings#playbook')}
            >
              Manage Cadences
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />
            <CardTitle className="font-display tracking-wide">LEADERSHIP CADENCE</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings#playbook')}
          >
            Manage
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const Icon = cadenceTypeIcons[item.rule.type] || Clock;
            const colorClass = cadenceTypeColors[item.rule.type] || 'text-text-secondary';
            
            return (
              <motion.div
                key={item.rule.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  item.daysOverdue > 7 ? "bg-danger/5 border-danger/20" :
                  item.daysOverdue > 0 ? "bg-warning/5 border-warning/20" :
                  "bg-surface border-surface hover:border-primary/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", colorClass)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-text-primary truncate">
                          {item.rule.name}
                        </h4>
                        {getUrgencyBadge(item.daysOverdue)}
                      </div>
                      <div className="space-y-1">
                        {item.rule.team && (
                          <p className="text-xs text-text-secondary flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {item.rule.team.name}
                          </p>
                        )}
                        {item.rule.workArea && (
                          <p className="text-xs text-text-secondary flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {item.rule.workArea.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === item.rule.id ? null : item.rule.id)}
                      className="p-1 hover:bg-surface rounded transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-text-secondary" />
                    </button>

                    <AnimatePresence>
                      {openMenuId === item.rule.id && (
                        <>
                          {/* Backdrop */}
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          />
                          
                          {/* Menu */}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-surface z-20 overflow-hidden"
                          >
                            <button
                              onClick={() => handleCreateEvent(item)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                              disabled={createEventMutation.isPending}
                            >
                              <Calendar className="w-4 h-4" />
                              Create Event
                            </button>
                            <button
                              onClick={() => handleCreateAction(item)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                              disabled={createActionMutation.isPending}
                            >
                              <Plus className="w-4 h-4" />
                              Create Action
                            </button>
                            <button
                              onClick={() => handleNavigate(item)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Details
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
