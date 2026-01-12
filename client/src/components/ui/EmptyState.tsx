import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  variant?: 'default' | 'minimal' | 'card';
  size?: 'sm' | 'md' | 'lg';
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
  size = 'md'
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-6 px-3',
      icon: 'w-10 h-10',
      title: 'text-sm',
      description: 'text-xs'
    },
    md: {
      container: 'py-12 px-4',
      icon: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-sm'
    },
    lg: {
      container: 'py-16 px-6',
      icon: 'w-20 h-20',
      title: 'text-xl',
      description: 'text-base'
    }
  };

  const sizes = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        variant === 'card' && 'bg-surface rounded-2xl border border-surface shadow-sm',
        className
      )}
    >
      {/* Decorative background for larger sizes */}
      {size === 'lg' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary/10 rounded-full blur-3xl" />
        </div>
      )}
      
      <motion.div 
        className={cn(
          'rounded-2xl bg-gradient-ethereal flex items-center justify-center text-text-muted mb-4 relative',
          sizes.icon,
          'border border-surface'
        )}
        whileHover={{ scale: 1.05, rotate: 5 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {icon}
      </motion.div>
      
      <h3 className={cn(
        'font-display font-semibold text-text-primary mb-2',
        sizes.title
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          'text-text-secondary max-w-sm',
          action ? 'mb-6' : 'mb-0',
          sizes.description
        )}>
          {description}
        </p>
      )}
      
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
}

