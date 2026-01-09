import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Flag, Repeat, Users, Target, User, AlertTriangle, Tag, ShieldAlert } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { apiHelpers } from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: any; // Pre-fill for editing
  defaults?: {
    title?: string;
    description?: string;
    workAreaId?: string;
    teamId?: string;
    employeeId?: string;
    parentId?: string; // For subtasks
    type?: 'ACTION' | 'DECISION' | 'INSIGHT';
  };
}

export default function ActionModal({ isOpen, onClose, action, defaults }: ActionModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!action;
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [workAreaId, setWorkAreaId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [recurringFrequency, setRecurringFrequency] = useState<string>('none');
  
  // New fields
  const [itemType, setItemType] = useState<'ACTION' | 'DECISION' | 'INSIGHT'>('ACTION');
  const [isBlocker, setIsBlocker] = useState(false);
  const [riskLevel, setRiskLevel] = useState<'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'>('NONE');

  // Load work areas, teams, employees
  const { data: workAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiHelpers.getTeams().then(r => r.data.data)
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees({}).then(r => r.data.data)
  });

  // Pre-fill form when editing or defaults provided
  useEffect(() => {
    if (action) {
      setTitle(action.title || '');
      setDescription(action.description || '');
      setPriority(action.priority || 'MEDIUM');
      
      if (action.dueDate) {
        const date = new Date(action.dueDate);
        setDueDate(date.toISOString().split('T')[0]);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        setDueTime(`${hours}:${minutes}`);
      }
      
      setWorkAreaId(action.workAreaId || '');
      setTeamId(action.teamId || '');
      setEmployeeId(action.assignedToId || '');
      setRecurringFrequency(action.recurringFrequency || 'none');
      setItemType(action.type || 'ACTION');
      setIsBlocker(action.isBlocker || false);
      setRiskLevel(action.riskLevel || 'NONE');
    } else if (defaults) {
      setTitle(defaults.title || '');
      setDescription(defaults.description || '');
      setWorkAreaId(defaults.workAreaId || '');
      setTeamId(defaults.teamId || '');
      setEmployeeId(defaults.employeeId || '');
      setItemType(defaults.type || 'ACTION');
    }
  }, [action, defaults, isOpen]);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setPriority('MEDIUM');
        setDueDate('');
        setDueTime('');
        setWorkAreaId('');
        setTeamId('');
        setEmployeeId('');
        setRecurringFrequency('none');
        setItemType('ACTION');
        setIsBlocker(false);
        setRiskLevel('NONE');
      }, 300);
    }
  }, [isOpen]);

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        return apiHelpers.updateAction(action.id, data);
      } else {
        return apiHelpers.createAction(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actionStats'] });
      queryClient.invalidateQueries({ queryKey: ['overdueActions'] });
      queryClient.invalidateQueries({ queryKey: ['focusSuggestions'] });
      toast.success(isEditing ? 'Action updated!' : 'Action created!');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save action');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    // Build due date with time
    let dueDateValue = null;
    if (dueDate) {
      const date = new Date(dueDate);
      if (dueTime) {
        const [hours, minutes] = dueTime.split(':');
        date.setHours(parseInt(hours), parseInt(minutes));
      }
      dueDateValue = date.toISOString();
    }

    const data = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      dueDate: dueDateValue,
      workAreaId: workAreaId || null,
      teamId: teamId || null,
      assignedToId: employeeId || null,
      recurringFrequency: recurringFrequency !== 'none' ? recurringFrequency : null,
      parentId: defaults?.parentId || null, // For subtasks
      status: action?.status || 'PENDING',
      type: itemType,
      isBlocker,
      riskLevel: riskLevel !== 'NONE' ? riskLevel : null
    };

    mutation.mutate(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Action' : defaults?.parentId ? 'Add Subtask' : 'Create Action'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Title <span className="text-danger">*</span>
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            required
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more details..."
            rows={3}
          />
        </div>

        {/* Item Type */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'ACTION', label: 'Action', desc: 'Something to do' },
              { value: 'DECISION', label: 'Decision', desc: 'To be decided' },
              { value: 'INSIGHT', label: 'Insight', desc: 'To remember' }
            ] as const).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setItemType(t.value)}
                className={cn(
                  'px-3 py-2 rounded-lg border transition-colors text-left',
                  itemType === t.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface border-border hover:border-primary'
                )}
              >
                <div className="font-medium text-sm">{t.label}</div>
                <div className={cn(
                  'text-xs',
                  itemType === t.value ? 'text-white/80' : 'text-text-muted'
                )}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Blocker & Risk Level */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Blocker
            </label>
            <button
              type="button"
              onClick={() => setIsBlocker(!isBlocker)}
              className={cn(
                'w-full px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3',
                isBlocker
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-surface border-border hover:border-primary'
              )}
            >
              <div className={cn(
                'w-5 h-5 rounded-md border-2 flex items-center justify-center',
                isBlocker ? 'bg-red-500 border-red-500' : 'border-text-muted'
              )}>
                {isBlocker && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="text-sm">
                {isBlocker ? 'This is a blocker' : 'Mark as blocker'}
              </span>
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Risk Level
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as any)}
              className="w-full px-3 py-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="NONE">No risk</option>
              <option value="LOW">Low risk</option>
              <option value="MEDIUM">Medium risk</option>
              <option value="HIGH">High risk</option>
            </select>
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Flag className="w-4 h-4" />
            Priority
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  priority === p
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface border-border hover:border-primary'
                }`}
              >
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Due Date
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Due Time
            </label>
            <Input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              disabled={!dueDate}
            />
          </div>
        </div>

        {/* Recurring Frequency */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Repeat className="w-4 h-4" />
            Recurring
          </label>
          <select
            value={recurringFrequency}
            onChange={(e) => setRecurringFrequency(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="none">Does not repeat</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Every 2 weeks</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>

        {/* Work Area */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Work Area
            {defaults?.parentId && action?.workArea && (
              <span className="text-xs text-text-secondary ml-2">
                (inherited from parent)
              </span>
            )}
          </label>
          <select
            value={workAreaId}
            onChange={(e) => setWorkAreaId(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={!!(defaults?.parentId && action?.workAreaId)}
          >
            <option value="">No work area</option>
            {workAreas?.filter((a: any) => !a.isHidden).map((area: any) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        {/* Team */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team
            {defaults?.parentId && action?.team && (
              <span className="text-xs text-text-secondary ml-2">
                (inherited from parent)
              </span>
            )}
          </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={!!(defaults?.parentId && action?.teamId)}
          >
            <option value="">No team</option>
            {teams?.map((team: any) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned To */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <User className="w-4 h-4" />
            Assign To
          </label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Unassigned</option>
            {employees?.map((emp: any) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.position && `(${emp.position})`}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {isEditing ? 'Update' : 'Create'} Action
          </Button>
        </div>
      </form>
    </Modal>
  );
}
