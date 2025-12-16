import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, CloudOff, RefreshCw } from 'lucide-react';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';

export default function OfflineIndicator() {
  const { isOnline, pendingCount } = useOfflineStorage();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-warning text-white px-4 py-2"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">
              You're offline. Changes will sync when you're back online.
            </span>
            {pendingCount > 0 && (
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

