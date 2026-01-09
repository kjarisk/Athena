/**
 * Action Breakdown Chart Component
 * Displays action distribution as horizontal bar chart
 */

interface ActionBreakdownChartProps {
  data: Record<string, number>;
  type: 'team' | 'area' | 'employee';
}

const colorPalette = [
  '#D4A574', // primary
  '#7BA087', // secondary
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
];

export function ActionBreakdownChart({ data, type }: ActionBreakdownChartProps) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const maxValue = Math.max(...entries.map(([, v]) => v), 1);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500 dark:text-stone-400">
        No {type === 'team' ? 'teams' : type === 'area' ? 'areas' : 'employees'} with actions
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.slice(0, 8).map(([name, value], index) => {
        const percentage = (value / maxValue) * 100;
        const percentOfTotal = Math.round((value / total) * 100);
        const color = colorPalette[index % colorPalette.length];

        return (
          <div key={name} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300 truncate max-w-[60%]">
                {name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  {value}
                </span>
                <span className="text-xs text-stone-500">
                  ({percentOfTotal}%)
                </span>
              </div>
            </div>
            <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: color
                }}
              />
            </div>
          </div>
        );
      })}
      
      {entries.length > 8 && (
        <p className="text-xs text-stone-500 dark:text-stone-400 text-center pt-2">
          +{entries.length - 8} more {type === 'team' ? 'teams' : type === 'area' ? 'areas' : 'employees'}
        </p>
      )}
    </div>
  );
}
