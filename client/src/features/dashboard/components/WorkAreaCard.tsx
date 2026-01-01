import { motion } from 'framer-motion';
import { Eye, EyeOff, MoreVertical, TrendingUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { iconOptions } from '../constants';
import { Target } from 'lucide-react';

interface WorkAreaCardProps {
  area: any;
  itemVariants: any;
  isHidden?: boolean;
  isFocused?: boolean;
  onFocus?: (id: string) => void;
  onEdit?: (area: any) => void;
  onToggleHide?: (id: string, isHidden: boolean) => void;
  onDelete?: (id: string) => void;
}

/**
 * Individual work area card showing stats and actions
 */
export function WorkAreaCard({
  area,
  itemVariants,
  isHidden,
  isFocused,
  onFocus,
  onEdit,
  onToggleHide,
  onDelete
}: WorkAreaCardProps) {
  const IconComponent = iconOptions.find(i => i.value === area.icon)?.icon || Target;
  const pendingCount = area._count?.actions || 0;
  const recentCompletions = area._count?.recentCompletions || 0;

  return (
    <motion.div variants={itemVariants}>
      <Card
        className={`cursor-pointer transition-all hover:shadow-xl border-2 ${
          isFocused 
            ? 'border-primary shadow-lg' 
            : 'border-transparent'
        } ${isHidden ? 'opacity-50' : ''}`}
        onClick={() => onFocus?.(area.id)}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div 
              className="rounded-lg p-3 inline-flex" 
              style={{ backgroundColor: area.color + '20' }}
            >
              <IconComponent 
                className="h-6 w-6" 
                style={{ color: area.color }} 
              />
            </div>
            <div className="relative group" onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              <div className="absolute right-0 mt-2 w-48 bg-background-secondary border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(area);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-background-tertiary text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleHide?.(area.id, !isHidden);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-background-tertiary text-sm flex items-center gap-2"
                >
                  {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {isHidden ? 'Show' : 'Hide'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${area.name}"?`)) {
                      onDelete?.(area.id);
                    }
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-background-tertiary text-sm text-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <h3 className="font-display text-xl font-semibold mb-2">
            {area.name}
          </h3>
          {area.description && (
            <p className="text-text-secondary text-sm mb-4">
              {area.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-2xl font-bold" style={{ color: area.color }}>
                  {pendingCount}
                </div>
                <div className="text-xs text-text-secondary">pending</div>
              </div>
              {recentCompletions > 0 && (
                <div className="flex items-center gap-1 text-success text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>{recentCompletions} done</span>
                </div>
              )}
            </div>
            {isFocused && (
              <div className="text-xs font-medium text-primary">
                Focused
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
