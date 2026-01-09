/**
 * Stat Card Component
 * Displays a single metric with icon, value, and optional trend
 */
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'default' | 'green' | 'red' | 'amber' | 'blue';
  trend?: 'up' | 'down' | 'stable';
  subtitle?: string;
}

export function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color = 'default',
  trend,
  subtitle 
}: StatCardProps) {
  const iconColorClasses = {
    default: 'text-primary bg-primary/10',
    green: 'text-green-600 bg-green-100',
    red: 'text-red-600 bg-red-100',
    amber: 'text-amber-600 bg-amber-100',
    blue: 'text-blue-600 bg-blue-100'
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-text-muted';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${iconColorClasses[color]}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <TrendIcon size={16} className={trendColor} />
        )}
      </div>
      
      <div className="mt-3">
        <p className="text-2xl font-bold text-text-primary">
          {value}
        </p>
        <p className="text-sm text-text-secondary mt-1">
          {label}
        </p>
        {subtitle && (
          <p className="text-xs text-text-muted mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}
