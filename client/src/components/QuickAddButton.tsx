import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, CheckSquare, MessageSquare, Calendar } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface QuickAddButtonProps {
  className?: string;
}

type QuickAddMode = 'action' | 'note' | '1:1' | null;

export default function QuickAddButton({ className }: QuickAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<QuickAddMode>(null);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data)
  });

  const { data: workAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

  const createActionMutation = useMutation({
    mutationFn: apiHelpers.createAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actionStats'] });
      toast.success('Action created');
      setMode(null);
      setIsOpen(false);
    },
    onError: () => toast.error('Failed to create action')
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: any }) =>
      apiHelpers.addEmployeeNote(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Note added');
      setMode(null);
      setIsOpen(false);
    },
    onError: () => toast.error('Failed to add note')
  });

  const addOneOnOneMutation = useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: any }) =>
      apiHelpers.addOneOnOne(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('1:1 logged');
      setMode(null);
      setIsOpen(false);
    },
    onError: () => toast.error('Failed to log 1:1')
  });

  const quickOptions = [
    { id: 'action', label: 'Quick Action', icon: CheckSquare, color: 'text-primary' },
    { id: 'note', label: 'Add Note', icon: MessageSquare, color: 'text-secondary' },
    { id: '1:1', label: 'Log 1:1', icon: Calendar, color: 'text-accent' },
  ];

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center z-40",
          "hover:bg-primary/90 transition-colors",
          className
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </motion.div>
      </motion.button>

      {/* Quick Options Menu */}
      <AnimatePresence>
        {isOpen && !mode && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 bg-white rounded-2xl shadow-xl border border-surface p-2 z-40"
          >
            {quickOptions.map((option, i) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setMode(option.id as QuickAddMode)}
                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-surface transition-colors"
              >
                <option.icon className={cn("w-5 h-5", option.color)} />
                <span className="font-medium text-text-primary">{option.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Action Modal */}
      <QuickActionModal
        isOpen={mode === 'action'}
        onClose={() => setMode(null)}
        onSubmit={(data) => createActionMutation.mutate(data)}
        isLoading={createActionMutation.isPending}
        workAreas={workAreas || []}
        employees={employees || []}
      />

      {/* Quick Note Modal */}
      <QuickNoteModal
        isOpen={mode === 'note'}
        onClose={() => setMode(null)}
        onSubmit={(employeeId, data) => addNoteMutation.mutate({ employeeId, data })}
        isLoading={addNoteMutation.isPending}
        employees={employees || []}
      />

      {/* Quick 1:1 Modal */}
      <QuickOneOnOneModal
        isOpen={mode === '1:1'}
        onClose={() => setMode(null)}
        onSubmit={(employeeId, data) => addOneOnOneMutation.mutate({ employeeId, data })}
        isLoading={addOneOnOneMutation.isPending}
        employees={employees || []}
      />
    </>
  );
}

function QuickActionModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  workAreas,
  employees
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  workAreas: any[];
  employees: any[];
}) {
  const [formData, setFormData] = useState({
    title: '',
    priority: 'MEDIUM',
    workAreaId: '',
    employeeId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: formData.title,
      priority: formData.priority,
      workAreaId: formData.workAreaId || undefined,
      employeeId: formData.employeeId || undefined
    });
    setFormData({ title: '', priority: 'MEDIUM', workAreaId: '', employeeId: '' });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Action" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="What needs to be done?"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Action title"
          autoFocus
          required
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
            label="Work Area"
            value={formData.workAreaId}
            onChange={(e) => setFormData({ ...formData, workAreaId: e.target.value })}
            options={[
              { value: '', label: 'None' },
              ...workAreas.map((a: any) => ({ value: a.id, label: a.name }))
            ]}
          />
        </div>
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Create</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function QuickNoteModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  employees
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeeId: string, data: any) => void;
  isLoading: boolean;
  employees: any[];
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    onSubmit(employeeId, { content, type: 'GENERAL' });
    setEmployeeId('');
    setContent('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick Note" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Team Member"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          options={[
            { value: '', label: 'Select...' },
            ...employees.filter((e: any) => e.status === 'ACTIVE').map((e: any) => ({ value: e.id, label: e.name }))
          ]}
          required
        />
        <Textarea
          label="Note"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What do you want to remember about this person?"
          className="min-h-[100px]"
          required
        />
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading} disabled={!employeeId}>Save Note</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function QuickOneOnOneModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  employees
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeeId: string, data: any) => void;
  isLoading: boolean;
  employees: any[];
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState('3');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    onSubmit(employeeId, {
      date: new Date().toISOString(),
      notes,
      mood: parseInt(mood),
      topics: []
    });
    setEmployeeId('');
    setNotes('');
    setMood('3');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log 1:1" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Team Member"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          options={[
            { value: '', label: 'Select...' },
            ...employees.filter((e: any) => e.status === 'ACTIVE').map((e: any) => ({ value: e.id, label: e.name }))
          ]}
          required
        />
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Mood</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setMood(String(level))}
                className={cn(
                  "w-10 h-10 rounded-lg transition-all text-lg",
                  parseInt(mood) === level
                    ? "bg-primary text-white"
                    : "bg-surface hover:bg-surface/80"
                )}
              >
                {level <= 2 ? '😟' : level === 3 ? '😐' : level === 4 ? '🙂' : '😊'}
              </button>
            ))}
          </div>
        </div>
        <Textarea
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Key takeaways from the conversation..."
          className="min-h-[80px]"
        />
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading} disabled={!employeeId}>Log 1:1</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
