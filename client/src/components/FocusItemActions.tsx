import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreVertical,
  X,
  CheckCircle,
  Clock,
  Calendar,
  Plus,
  AlertCircleIcon,
  ChevronRight
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import toast from 'react-hot-toast';
import ActionModal from './ActionModal';

interface FocusItemActionsProps {
  item: any;
  onNavigate?: () => void;
}

export default function FocusItemActions({ item, onNavigate }: FocusItemActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const queryClient = useQueryClient();

  // Mutation for creating events
  const createEventMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dueItems'] });
      toast.success('Event created');
      setMenuOpen(false);
    }
  });

  // Mutation for updating events
  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiHelpers.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setMenuOpen(false);
    }
  });

  // Mutation for creating actions
  const createActionMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.createAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actionStats'] });
      toast.success('Action created');
      setMenuOpen(false);
    }
  });

  const handleDismiss = () => {
    const dismissed = JSON.parse(localStorage.getItem('dismissedSuggestions') || '[]');
    dismissed.push({ type: item.type, id: item.id, timestamp: Date.now() });
    localStorage.setItem('dismissedSuggestions', JSON.stringify(dismissed));
    
    // Invalidate queries to refresh focus items
    queryClient.invalidateQueries({ queryKey: ['dueItems'] });
    queryClient.invalidateQueries({ queryKey: ['focusSuggestions'] });
    queryClient.invalidateQueries({ queryKey: ['dailyBriefing'] });
    
    toast.success('Item dismissed');
    setMenuOpen(false);
  };

  const handleComplete = () => {
    if (item.type === 'cadence') {
      // Mark cadence as completed by creating an event or updating last completion
      toast('Creating event for cadence...', { icon: '⏱️' });
      // This would create an event marking the cadence complete
    }
    setMenuOpen(false);
  };

  const handleSnooze = (days: number) => {
    if (item.type === 'cadence') {
      toast(`Snoozed for ${days} day${days > 1 ? 's' : ''}`, { icon: '💤' });
      // In a real implementation, this would update the cadence rule or create a snooze record
      handleDismiss(); // For now, just dismiss it
    }
    setMenuOpen(false);
  };

  const handleMarkNoAction = () => {
    // Mark events as needsAction = false
    const eventIds = item.id.split(',');
    Promise.all(eventIds.map((id: string) => 
      updateEventMutation.mutateAsync({ id, data: { needsAction: false } })
    )).then(() => {
      toast.success('Events marked as no action needed');
      queryClient.invalidateQueries({ queryKey: ['events'] });
    });
  };

  const handleCreateEvent = () => {
    // Create an event for the cadence item
    const startTime = new Date();
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(11, 0, 0, 0);

    createEventMutation.mutate({
      title: item.title,
      eventTypeId: '1', // Default event type - should be improved
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    });
  };

  const handleQuickAdd = () => {
    // Open modal with pre-filled data
    setShowActionModal(true);
    setMenuOpen(false);
  };

  if (!item.actionable || !item.actions || item.actions.length === 0) {
    return null;
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-1.5 hover:bg-surface rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-text-muted" />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-surface z-20 overflow-hidden"
            >
              {item.actions.includes('complete') && (
                <button
                  onClick={handleComplete}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Complete
                </button>
              )}
              
              {item.actions.includes('snooze') && (
                <>
                  <button
                    onClick={() => handleSnooze(1)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Snooze 1 day
                  </button>
                  <button
                    onClick={() => handleSnooze(3)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Snooze 3 days
                  </button>
                  <button
                    onClick={() => handleSnooze(7)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    Snooze 1 week
                  </button>
                </>
              )}
              
              {item.actions.includes('mark-no-action') && (
                <button
                  onClick={handleMarkNoAction}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                  disabled={updateEventMutation.isPending}
                >
                  <AlertCircleIcon className="w-4 h-4" />
                  No Action Needed
                </button>
              )}
              
              {item.actions.includes('create-event') && (
                <button
                  onClick={handleCreateEvent}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                  disabled={createEventMutation.isPending}
                >
                  <Calendar className="w-4 h-4" />
                  Create Event
                </button>
              )}
              
              {item.actions.includes('quick-add') && (
                <button
                  onClick={handleQuickAdd}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                  disabled={createActionMutation.isPending}
                >
                  <Plus className="w-4 h-4" />
                  Create Action
                </button>
              )}
              
              {item.actions.includes('navigate') && onNavigate && (
                <button
                  onClick={onNavigate}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  View Details
                </button>
              )}
              
              {item.actions.includes('dismiss') && (
                <button
                  onClick={handleDismiss}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface transition-colors flex items-center gap-2 text-text-muted border-t border-surface"
                >
                  <X className="w-4 h-4" />
                  Dismiss
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Action Modal */}
      <ActionModal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        defaults={{
          title: item.title,
          description: item.description
        }}
      />
    </div>
  );
}
