import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, MessageSquare, AlertTriangle, ChevronRight } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

interface TeamPulseProps {
  className?: string;
}

export default function TeamPulse({ className }: TeamPulseProps) {
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data)
  });

  const { data: cadenceRules } = useQuery({
    queryKey: ['cadenceRules'],
    queryFn: () => apiHelpers.getCadenceRules().then(r => r.data.data)
  });

  // Calculate days since last 1:1 for each employee
  const getEmployeePulse = (employee: any) => {
    const lastOneOnOne = employee.oneOnOnes?.[0];
    if (!lastOneOnOne) {
      return { daysSince: 999, status: 'overdue' as const, mood: null };
    }

    const daysSince = Math.floor(
      (Date.now() - new Date(lastOneOnOne.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Get the cadence rule for 1:1s (default 14 days if not set)
    const oneOnOneRule = cadenceRules?.find(
      (r: any) => r.type === 'ONE_ON_ONE' && 
      (r.targetType === 'GLOBAL' || (r.targetType === 'EMPLOYEE' && r.employeeId === employee.id))
    );
    const frequencyDays = oneOnOneRule?.frequencyDays || 14;

    let status: 'good' | 'upcoming' | 'overdue';
    if (daysSince <= frequencyDays * 0.5) {
      status = 'good';
    } else if (daysSince <= frequencyDays) {
      status = 'upcoming';
    } else {
      status = 'overdue';
    }

    return { daysSince, status, mood: lastOneOnOne.mood };
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-surface rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show active employees
  const activeEmployees = (employees || [])
    .filter((e: any) => e.status === 'ACTIVE')
    .map((e: any) => ({ ...e, pulse: getEmployeePulse(e) }))
    .sort((a: any, b: any) => b.pulse.daysSince - a.pulse.daysSince)
    .slice(0, 5);

  const overdueCount = activeEmployees.filter((e: any) => e.pulse.status === 'overdue').length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-secondary" />
            <CardTitle className="font-display tracking-wide">TEAM PULSE</CardTitle>
          </div>
          {overdueCount > 0 && (
            <span className="text-xs font-medium text-danger bg-danger/10 px-2 py-1 rounded-full">
              {overdueCount} overdue
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {activeEmployees.length > 0 ? (
          <div className="space-y-3">
            {activeEmployees.map((employee: any) => (
              <Link
                key={employee.id}
                to={`/employees/${employee.id}`}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-surface transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={employee.avatarUrl}
                    alt={employee.name}
                    fallback={employee.name.charAt(0)}
                    size="sm"
                  />
                  <div>
                    <p className="font-medium text-text-primary text-sm">{employee.name}</p>
                    <p className="text-xs text-text-muted">{employee.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mood indicator if available */}
                  {employee.pulse.mood && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(level => (
                        <div
                          key={level}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            level <= employee.pulse.mood ? "bg-primary" : "bg-surface"
                          )}
                        />
                      ))}
                    </div>
                  )}
                  {/* Days since 1:1 */}
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      employee.pulse.status === 'good' && "bg-success/10 text-success",
                      employee.pulse.status === 'upcoming' && "bg-warning/10 text-warning",
                      employee.pulse.status === 'overdue' && "bg-danger/10 text-danger"
                    )}
                  >
                    {employee.pulse.daysSince === 999
                      ? 'No 1:1'
                      : employee.pulse.daysSince === 0
                      ? 'Today'
                      : employee.pulse.daysSince === 1
                      ? 'Yesterday'
                      : `${employee.pulse.daysSince}d ago`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-text-muted">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No team members yet</p>
          </div>
        )}

        {employees && employees.length > 5 && (
          <Link
            to="/employees"
            className="flex items-center justify-center gap-1 text-sm text-primary hover:underline mt-4 pt-3 border-t border-surface"
          >
            View all {employees.length} team members
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
