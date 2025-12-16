import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Plus, Clock, Users } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { formatDate, formatTime, cn } from '@/lib/utils';

export default function EventList() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => apiHelpers.getEvents().then(r => r.data.data)
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
        <Button leftIcon={<Plus className="w-5 h-5" />}>
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
          action={<Button>Create Event</Button>}
        />
      )}
    </div>
  );
}

