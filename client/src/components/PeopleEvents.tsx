import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Gift, Award, ChevronRight, Calendar } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';

interface PeopleEventsProps {
  className?: string;
}

export default function PeopleEvents({ className }: PeopleEventsProps) {
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data)
  });

  // Calculate upcoming events
  const getUpcomingEvents = () => {
    if (!employees) return [];

    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const events: any[] = [];

    employees.forEach((employee: any) => {
      if (employee.status !== 'ACTIVE') return;

      // Birthday
      if (employee.birthday) {
        const birthday = new Date(employee.birthday);
        const thisYearBirthday = new Date(
          now.getFullYear(),
          birthday.getMonth(),
          birthday.getDate()
        );

        // If birthday has passed this year, check next year
        if (thisYearBirthday < now) {
          thisYearBirthday.setFullYear(now.getFullYear() + 1);
        }

        if (thisYearBirthday <= twoWeeksFromNow) {
          const daysUntil = Math.ceil(
            (thisYearBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          events.push({
            type: 'birthday',
            employee,
            date: thisYearBirthday,
            daysUntil,
            icon: Gift,
            color: 'text-accent'
          });
        }
      }

      // Work anniversary
      if (employee.startDate) {
        const startDate = new Date(employee.startDate);
        const years = now.getFullYear() - startDate.getFullYear();
        const thisYearAnniversary = new Date(
          now.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        );

        // If anniversary has passed this year, check next year
        if (thisYearAnniversary < now) {
          thisYearAnniversary.setFullYear(now.getFullYear() + 1);
        }

        if (thisYearAnniversary <= twoWeeksFromNow) {
          const daysUntil = Math.ceil(
            (thisYearAnniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          const yearsAtCompany = thisYearAnniversary.getFullYear() - startDate.getFullYear();
          
          // Only show if at least 1 year
          if (yearsAtCompany >= 1) {
            events.push({
              type: 'anniversary',
              employee,
              date: thisYearAnniversary,
              daysUntil,
              years: yearsAtCompany,
              icon: Award,
              color: 'text-primary'
            });
          }
        }
      }
    });

    // Sort by days until event
    return events.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5);
  };

  const upcomingEvents = getUpcomingEvents();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-surface rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent" />
          <CardTitle className="font-display tracking-wide">UPCOMING</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((event, i) => {
              const IconComp = event.icon;
              return (
                <Link
                  key={`${event.type}-${event.employee.id}`}
                  to={`/employees/${event.employee.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface transition-colors group"
                >
                  <div className="relative">
                    <Avatar
                      src={event.employee.avatarUrl}
                      alt={event.employee.name}
                      fallback={event.employee.name.charAt(0)}
                      size="sm"
                    />
                    <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center ${event.color}`}>
                      <IconComp className="w-3 h-3" />
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary text-sm">
                      {event.employee.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {event.type === 'birthday' && 'Birthday'}
                      {event.type === 'anniversary' && `${event.years} year${event.years !== 1 ? 's' : ''} work anniversary`}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    event.daysUntil === 0
                      ? 'bg-accent/20 text-accent'
                      : event.daysUntil <= 3
                      ? 'bg-warning/10 text-warning'
                      : 'bg-surface text-text-secondary'
                  }`}>
                    {event.daysUntil === 0
                      ? 'Today!'
                      : event.daysUntil === 1
                      ? 'Tomorrow'
                      : `In ${event.daysUntil} days`}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-text-muted">
            <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No upcoming events</p>
            <p className="text-xs mt-1">Add birthdays to employee profiles</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
