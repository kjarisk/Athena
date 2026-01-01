import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, FileText, Calendar, Sparkles } from 'lucide-react';

interface FABProps {
  onCreateAction: () => void;
  onCreateEvent: () => void;
  onExtractNotes: () => void;
}

export default function FloatingActionButton({ onCreateAction, onCreateEvent, onExtractNotes }: FABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      icon: FileText,
      label: 'New Action',
      color: 'bg-primary hover:bg-primary-dark',
      onClick: () => {
        onCreateAction();
        setIsOpen(false);
      },
      shortcut: 'A'
    },
    {
      icon: Calendar,
      label: 'New Event',
      color: 'bg-secondary hover:bg-secondary-dark',
      onClick: () => {
        onCreateEvent();
        setIsOpen(false);
      },
      shortcut: 'E'
    },
    {
      icon: Sparkles,
      label: 'Extract Notes',
      color: 'bg-accent hover:bg-accent-dark',
      onClick: () => {
        onExtractNotes();
        setIsOpen(false);
      },
      shortcut: 'N'
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 right-0 space-y-3"
          >
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={item.onClick}
                  className={`${item.color} text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-3 min-w-[180px] group`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-auto text-xs opacity-70 bg-white/20 px-2 py-0.5 rounded">
                    {item.shortcut}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`${
          isOpen ? 'bg-danger hover:bg-danger-dark' : 'bg-primary hover:bg-primary-dark'
        } text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="plus"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
