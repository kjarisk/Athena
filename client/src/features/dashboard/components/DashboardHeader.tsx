import { motion } from 'framer-motion';
import { formatDate } from '@/lib/utils';
import { getGreeting } from '../constants';

interface DashboardHeaderProps {
  userName?: string;
  actionStats?: { pending: number };
  todayEvents?: any[];
  itemVariants: any;
}

/**
 * Dashboard header with greeting, date, and stats summary
 */
export function DashboardHeader({ 
  userName, 
  actionStats, 
  todayEvents, 
  itemVariants 
}: DashboardHeaderProps) {
  const firstName = userName?.split(' ')[0] || 'Leader';
  const pendingCount = actionStats?.pending || 0;
  const eventCount = todayEvents?.length || 0;

  return (
    <motion.div variants={itemVariants} className="flex items-center justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-wider text-text-primary">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-text-secondary mt-1 font-body">
          {formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}
          {(pendingCount > 0 || eventCount > 0) && (
            <span className="ml-2">
              {pendingCount > 0 && (
                <span className="text-primary">
                  {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}
                </span>
              )}
              {pendingCount > 0 && eventCount > 0 && ' and '}
              {eventCount > 0 && (
                <span className="text-secondary">
                  {eventCount} meeting{eventCount !== 1 ? 's' : ''} today
                </span>
              )}
            </span>
          )}
        </p>
      </div>
    </motion.div>
  );
}
