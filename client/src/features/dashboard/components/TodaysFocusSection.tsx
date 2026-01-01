import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, Sparkles, ChevronRight } from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import FocusItemActions from '@/components/FocusItemActions';
import { cn } from '@/lib/utils';

interface TodaysFocusSectionProps {
  focusItems: any[];
  itemVariants: any;
  onCreateAction: () => void;
}

/**
 * Today's Focus section showing prioritized smart suggestions
 * Displays AI-powered focus items with actionable buttons
 */
export function TodaysFocusSection({ 
  focusItems, 
  itemVariants, 
  onCreateAction 
}: TodaysFocusSectionProps) {
  const navigate = useNavigate();

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <CardTitle className="font-display tracking-wide">TODAY'S FOCUS</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {focusItems.length > 0 ? (
            <ul className="space-y-3">
              {focusItems.map((item, i) => {
                const IconComp = item.icon;
                return (
                  <motion.li 
                    key={`${item.type}-${item.id || i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl transition-colors relative group",
                      item.link ? "hover:bg-surface cursor-pointer" : "bg-surface"
                    )}
                    onClick={() => item.link && navigate(item.link)}
                  >
                    {/* Priority indicator */}
                    <span className={cn(
                      "absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full",
                      item.priority <= 1.3 && "bg-danger",
                      item.priority > 1.3 && item.priority < 3 && "bg-warning",
                      item.priority >= 3 && item.priority <= 6 && "bg-primary",
                      item.priority > 6 && "bg-success"
                    )} />
                    <span className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      item.color === 'danger' && "bg-danger/20 text-danger",
                      item.color === 'warning' && "bg-warning/20 text-warning",
                      item.color === 'success' && "bg-success/20 text-success",
                      item.color === 'primary' && "bg-primary/20 text-primary"
                    )}>
                      <IconComp className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text-primary">{item.title}</p>
                        {item.priority <= 1.3 && (
                          <span className="text-[10px] font-bold uppercase text-danger bg-danger/10 px-1.5 py-0.5 rounded">Urgent</span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary mt-0.5">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.actionable && (
                        <FocusItemActions 
                          item={item} 
                          onNavigate={item.link ? () => navigate(item.link) : undefined}
                        />
                      )}
                      {item.link && !item.actionable && (
                        <ChevronRight className="w-5 h-5 text-text-muted" />
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-3 opacity-50" />
              <p className="text-text-primary font-medium mb-1">Nothing urgent right now</p>
              <p className="text-text-secondary text-sm">You're all set for today! 🎯</p>
              <button
                onClick={onCreateAction}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Create a new action
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
