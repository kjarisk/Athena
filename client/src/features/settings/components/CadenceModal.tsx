import { useState, useEffect } from 'react';
import { Users, Target, Calendar, Briefcase, Clock } from 'lucide-react';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

const cadenceTypes = [
  { value: 'ONE_ON_ONE', label: '1:1 Meeting', icon: Users },
  { value: 'RETRO', label: 'Retrospective', icon: Target },
  { value: 'SOCIAL', label: 'Social Event', icon: Calendar },
  { value: 'CAREER_CHAT', label: 'Career Conversation', icon: Briefcase },
  { value: 'CUSTOM', label: 'Custom', icon: Clock },
];

const frequencyOptions = [
  { value: '7', label: 'Weekly' },
  { value: '14', label: 'Bi-weekly' },
  { value: '30', label: 'Monthly' },
  { value: '60', label: 'Every 2 months' },
  { value: '90', label: 'Quarterly' },
  { value: '180', label: 'Every 6 months' },
  { value: '365', label: 'Yearly' },
];

const targetTypes = [
  { value: 'EMPLOYEE', label: 'Per Employee' },
  { value: 'TEAM', label: 'Per Team' },
  { value: 'WORK_AREA', label: 'Per Work Area' },
  { value: 'GLOBAL', label: 'Global' },
];

interface CadenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  cadence: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  employees: any[];
  teams: any[];
  workAreas: any[];
}

export default function CadenceModal({ 
  isOpen, 
  onClose, 
  cadence, 
  onSubmit, 
  isLoading,
  employees,
  teams,
  workAreas
}: CadenceModalProps) {
  const [formData, setFormData] = useState({
    type: 'ONE_ON_ONE',
    name: '',
    frequencyDays: '14',
    targetType: 'EMPLOYEE',
    employeeId: '',
    teamId: '',
    workAreaId: '',
    isActive: true
  });

  useEffect(() => {
    if (isOpen) {
      if (cadence) {
        setFormData({
          type: cadence.type || 'ONE_ON_ONE',
          name: cadence.name || '',
          frequencyDays: String(cadence.frequencyDays || 14),
          targetType: cadence.targetType || 'EMPLOYEE',
          employeeId: cadence.employeeId || '',
          teamId: cadence.teamId || '',
          workAreaId: cadence.workAreaId || '',
          isActive: cadence.isActive !== false
        });
      } else {
        setFormData({
          type: 'ONE_ON_ONE',
          name: '',
          frequencyDays: '14',
          targetType: 'EMPLOYEE',
          employeeId: '',
          teamId: '',
          workAreaId: '',
          isActive: true
        });
      }
    }
  }, [isOpen, cadence]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type: formData.type,
      name: formData.name,
      frequencyDays: formData.frequencyDays,
      targetType: formData.targetType,
      employeeId: formData.targetType === 'EMPLOYEE' ? formData.employeeId : null,
      teamId: formData.targetType === 'TEAM' ? formData.teamId : null,
      workAreaId: formData.targetType === 'WORK_AREA' ? formData.workAreaId : null,
      isActive: formData.isActive
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cadence?.id ? 'Edit Cadence Rule' : 'Create Cadence Rule'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Weekly 1:1 with Sarah"
          required
        />

        <Select
          label="Type"
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          options={cadenceTypes.map(t => ({ value: t.value, label: t.label }))}
        />

        <Select
          label="Frequency"
          value={formData.frequencyDays}
          onChange={(e) => setFormData({ ...formData, frequencyDays: e.target.value })}
          options={frequencyOptions}
        />

        <Select
          label="Target"
          value={formData.targetType}
          onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
          options={targetTypes}
        />

        {formData.targetType === 'EMPLOYEE' && (
          <Select
            label="Select Employee"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            options={[
              { value: '', label: 'All Employees' },
              ...employees.map((emp: any) => ({ value: emp.id, label: emp.name }))
            ]}
          />
        )}

        {formData.targetType === 'TEAM' && (
          <Select
            label="Select Team"
            value={formData.teamId}
            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
            options={[
              { value: '', label: 'All Teams' },
              ...teams.map((team: any) => ({ value: team.id, label: team.name }))
            ]}
          />
        )}

        {formData.targetType === 'WORK_AREA' && (
          <Select
            label="Select Work Area"
            value={formData.workAreaId}
            onChange={(e) => setFormData({ ...formData, workAreaId: e.target.value })}
            options={[
              { value: '', label: 'All Work Areas' },
              ...workAreas.map((area: any) => ({ value: area.id, label: area.name }))
            ]}
          />
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-4 h-4 rounded border-2 border-text-muted text-primary focus:ring-primary"
          />
          <span className="text-sm text-text-primary">Active</span>
        </label>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {cadence?.id ? 'Save Changes' : 'Create Rule'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
