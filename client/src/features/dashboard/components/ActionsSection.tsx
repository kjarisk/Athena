import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  AlertCircle, 
  ChevronRight, 
  CheckSquare, 
  Check, 
  Clock, 
  Edit2, 
  ListPlus, 
  ChevronDown,
  User,
  Users
} from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { getDueDateLabel } from '@/lib/utils';

interface ActionsSectionProps {
  filteredActions: any[];
  filteredOverdueActions: any[];
  recentlyCompletedActions: any[];
  itemVariants: any;
  expandedActions: Set<string>;
  showRecentlyCompleted: boolean;
  updateActionMutationPending: boolean;
  onCompleteAction: (action: any) => void;
  onUncompleteAction: (action: any) => void;
  onPostponeAction: (actionId: string, days: number) => void;
  onEditAction: (action: any) => void;
  onAddSubtask: (action: any) => void;
  onToggleExpandAction: (actionId: string) => void;
  setShowRecentlyCompleted: (show: boolean) => void;
}

/**
 * Actions Requiring Attention section
 * Shows categorized actions with complete/edit/postpone functionality
 */
export function ActionsSection({
  filteredActions,
  filteredOverdueActions,
  recentlyCompletedActions,
  itemVariants,
  expandedActions,
  showRecentlyCompleted,
  updateActionMutationPending,
  onCompleteAction,
  onUncompleteAction,
  onPostponeAction,
  onEditAction,
  onAddSubtask,
  onToggleExpandAction,
  setShowRecentlyCompleted
}: ActionsSectionProps) {
  // Build categorized actions list
  const categoryItems: any[] = [];
  
  // 1. Overdue actions
  if (filteredOverdueActions && filteredOverdueActions.length > 0) {
    filteredOverdueActions.slice(0, 3).forEach((action: any) => {
      categoryItems.push({
        ...action,
        category: 'overdue',
        categoryLabel: 'Overdue',
        categoryColor: 'danger'
      });
    });
  }
  
  // 2. Actions due in 1-3 days
  const soonDueActions = filteredActions?.filter((a: any) => {
    if (!a.dueDate || a.status === 'COMPLETED' || a.status === 'CANCELLED') return false;
    const daysUntil = Math.ceil((new Date(a.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 3;
  }).slice(0, 3) || [];
  
  soonDueActions.forEach((action: any) => {
    if (!categoryItems.find(i => i.id === action.id)) {
      categoryItems.push({
        ...action,
        category: 'due-soon',
        categoryLabel: 'Due Soon',
        categoryColor: 'warning'
      });
    }
  });
  
  // 3. Actions with incomplete subtasks (20-40% remaining)
  const actionsWithSubtasks = filteredActions?.filter((a: any) => {
    if (!a.subtasks || a.subtasks.length === 0) return false;
    if (a.status === 'COMPLETED' || a.status === 'CANCELLED') return false;
    
    const completedCount = a.subtasks.filter((s: any) => s.status === 'COMPLETED').length;
    const totalCount = a.subtasks.length;
    const completionRatio = completedCount / totalCount;
    const remainingRatio = 1 - completionRatio;
    
    const isInRange = remainingRatio >= 0.2 && remainingRatio <= 0.4;
    if (!isInRange) return false;
    
    if (!a.dueDate) return false;
    const daysUntil = Math.ceil((new Date(a.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 3;
  }).slice(0, 2) || [];
  
  actionsWithSubtasks.forEach((action: any) => {
    if (!categoryItems.find(i => i.id === action.id)) {
      const completedCount = action.subtasks.filter((s: any) => s.status === 'COMPLETED').length;
      categoryItems.push({
        ...action,
        category: 'subtasks',
        categoryLabel: `${completedCount}/${action.subtasks.length} subtasks done`,
        categoryColor: 'primary'
      });
    }
  });
  
  const displayItems = categoryItems.slice(0, 5);

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-danger" />
              <CardTitle className="font-display tracking-wide">ACTIONS REQUIRING ATTENTION</CardTitle>
            </div>
            <Link 
              to="/actions" 
              className="text-sm text-primary font-medium hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {displayItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="w-12 h-12 text-success mx-auto mb-3 opacity-50" />
              <p className="text-text-primary font-medium mb-1">All caught up! 🎉</p>
              <p className="text-text-secondary text-sm">No actions require immediate attention</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {displayItems.map((action: any) => {
                const dueLabel = action.dueDate ? getDueDateLabel(action.dueDate) : null;
                const isExpanded = expandedActions.has(action.id);
                const hasSubtasks = action.subtasks && action.subtasks.length > 0;
                
                return (
                  <li 
                    key={action.id}
                    className="p-3 bg-surface rounded-xl border border-border hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* Complete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompleteAction(action);
                        }}
                        className="mt-0.5 p-1.5 hover:bg-success/20 rounded-lg transition-all flex-shrink-0 group border-2 border-transparent hover:border-success/30"
                        disabled={updateActionMutationPending}
                        title="Complete action"
                      >
                        <Check className="w-5 h-5 text-success group-hover:scale-110 transition-transform" />
                      </button>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary">{action.title}</p>
                            
                            {/* Badges */}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {action.assignedTo && (
                                <Badge variant="secondary" size="sm" className="text-[10px]">
                                  <User className="w-3 h-3 mr-1" />
                                  {action.assignedTo.name}
                                </Badge>
                              )}
                              
                              {action.workArea && (
                                <Badge 
                                  variant="secondary" 
                                  size="sm" 
                                  className="text-[10px]"
                                  style={{ 
                                    backgroundColor: `${action.workArea.color}20`,
                                    borderColor: action.workArea.color 
                                  }}
                                >
                                  {action.workArea.name}
                                </Badge>
                              )}
                              
                              {action.team && (
                                <Badge variant="secondary" size="sm" className="text-[10px]">
                                  <Users className="w-3 h-3 mr-1" />
                                  {action.team.name}
                                </Badge>
                              )}
                              
                              <Badge 
                                variant={action.categoryColor as any} 
                                size="sm"
                                className="text-[10px]"
                              >
                                {action.categoryLabel}
                              </Badge>
                              
                              {dueLabel && (
                                <Badge variant={dueLabel.variant as any} size="sm" className="text-[10px]">
                                  {dueLabel.text}
                                </Badge>
                              )}
                              
                              {hasSubtasks && (
                                <button
                                  onClick={() => onToggleExpandAction(action.id)}
                                  className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                                >
                                  {action.subtasks.filter((s: any) => s.status === 'COMPLETED').length}/{action.subtasks.length} subtasks
                                  <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 mt-2">
                          <div className="relative group">
                            <button className="text-xs px-2 py-1 bg-background hover:bg-surface rounded border border-border transition-colors flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Postpone
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <div className="absolute left-0 mt-1 hidden group-hover:block bg-background border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
                              {[1, 3, 7].map(days => (
                                <button
                                  key={days}
                                  onClick={() => onPostponeAction(action.id, days)}
                                  className="w-full text-left px-3 py-2 hover:bg-surface text-xs"
                                >
                                  +{days} day{days > 1 ? 's' : ''}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => onEditAction(action)}
                            className="text-xs px-2 py-1 bg-background hover:bg-surface rounded border border-border transition-colors flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                          
                          <button
                            onClick={() => onAddSubtask(action)}
                            className="text-xs px-2 py-1 bg-background hover:bg-surface rounded border border-border transition-colors flex items-center gap-1"
                          >
                            <ListPlus className="w-3 h-3" />
                            Add Subtask
                          </button>
                        </div>
                        
                        {/* Expanded subtasks */}
                        <AnimatePresence>
                          {isExpanded && hasSubtasks && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 space-y-1 overflow-hidden"
                            >
                              {action.subtasks.map((subtask: any) => (
                                <div 
                                  key={subtask.id}
                                  className="flex items-center gap-2 pl-4 py-1.5 bg-background rounded"
                                >
                                  {subtask.status === 'COMPLETED' ? (
                                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                                  ) : (
                                    <div className="w-4 h-4 border-2 border-border rounded flex-shrink-0" />
                                  )}
                                  <span className={`text-sm flex-1 ${subtask.status === 'COMPLETED' ? 'line-through text-text-muted' : ''}`}>
                                    {subtask.title}
                                  </span>
                                  {subtask.assignedTo && (
                                    <span className="text-xs text-text-secondary">
                                      {subtask.assignedTo.name}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Recently Completed Section */}
          {recentlyCompletedActions && recentlyCompletedActions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <button
                onClick={() => setShowRecentlyCompleted(!showRecentlyCompleted)}
                className="flex items-center justify-between w-full text-left mb-3 group"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-text-secondary">
                    Recently Completed ({recentlyCompletedActions.length})
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showRecentlyCompleted ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showRecentlyCompleted && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {recentlyCompletedActions.map((action: any) => (
                      <div
                        key={action.id}
                        className="flex items-center gap-3 p-2 bg-success/5 rounded-lg border border-success/20"
                      >
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary line-through opacity-75">
                            {action.title}
                          </p>
                          <p className="text-xs text-text-muted">
                            {new Date(action.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => onUncompleteAction(action)}
                          className="text-xs px-2 py-1 bg-background hover:bg-surface rounded border border-border transition-colors whitespace-nowrap"
                          disabled={updateActionMutationPending}
                        >
                          Undo
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
