import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, Users, FileText } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { formatDate, formatTime, formatStatus } from '@/lib/utils';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => apiHelpers.getEvent(id!).then(r => r.data.data)
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!event) {
    return <div>Event not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button 
          onClick={() => navigate('/events')}
          className="p-2 rounded-lg hover:bg-surface transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <Badge 
                className="mb-2"
                style={{ 
                  backgroundColor: `${event.eventType?.color}20`,
                  color: event.eventType?.color 
                }}
              >
                {event.eventType?.name || 'Event'}
              </Badge>
              <h1 className="font-display text-2xl font-semibold text-text-primary">
                {event.title}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-text-secondary">
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
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Description */}
          {event.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary whitespace-pre-wrap">
                  {event.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Raw Notes */}
          {event.rawNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-surface rounded-xl">
                  <pre className="text-sm text-text-primary whitespace-pre-wrap font-body">
                    {event.rawNotes}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Actions from this Event</CardTitle>
                <Button size="sm" variant="ghost">Extract Actions</Button>
              </div>
            </CardHeader>
            <CardContent>
              {event.actions?.length > 0 ? (
                <ul className="space-y-2">
                  {event.actions.map((action: any) => (
                    <li key={action.id} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                      <div>
                        <p className="font-medium text-text-primary">{action.title}</p>
                        {action.employee && (
                          <p className="text-sm text-text-secondary">{action.employee.name}</p>
                        )}
                      </div>
                      <Badge variant={action.status === 'COMPLETED' ? 'success' : 'default'}>
                        {formatStatus(action.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted text-center py-4">
                  No actions created from this event yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Participants */}
          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
            </CardHeader>
            <CardContent>
              {event.participants?.length > 0 ? (
                <ul className="space-y-3">
                  {event.participants.map((p: any) => (
                    <li key={p.id} className="flex items-center gap-3">
                      <Avatar 
                        name={p.employee?.name || 'Unknown'} 
                        src={p.employee?.avatarUrl}
                        size="sm" 
                      />
                      <div>
                        <p className="font-medium text-text-primary text-sm">
                          {p.employee?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-text-muted">{p.role}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted text-sm">No participants</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

