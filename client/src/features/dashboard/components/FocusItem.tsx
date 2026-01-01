import { motion } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';

interface FocusItemProps {
  item: any;
  itemVariants: any;
  onDismiss: (type: string, id: string) => void;
}

/**
 * Individual focus item with icon, description, and action buttons
 * Supports dismissing and navigating to related content
 */
export function FocusItem({ item, itemVariants, onDismiss }: FocusItemProps) {
  const navigate = useNavigate();
  const IconComponent = item.icon;

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      danger: 'bg-danger/10 text-danger border-danger/20',
      warning: 'bg-warning/10 text-warning border-warning/20',
      success: 'bg-success/10 text-success border-success/20',
      primary: 'bg-primary/10 text-primary border-primary/20',
      secondary: 'bg-secondary/10 text-secondary border-secondary/20',
    };
    return colorMap[color] || colorMap.primary;
  };

  return (
    <motion.div
      variants={itemVariants}
      className={`border rounded-lg p-4 ${getColorClasses(item.color)} 
        hover:shadow-md transition-all cursor-pointer group`}
      onClick={() => item.link && navigate(item.link)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <IconComponent className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1 leading-tight">
                {item.title}
              </h4>
              <p className="text-xs opacity-80 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {item.actions?.includes('dismiss') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onDismiss(item.type, item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
              {item.link && (
                <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
