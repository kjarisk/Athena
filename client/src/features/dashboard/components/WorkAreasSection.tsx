import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  MoreVertical,
  Target
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { iconOptions } from '../constants';

interface WorkAreasSectionProps {
  workAreas: any[];
  showHiddenAreas: boolean;
  areaMenuOpen: string | null;
  itemVariants: any;
  onAddArea: () => void;
  onEditArea: (area: any) => void;
  onDeleteArea: (id: string) => void;
  onToggleHide: (id: string, isHidden: boolean) => void;
  setShowHiddenAreas: (show: boolean) => void;
  setAreaMenuOpen: (id: string | null) => void;
}

/**
 * Work Areas section with cards showing stats and actions
 */
export function WorkAreasSection({
  workAreas,
  showHiddenAreas,
  areaMenuOpen,
  itemVariants,
  onAddArea,
  onEditArea,
  onDeleteArea,
  onToggleHide,
  setShowHiddenAreas,
  setAreaMenuOpen
}: WorkAreasSectionProps) {
  const navigate = useNavigate();

  const getIconComponent = (iconName: string) => {
    const found = iconOptions.find(i => i.value === iconName);
    return found?.icon || Target;
  };

  return (
    <motion.div variants={itemVariants}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold tracking-wide uppercase text-text-primary">
          Work Areas
        </h2>
        <div className="flex items-center gap-2">
          {workAreas?.some((a: any) => a.isHidden) && (
            <Button 
              size="sm" 
              variant={showHiddenAreas ? 'secondary' : 'ghost'}
              onClick={() => setShowHiddenAreas(!showHiddenAreas)}
              leftIcon={showHiddenAreas ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            >
              {showHiddenAreas ? 'Showing hidden' : 'Show hidden'}
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={onAddArea}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Area
          </Button>
        </div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        {workAreas?.filter((area: any) => showHiddenAreas || !area.isHidden).map((area: any) => {
          const IconComponent = getIconComponent(area.icon);
          return (
            <Card 
              key={area.id} 
              className={cn(
                "relative group cursor-pointer border-2 border-transparent hover:border-opacity-50 transition-all",
                area.isHidden && "opacity-40"
              )}
              style={{ 
                '--area-color': area.color,
                borderColor: `${area.color}30`
              } as any}
              onClick={() => navigate(`/actions?workAreaId=${area.id}`)}
            >
              {/* Hidden indicator */}
              {area.isHidden && (
                <div className="absolute top-3 left-3">
                  <EyeOff className="w-4 h-4 text-text-muted" />
                </div>
              )}

              {/* Area menu button */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAreaMenuOpen(areaMenuOpen === area.id ? null : area.id);
                  }}
                  className="p-1.5 rounded-lg hover:bg-surface"
                >
                  <MoreVertical className="w-4 h-4 text-text-muted" />
                </button>
                
                {/* Dropdown menu */}
                <AnimatePresence>
                  {areaMenuOpen === area.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-8 bg-surface rounded-xl shadow-lg border border-surface py-1 min-w-[140px] z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          onToggleHide(area.id, !area.isHidden);
                          setAreaMenuOpen(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2"
                      >
                        {area.isHidden ? (
                          <><Eye className="w-4 h-4" /> Show</>
                        ) : (
                          <><EyeOff className="w-4 h-4" /> Hide</>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          onEditArea(area);
                          setAreaMenuOpen(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this area? Items will be disconnected.')) {
                            onDeleteArea(area.id);
                          }
                          setAreaMenuOpen(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface flex items-center gap-2 text-danger"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${area.color}20` }}
                >
                  <IconComponent className="w-6 h-6" style={{ color: area.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-text-primary tracking-wide">
                    {area.name}
                  </h3>
                  {area.description && (
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                      {area.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Link 
                  to={`/actions?workAreaId=${area.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                >
                  <p className="font-display text-lg font-bold" style={{ color: area.color }}>
                    {area.pendingActions || 0}
                  </p>
                  <p className="text-xs text-text-muted">Actions</p>
                </Link>
                <Link 
                  to={`/employees?workAreaId=${area.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                >
                  <p className="font-display text-lg font-bold" style={{ color: area.color }}>
                    {area._count?.employees || 0}
                  </p>
                  <p className="text-xs text-text-muted">Team</p>
                </Link>
                <Link 
                  to={`/events?workAreaId=${area.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                >
                  <p className="font-display text-lg font-bold" style={{ color: area.color }}>
                    {area._count?.events || 0}
                  </p>
                  <p className="text-xs text-text-muted">Events</p>
                </Link>
              </div>

              {/* Overdue indicator */}
              {area.overdueActions > 0 && (
                <div className="mt-3 flex items-center gap-2 text-danger text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{area.overdueActions} overdue</span>
                </div>
              )}
            </Card>
          );
        })}

        {/* Empty state */}
        {(!workAreas || workAreas.length === 0) && (
          <Card 
            className="border-2 border-dashed border-text-muted/30 hover:border-primary/50 cursor-pointer transition-colors col-span-full"
            onClick={onAddArea}
          >
            <div className="text-center py-8">
              <Plus className="w-10 h-10 text-text-muted mx-auto mb-2" />
              <p className="text-text-secondary">Create your first work area</p>
              <p className="text-sm text-text-muted mt-1">
                e.g., Team Lead, Competence Lead, Projects
              </p>
            </div>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
