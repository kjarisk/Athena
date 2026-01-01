import { Check, ChevronDown, ChevronRight, Edit2, ListPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import FocusItemActions from '@/components/FocusItemActions';

interface ActionItemProps {
  action: any;
  isExpanded?: boolean;
  showWorkArea?: boolean;
  onComplete: (action: any) => void;
  onUncomplete: (action: any) => void;
  onPostpone: (actionId: string, days: number) => void;
  onEdit: (action: any) => void;
  onAddSubtask: (action: any) => void;
  onToggleExpand?: (actionId: string) => void;
}

/**
 * Individual action item with completion, editing, and subtask management
 * Displays action details, priority, due date, and subtasks
 */
export function ActionItem({
  action,
  isExpanded,
  showWorkArea = false,
  onComplete,
  onUncomplete,
  onPostpone,
  onEdit,
  onAddSubtask,
  onToggleExpand
}: ActionItemProps) {
  const hasSubtasks = action.subtasks && action.subtasks.length > 0;
  const completedSubtasks = action.subtasks?.filter((st: any) => st.status === 'COMPLETED').length || 0;
  const totalSubtasks = action.subtasks?.length || 0;
  const isCompleted = action.status === 'COMPLETED';

  // Calculate if overdue
  const isOverdue = action.dueDate && new Date(action.dueDate) < new Date() && !isCompleted;

  return (
    <div className="border border-border rounded-lg p-3 hover:border-primary/50 transition-all group">
      <div className="flex items-start gap-3">
        {/* Complete checkbox */}
        <button
          onClick={() => isCompleted ? onUncomplete(action) : onComplete(action)}
          className={`flex-shrink-0 mt-0.5 rounded border-2 transition-all ${
            isCompleted
              ? 'bg-success border-success text-white'
              : 'border-border hover:border-primary'
          } h-5 w-5 flex items-center justify-center`}
        >
          {isCompleted && <Check className="h-3.5 w-3.5" />}
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => hasSubtasks && onToggleExpand?.(action.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                {hasSubtasks && (
                  <button className="text-text-secondary hover:text-text-primary">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                )}
                <h4 className={`font-medium text-sm ${isCompleted ? 'line-through text-text-secondary' : ''}`}>
                  {action.title}
                </h4>
              </div>

              {/* Badges and metadata */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                {action.priority && (
                  <Badge variant={
                    action.priority === 'HIGH' ? 'danger' : 
                    action.priority === 'MEDIUM' ? 'warning' : 
                    'default'
                  }>
                    {action.priority}
                  </Badge>
                )}
                {action.dueDate && (
                  <span className={isOverdue ? 'text-danger font-medium' : ''}>
                    Due {formatDate(new Date(action.dueDate), { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {showWorkArea && action.workArea && (
                  <span>· {action.workArea.name}</span>
                )}
                {action.assignedTo && (
                  <span>· Assigned to {action.assignedTo.name}</span>
                )}
                {hasSubtasks && (
                  <span className="text-primary">
                    {completedSubtasks}/{totalSubtasks} subtasks
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Note: FocusItemActions handles postpone internally */}
              <FocusItemActions
                item={action}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(action)}
                className="h-7 w-7 p-0"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              {!hasSubtasks && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddSubtask(action)}
                  className="h-7 w-7 p-0"
                  title="Add subtask"
                >
                  <ListPlus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Subtasks (when expanded) */}
          {isExpanded && hasSubtasks && (
            <div className="mt-3 ml-6 space-y-2 border-l-2 border-border pl-3">
              {action.subtasks.map((subtask: any) => (
                <ActionItem
                  key={subtask.id}
                  action={subtask}
                  onComplete={onComplete}
                  onUncomplete={onUncomplete}
                  onPostpone={onPostpone}
                  onEdit={onEdit}
                  onAddSubtask={onAddSubtask}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
