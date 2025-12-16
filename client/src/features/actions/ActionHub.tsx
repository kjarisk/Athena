import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  CheckSquare, 
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Briefcase,
  X
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { formatDate, getDueDateLabel, formatStatus, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ActionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [workAreaFilter, setWorkAreaFilter] = useState(searchParams.get('workAreaId') || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Sync URL params with filter state
  useEffect(() => {
    const areaId = searchParams.get('workAreaId');
    if (areaId) {
      setWorkAreaFilter(areaId);
    }
  }, [searchParams]);

  const { data: actions, isLoading } = useQuery({
    queryKey: ['actions', { search, status: statusFilter, priority: priorityFilter, workAreaId: workAreaFilter }],
    queryFn: () => apiHelpers.getActions({ 
      search: search || undefined,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      workAreaId: workAreaFilter || undefined
    } as any).then(r => r.data.data)
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data)
  });

  const { data: workAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

  const { data: stats } = useQuery({
    queryKey: ['actionStats'],
    queryFn: () => apiHelpers.getActionStats().then(r => r.data.data)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiHelpers.updateAction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actionStats'] });
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
    }
  });

  const createMutation = useMutation({
    mutationFn: apiHelpers.createAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actionStats'] });
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      setIsCreateModalOpen(false);
      toast.success('Action created');
    }
  });

  const toggleComplete = (action: any) => {
    const newStatus = action.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    updateMutation.mutate({ 
      id: action.id, 
      data: { status: newStatus } 
    });
    if (newStatus === 'COMPLETED') {
      toast.success(`+${action.xpValue} XP earned!`);
    }
  };

  const clearAreaFilter = () => {
    setWorkAreaFilter('');
    setSearchParams({});
  };

  // Get active area name for display
  const activeArea = workAreas?.find((a: any) => a.id === workAreaFilter);

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-text-primary uppercase">
            Actions Hub
          </h1>
          <p className="text-text-secondary mt-1">
            Track and complete your actions to earn XP
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
          New Action
        </Button>
      </div>

      {/* Active Area Filter Badge */}
      {activeArea && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Filtered by:</span>
          <Badge 
            variant="primary"
            className="flex items-center gap-2"
          >
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: activeArea.color }}
            />
            {activeArea.name}
            <button onClick={clearAreaFilter} className="ml-1 hover:bg-white/20 rounded p-0.5">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card padding="sm" className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">Pending</span>
            </div>
            <p className="font-display text-2xl font-bold">{stats.pending}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm text-text-secondary">In Progress</span>
            </div>
            <p className="font-display text-2xl font-bold">{stats.inProgress}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-danger" />
              <span className="text-sm text-text-secondary">Overdue</span>
            </div>
            <p className="font-display text-2xl font-bold text-danger">{stats.overdue}</p>
          </Card>
          <Card padding="sm" className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm text-text-secondary">Completed</span>
            </div>
            <p className="font-display text-2xl font-bold text-success">{stats.completed}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search actions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'DELEGATED', label: 'Delegated' }
              ]}
              className="w-36"
            />
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              options={[
                { value: '', label: 'All Priority' },
                { value: 'URGENT', label: 'Urgent' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' }
              ]}
              className="w-36"
            />
            <Select
              value={workAreaFilter}
              onChange={(e) => {
                setWorkAreaFilter(e.target.value);
                if (e.target.value) {
                  setSearchParams({ workAreaId: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
              options={[
                { value: '', label: 'All Areas' },
                ...(workAreas || []).map((area: any) => ({ 
                  value: area.id, 
                  label: area.name 
                }))
              ]}
              className="w-40"
            />
          </div>
        </div>
      </Card>

      {/* Actions List */}
      {actions && actions.length > 0 ? (
        <motion.div className="space-y-2">
          {actions.map((action: any, index: number) => {
            const dueLabel = action.dueDate ? getDueDateLabel(action.dueDate) : null;
            const isCompleted = action.status === 'COMPLETED';
            
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card 
                  padding="sm" 
                  className={cn(
                    "hover:border-primary/30 border-2 border-transparent transition-all",
                    isCompleted && "opacity-60"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleComplete(action)}
                      className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                        isCompleted 
                          ? "bg-success border-success text-white" 
                          : "border-text-muted hover:border-primary"
                      )}
                    >
                      {isCompleted && <CheckSquare className="w-4 h-4" />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className={cn(
                            "font-medium text-text-primary",
                            isCompleted && "line-through"
                          )}>
                            {action.title}
                          </h3>
                          {action.description && (
                            <p className="text-sm text-text-secondary mt-0.5 line-clamp-1">
                              {action.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant={
                              action.priority === 'URGENT' ? 'danger' :
                              action.priority === 'HIGH' ? 'warning' :
                              action.priority === 'LOW' ? 'secondary' : 'primary'
                            }
                            size="sm"
                          >
                            {action.priority}
                          </Badge>
                          <span className="text-xs text-primary font-medium">
                            +{action.xpValue} XP
                          </span>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
                        {action.workArea && (
                          <span 
                            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{ 
                              backgroundColor: `${action.workArea.color}20`,
                              color: action.workArea.color 
                            }}
                          >
                            <Briefcase className="w-3 h-3" />
                            {action.workArea.name}
                          </span>
                        )}
                        {action.employee && (
                          <span className="flex items-center gap-1 text-text-secondary">
                            <User className="w-3 h-3" />
                            {action.employee.name}
                          </span>
                        )}
                        {dueLabel && (
                          <Badge variant={dueLabel.variant as any} size="sm">
                            {dueLabel.text}
                            {action.dueTime && ` at ${action.dueTime}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <EmptyState
          icon={<CheckSquare className="w-8 h-8" />}
          title="No actions found"
          description="Create your first action or adjust your filters."
          action={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Action
            </Button>
          }
        />
      )}

      {/* Create Modal */}
      <CreateActionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
        employees={employees || []}
        workAreas={workAreas || []}
        defaultWorkAreaId={workAreaFilter}
      />
    </div>
  );
}

function CreateActionModal({ isOpen, onClose, onSubmit, isLoading, employees, workAreas, defaultWorkAreaId }: any) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    dueTime: '',
    employeeId: '',
    workAreaId: defaultWorkAreaId || '',
    xpValue: 10
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        dueDate: '',
        dueTime: '',
        employeeId: '',
        workAreaId: defaultWorkAreaId || '',
        xpValue: 10
      });
    }
  }, [isOpen, defaultWorkAreaId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      employeeId: formData.employeeId || undefined,
      workAreaId: formData.workAreaId || undefined,
      dueDate: formData.dueDate || undefined,
      dueTime: formData.dueTime || undefined
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Action" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="What needs to be done?"
          required
        />
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Add more details..."
        />
        
        {/* Work Area - Required */}
        <Select
          label="Work Area"
          value={formData.workAreaId}
          onChange={(e) => setFormData({ ...formData, workAreaId: e.target.value })}
          options={[
            { value: '', label: 'Select an area...' },
            ...workAreas.map((area: any) => ({ 
              value: area.id, 
              label: area.name 
            }))
          ]}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' }
            ]}
          />
          <Select
            label="Link to Employee"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            options={[
              { value: '', label: 'No employee' },
              ...employees.map((emp: any) => ({ value: emp.id, label: emp.name }))
            ]}
          />
        </div>

        {/* Due Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
          <Input
            label="Due Time"
            type="time"
            value={formData.dueTime}
            onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
          />
        </div>

        <Input
          label="XP Value"
          type="number"
          value={formData.xpValue.toString()}
          onChange={(e) => setFormData({ ...formData, xpValue: parseInt(e.target.value) || 10 })}
          min="1"
          max="100"
        />

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Create Action</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
