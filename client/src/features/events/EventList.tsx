import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Plus, Clock, Users } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { formatDate, formatTime, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function EventList() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => apiHelpers.getEvents().then(r => r.data.data)
  });

  const { data: eventTypes } = useQuery({
    queryKey: ['eventTypes'],
    queryFn: () => apiHelpers.getEventTypes().then(r => r.data.data)
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data)
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiHelpers.getTeams().then(r => r.data.data)
  });

  const createMutation = useMutation({
    mutationFn: apiHelpers.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsCreateModalOpen(false);
      toast.success('Event created');
    },
    onError: () => {
      toast.error('Failed to create event');
    }
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-text-primary">Events</h1>
          <p className="text-text-secondary mt-1">
            Manage your meetings, workshops, and 1:1s
          </p>
        </div>
        <Button 
          leftIcon={<Plus className="w-5 h-5" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          New Event
        </Button>
      </div>

      {/* Events List */}
      {events && events.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {events.map((event: any, index: number) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/events/${event.id}`}>
                <Card className="hover:border-primary/30 border-2 border-transparent">
                  <div className="flex items-start gap-4">
                    {/* Event Type Color */}
                    <div 
                      className="w-2 h-full rounded-full flex-shrink-0 self-stretch"
                      style={{ backgroundColor: event.eventType?.color || '#D4A574' }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-text-primary">
                            {event.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(event.startTime)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </span>
                          </div>
                        </div>
                        <Badge 
                          style={{ 
                            backgroundColor: `${event.eventType?.color}20`,
                            color: event.eventType?.color 
                          }}
                        >
                          {event.eventType?.name || 'Event'}
                        </Badge>
                      </div>

                      {/* Participants */}
                      {event.participants?.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          <Users className="w-4 h-4 text-text-muted" />
                          <div className="flex -space-x-2">
                            {event.participants.slice(0, 5).map((p: any) => (
                              <Avatar 
                                key={p.id} 
                                name={p.employee?.name || 'Unknown'} 
                                src={p.employee?.avatarUrl}
                                size="sm" 
                                className="border-2 border-white"
                              />
                            ))}
                            {event.participants.length > 5 && (
                              <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-xs font-medium text-text-secondary border-2 border-white">
                                +{event.participants.length - 5}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actions count */}
                      {event._count?.actions > 0 && (
                        <p className="text-sm text-text-muted mt-2">
                          {event._count.actions} action{event._count.actions > 1 ? 's' : ''} linked
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={<Calendar className="w-8 h-8" />}
          title="No events yet"
          description="Create your first event to start tracking meetings and workshops."
          action={<Button onClick={() => setIsCreateModalOpen(true)}>Create Event</Button>}
        />
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        eventTypes={eventTypes || []}
        employees={employees || []}
        teams={teams || []}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}

// Create Event Modal Component
function CreateEventModal({ isOpen, onClose, eventTypes, employees, teams, onSubmit, isLoading }: {
  isOpen: boolean;
  onClose: () => void;
  eventTypes: any[];
  employees: any[];
  teams: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventTypeId: '',
    teamId: '',
    startTime: '',
    endTime: '',
    location: '',
    participantIds: [] as string[]
  });

  // Calculate default times (next hour, rounded)
  const getDefaultStartTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  };

  const getDefaultEndTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 2, 0, 0, 0);
    return now.toISOString().slice(0, 16);
  };

  // Reset form when modal opens
  useState(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        eventTypeId: eventTypes[0]?.id || '',
        teamId: '',
        startTime: getDefaultStartTime(),
        endTime: getDefaultEndTime(),
        location: '',
        participantIds: []
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      teamId: formData.teamId || null,
      participantIds: formData.participantIds.length > 0 ? formData.participantIds : undefined
    });
  };

  const toggleParticipant = (empId: string) => {
    setFormData(prev => ({
      ...prev,
      participantIds: prev.participantIds.includes(empId)
        ? prev.participantIds.filter(id => id !== empId)
        : [...prev.participantIds, empId]
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Event" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Event Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g. Sprint Planning, Team Retro, 1:1 with John"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Event Type"
            value={formData.eventTypeId}
            onChange={(e) => setFormData({ ...formData, eventTypeId: e.target.value })}
            options={[
              { value: '', label: 'Select type...' },
              ...eventTypes.map((t: any) => ({ value: t.id, label: t.name }))
            ]}
            required
          />
          <Select
            label="Team (optional)"
            value={formData.teamId}
            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
            options={[
              { value: '', label: 'No team' },
              ...teams.map((t: any) => ({ value: t.id, label: t.name }))
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Time"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            required
          />
          <Input
            label="End Time"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            required
          />
        </div>

        <Input
          label="Location (optional)"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g. Meeting Room A, Zoom, Teams"
        />

        <Textarea
          label="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Agenda or notes for the event..."
          rows={3}
        />

        {/* Participants */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Participants
          </label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-auto p-2 bg-surface rounded-xl">
            {employees.length > 0 ? (
              employees.map((emp: any) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => toggleParticipant(emp.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm transition-all",
                    formData.participantIds.includes(emp.id)
                      ? "bg-primary text-white"
                      : "bg-white border border-border hover:border-primary"
                  )}
                >
                  {emp.name}
                </button>
              ))
            ) : (
              <p className="text-sm text-text-muted">No employees available</p>
            )}
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading} disabled={!formData.title || !formData.eventTypeId}>
            Create Event
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

