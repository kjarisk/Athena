/**
 * Trend Indicator Component
 * Shows up/down/stable trend with icon
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function TrendIndicator({ trend, size = 'md', showLabel = false }: TrendIndicatorProps) {
  const sizeClasses = {
    sm: 14,
    md: 18,
    lg: 24
  };

  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  
  const colorClass = trend === 'up' 
    ? 'text-green-500' 
    : trend === 'down' 
      ? 'text-red-500' 
      : 'text-stone-400';

  const label = trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable';

  return (
    <div className={`inline-flex items-center gap-1 ${colorClass}`}>
      <Icon size={sizeClasses[size]} />
      {showLabel && (
        <span className="text-sm">{label}</span>
      )}
    </div>
  );
}
