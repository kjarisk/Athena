import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  FileText, 
  CheckSquare, 
  Square, 
  Trash2,
  Plus,
  ArrowRight
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Textarea, Select, Input } from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function NoteExtractor() {
  const [notes, setNotes] = useState('');
  const [context, setContext] = useState('');
  const [extractedData, setExtractedData] = useState<any>(null);
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data)
  });

  const extractMutation = useMutation({
    mutationFn: () => apiHelpers.extractActions(notes, context),
    onSuccess: (response) => {
      setExtractedData(response.data.data);
      // Select all actions by default
      const indices = new Set(
        response.data.data.actions?.map((_: any, i: number) => i) || []
      );
      setSelectedActions(indices);
      toast.success('Actions extracted successfully');
    },
    onError: () => {
      toast.error('Failed to extract actions. Check your AI provider settings.');
    }
  });

  const createActionsMutation = useMutation({
    mutationFn: async (actions: any[]) => {
      const promises = actions.map(action => apiHelpers.createAction(action));
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actionStats'] });
      toast.success(`Created ${selectedActions.size} action(s)`);
      setExtractedData(null);
      setNotes('');
      setContext('');
      setSelectedActions(new Set());
    },
    onError: () => {
      toast.error('Failed to create some actions');
    }
  });

  const toggleAction = (index: number) => {
    const newSelected = new Set(selectedActions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedActions(newSelected);
  };

  const handleCreateActions = () => {
    if (!extractedData?.actions) return;
    
    const actionsToCreate = extractedData.actions
      .filter((_: any, i: number) => selectedActions.has(i))
      .map((action: any) => ({
        title: action.title,
        description: action.description,
        priority: action.priority?.toUpperCase() || 'MEDIUM',
        dueDate: action.dueDate || undefined,
        source: 'AI_EXTRACTED'
      }));
    
    createActionsMutation.mutate(actionsToCreate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-text-primary">
          Extract Actions
        </h1>
        <p className="text-text-secondary mt-1">
          Paste your meeting notes and let AI extract action items
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle>Paste Your Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                label="Context (optional)"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., 1:1 with Sarah, Workshop on AI tools"
              />
              
              <Textarea
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste your meeting notes, workshop outcomes, or any text containing action items...

Example:
- Discussed career goals with Sarah
- Need to schedule training session
- Follow up on code review process
- Sarah wants to learn React, find resources
- Set up weekly sync meetings"
                className="min-h-[300px]"
              />

              <Button
                onClick={() => extractMutation.mutate()}
                isLoading={extractMutation.isPending}
                disabled={!notes.trim()}
                className="w-full"
                leftIcon={<Sparkles className="w-5 h-5" />}
              >
                Extract Actions with AI
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {extractedData ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <CardTitle>Extracted Data</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setExtractedData(null);
                        setSelectedActions(new Set());
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Summary */}
                    {extractedData.summary && (
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary mb-2">Summary</h4>
                        <p className="text-text-primary bg-surface p-3 rounded-xl">
                          {extractedData.summary}
                        </p>
                      </div>
                    )}

                    {/* Key Points */}
                    {extractedData.keyPoints?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-text-secondary mb-2">Key Points</h4>
                        <ul className="space-y-1">
                          {extractedData.keyPoints.map((point: string, i: number) => (
                            <li key={i} className="text-sm text-text-primary flex items-start gap-2">
                              <span className="text-primary mt-1">-</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    {extractedData.actions?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-text-secondary">
                            Actions ({selectedActions.size} selected)
                          </h4>
                          <button
                            onClick={() => {
                              if (selectedActions.size === extractedData.actions.length) {
                                setSelectedActions(new Set());
                              } else {
                                setSelectedActions(new Set(
                                  extractedData.actions.map((_: any, i: number) => i)
                                ));
                              }
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            {selectedActions.size === extractedData.actions.length 
                              ? 'Deselect all' 
                              : 'Select all'}
                          </button>
                        </div>
                        <ul className="space-y-2">
                          {extractedData.actions.map((action: any, i: number) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={cn(
                                "p-3 rounded-xl border-2 transition-colors cursor-pointer",
                                selectedActions.has(i)
                                  ? "border-primary bg-primary/5"
                                  : "border-surface hover:border-primary/30"
                              )}
                              onClick={() => toggleAction(i)}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                                  selectedActions.has(i)
                                    ? "border-primary bg-primary text-white"
                                    : "border-text-muted"
                                )}>
                                  {selectedActions.has(i) && <CheckSquare className="w-3 h-3" />}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-text-primary">{action.title}</p>
                                  {action.description && (
                                    <p className="text-sm text-text-secondary mt-0.5">
                                      {action.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge 
                                      size="sm"
                                      variant={
                                        action.priority === 'urgent' ? 'danger' :
                                        action.priority === 'high' ? 'warning' :
                                        action.priority === 'low' ? 'secondary' : 'primary'
                                      }
                                    >
                                      {action.priority || 'medium'}
                                    </Badge>
                                    {action.dueDate && (
                                      <span className="text-xs text-text-muted">
                                        Due: {action.dueDate}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Create Actions Button */}
                    {extractedData.actions?.length > 0 && (
                      <Button
                        onClick={handleCreateActions}
                        isLoading={createActionsMutation.isPending}
                        disabled={selectedActions.size === 0}
                        className="w-full"
                        leftIcon={<Plus className="w-5 h-5" />}
                      >
                        Create {selectedActions.size} Action{selectedActions.size !== 1 ? 's' : ''}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="h-full flex items-center justify-center min-h-[400px]">
                <div className="text-center p-8">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-surface flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-text-muted" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-text-primary mb-2">
                    AI-Powered Extraction
                  </h3>
                  <p className="text-text-secondary max-w-sm">
                    Paste your meeting notes, workshop outcomes, or any text on the left. 
                    AI will extract action items, key points, and summaries.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4 text-sm text-text-muted">
                    <FileText className="w-4 h-4" />
                    <ArrowRight className="w-4 h-4" />
                    <Sparkles className="w-4 h-4" />
                    <ArrowRight className="w-4 h-4" />
                    <CheckSquare className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

