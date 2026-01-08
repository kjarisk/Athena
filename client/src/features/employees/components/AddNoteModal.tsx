import { useState } from 'react';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { content: string; type: string }) => void;
  isLoading: boolean;
}

export default function AddNoteModal({ isOpen, onClose, onSubmit, isLoading }: AddNoteModalProps) {
  const [content, setContent] = useState('');
  const [type, setType] = useState('GENERAL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ content, type });
    setContent('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Note">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label="Note"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          required
        />
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Add Note</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
