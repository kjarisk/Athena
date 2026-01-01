import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { iconOptions, colorOptions } from '../constants';

interface AreaModalProps {
  isOpen: boolean;
  onClose: () => void;
  area?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

/**
 * Modal for creating or editing work areas
 */
export function AreaModal({ isOpen, onClose, area, onSubmit, isLoading }: AreaModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#D4A574',
    icon: 'target'
  });

  // Reset form when modal opens or area changes
  useEffect(() => {
    if (isOpen) {
      if (area) {
        setFormData({
          name: area.name || '',
          description: area.description || '',
          color: area.color || '#D4A574',
          icon: area.icon || 'target'
        });
      } else {
        setFormData({
          name: '',
          description: '',
          color: '#D4A574',
          icon: 'target'
        });
      }
    }
  }, [isOpen, area]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={area ? 'Edit Work Area' : 'Create Work Area'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Team Lead, Projects, Competence"
          required
        />
        
        <Textarea
          label="Description (optional)"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What does this area cover?"
        />

        {/* Color picker */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Color</label>
          <div className="flex gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({ ...formData, color: color.value })}
                className={cn(
                  "w-8 h-8 rounded-lg transition-all",
                  formData.color === color.value && "ring-2 ring-offset-2 ring-text-primary"
                )}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">Icon</label>
          <div className="flex gap-2">
            {iconOptions.map((opt) => {
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: opt.value })}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    formData.icon === opt.value 
                      ? "bg-primary text-white" 
                      : "bg-surface text-text-secondary hover:bg-surface/80"
                  )}
                  title={opt.label}
                >
                  <IconComp className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div className="p-4 bg-surface rounded-xl">
          <p className="text-xs text-text-muted mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${formData.color}20` }}
            >
              {(() => {
                const IconComp = iconOptions.find(i => i.value === formData.icon)?.icon || Target;
                return <IconComp className="w-5 h-5" style={{ color: formData.color }} />;
              })()}
            </div>
            <span className="font-display font-semibold">
              {formData.name || 'Area Name'}
            </span>
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {area ? 'Save Changes' : 'Create Area'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
