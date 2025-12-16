import { forwardRef, HTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: 'default' | 'glow' | 'teamlead' | 'competence' | 'manager';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  className,
  variant = 'default',
  hover = true,
  padding = 'md',
  children,
  ...props
}, ref) => {
  const variants = {
    default: 'bg-white shadow-card',
    glow: 'bg-white shadow-card card-glow',
    teamlead: 'bg-white border-2 border-teamlead/30 hover:border-teamlead hover:shadow-glow-green',
    competence: 'bg-white border-2 border-competence/30 hover:border-competence hover:shadow-glow',
    manager: 'bg-white border-2 border-manager/30 hover:border-manager hover:shadow-[0_0_20px_rgba(232,184,109,0.4)]'
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  return (
    <motion.div
      ref={ref}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={cn(
        'rounded-2xl transition-all duration-300',
        variants[variant],
        hover && 'hover:shadow-card-hover',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
});

Card.displayName = 'Card';

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('font-display text-xl font-semibold text-text-primary', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-text-secondary mt-1', className)} {...props} />
);

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-4 pt-4 border-t border-surface', className)} {...props} />
);

export default Card;

