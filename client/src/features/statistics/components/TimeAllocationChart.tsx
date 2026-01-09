/**
 * Time Allocation Chart Component
 * Displays time distribution across work areas as horizontal bars
 */
import { TimeAllocation } from '@/hooks/useStatistics';

// Generate a deterministic color from a string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 55%)`;
}

interface TimeAllocationChartProps {
  allocation: TimeAllocation[];
}

export function TimeAllocationChart({ allocation }: TimeAllocationChartProps) {
  const maxHours = Math.max(...allocation.map(a => a.hours), 1);

  if (allocation.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        No time tracked this week
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allocation
        .sort((a, b) => b.hours - a.hours)
        .map((item) => {
          const barPercentage = (item.hours / maxHours) * 100;
          const color = stringToColor(item.workAreaId);

          return (
            <div key={item.workAreaId} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium text-text-primary">
                    {item.workAreaName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text-primary">
                    {item.hours.toFixed(1)}h
                  </span>
                  <span className="text-xs text-text-secondary">
                    ({item.percentage}%)
                  </span>
                  <span className="text-xs text-text-muted">
                    {item.eventCount} events
                  </span>
                </div>
              </div>
              <div className="h-2 bg-surface rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${barPercentage}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}
