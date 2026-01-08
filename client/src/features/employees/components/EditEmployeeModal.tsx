import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

interface WorkArea {
  id: string;
  name: string;
  color: string;
}

interface Employee {
  id: string;
  name: string;
  email?: string;
  role: string;
  team: string;
  status: string;
  workAreaId?: string;
  strengths: string[];
  growthAreas: string[];
}

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  workAreas: WorkArea[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export default function EditEmployeeModal({ 
  isOpen, 
  onClose, 
  employee, 
  workAreas, 
  onSubmit, 
  isLoading 
}: EditEmployeeModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    team: '',
    status: 'ACTIVE',
    workAreaId: '',
    strengths: [] as string[],
    growthAreas: [] as string[]
  });
  const [strengthInput, setStrengthInput] = useState('');
  const [growthInput, setGrowthInput] = useState('');

  // Sync form data when modal opens with employee data
  useEffect(() => {
    if (isOpen && employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        role: employee.role || '',
        team: employee.team || '',
        status: employee.status || 'ACTIVE',
        workAreaId: employee.workAreaId || '',
        strengths: employee.strengths || [],
        growthAreas: employee.growthAreas || []
      });
    }
  }, [isOpen, employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      workAreaId: formData.workAreaId || null
    });
  };

  const addStrength = () => {
    if (strengthInput.trim() && !formData.strengths.includes(strengthInput.trim())) {
      setFormData({ ...formData, strengths: [...formData.strengths, strengthInput.trim()] });
      setStrengthInput('');
    }
  };

  const removeStrength = (s: string) => {
    setFormData({ ...formData, strengths: formData.strengths.filter(x => x !== s) });
  };

  const addGrowthArea = () => {
    if (growthInput.trim() && !formData.growthAreas.includes(growthInput.trim())) {
      setFormData({ ...formData, growthAreas: [...formData.growthAreas, growthInput.trim()] });
      setGrowthInput('');
    }
  };

  const removeGrowthArea = (g: string) => {
    setFormData({ ...formData, growthAreas: formData.growthAreas.filter(x => x !== g) });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Team Member" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            required
          />
          <Input
            label="Team"
            value={formData.team}
            onChange={(e) => setFormData({ ...formData, team: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'ON_LEAVE', label: 'On Leave' },
              { value: 'OFFBOARDING', label: 'Offboarding' },
              { value: 'OFFBOARDED', label: 'Offboarded' }
            ]}
          />
          <Select
            label="Work Area"
            value={formData.workAreaId}
            onChange={(e) => setFormData({ ...formData, workAreaId: e.target.value })}
            options={[
              { value: '', label: 'No area' },
              ...workAreas.map((area) => ({ 
                value: area.id, 
                label: area.name 
              }))
            ]}
          />
        </div>

        {/* Strengths */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Strengths</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.strengths.map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-success/20 text-success rounded-lg text-sm">
                {s}
                <button type="button" onClick={() => removeStrength(s)} className="hover:bg-success/30 rounded p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={strengthInput}
              onChange={(e) => setStrengthInput(e.target.value)}
              placeholder="Add a strength..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStrength())}
            />
            <Button type="button" variant="ghost" onClick={addStrength}>Add</Button>
          </div>
        </div>

        {/* Growth Areas */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Growth Areas</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.growthAreas.map((g, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-warning/20 text-warning rounded-lg text-sm">
                {g}
                <button type="button" onClick={() => removeGrowthArea(g)} className="hover:bg-warning/30 rounded p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={growthInput}
              onChange={(e) => setGrowthInput(e.target.value)}
              placeholder="Add a growth area..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGrowthArea())}
            />
            <Button type="button" variant="ghost" onClick={addGrowthArea}>Add</Button>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Save Changes</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
