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
  ArrowRight,
  Lightbulb,
  Scale,
  AlertCircle,
  Edit2
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Textarea, Select, Input } from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ExtractedAction {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  type?: 'action' | 'decision' | 'insight';
  isBlocker?: boolean;
  assignee?: string;
}

interface ExtractedDecision {
  title: string;
  description?: string;
  context?: string;
  participants?: string[];
}

interface ExtractedInsight {
  title: string;
  description?: string;
  category?: 'observation' | 'risk' | 'opportunity' | 'feedback';
}

interface ExtractionData {
  summary?: string;
  keyPoints?: string[];
  actions?: ExtractedAction[];
  decisions?: ExtractedDecision[];
  insights?: ExtractedInsight[];
}

export default function NoteExtractor() {
  const [notes, setNotes] = useState('');
  const [context, setContext] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractionData | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  const [selectedDecisions, setSelectedDecisions] = useState<Set<number>>(new Set());
  const [selectedInsights, setSelectedInsights] = useState<Set<number>>(new Set());
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data)
  });

  const extractMutation = useMutation({
    mutationFn: () => apiHelpers.extractActions(notes, context),
    onSuccess: (response) => {
      const data = response.data.data as ExtractionData;
      setExtractedData(data);
      // Select all by default
      setSelectedActions(new Set(data.actions?.map((_: any, i: number) => i) || []));
      setSelectedDecisions(new Set(data.decisions?.map((_: any, i: number) => i) || []));
      setSelectedInsights(new Set(data.insights?.map((_: any, i: number) => i) || []));
      toast.success('Extraction complete');
    },
    onError: () => {
      toast.error('Failed to extract. Check your AI provider settings.');
    }
  });

  const createActionsMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const promises = items.map(item => apiHelpers.createAction(item));
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['actionStats'] });
      toast.success(`Created ${variables.length} item(s)`);
      setExtractedData(null);
      setNotes('');
      setContext('');
      setSelectedActions(new Set());
      setSelectedDecisions(new Set());
      setSelectedInsights(new Set());
    },
    onError: () => {
      toast.error('Failed to create some items');
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

  const toggleDecision = (index: number) => {
    const newSelected = new Set(selectedDecisions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedDecisions(newSelected);
  };

  const toggleInsight = (index: number) => {
    const newSelected = new Set(selectedInsights);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedInsights(newSelected);
  };

  const handleCreateAll = () => {
    if (!extractedData) return;
    
    const itemsToCreate: any[] = [];
    
    // Add selected actions
    extractedData.actions
      ?.filter((_: any, i: number) => selectedActions.has(i))
      .forEach((action: ExtractedAction) => {
        itemsToCreate.push({
          title: action.title,
          description: action.description,
          priority: action.priority?.toUpperCase() || 'MEDIUM',
          dueDate: action.dueDate || undefined,
          type: 'ACTION',
          isBlocker: action.isBlocker || false,
          source: 'AI_EXTRACTED'
        });
      });
    
    // Add selected decisions
    extractedData.decisions
      ?.filter((_: any, i: number) => selectedDecisions.has(i))
      .forEach((decision: ExtractedDecision) => {
        itemsToCreate.push({
          title: decision.title,
          description: decision.description || decision.context,
          type: 'DECISION',
          priority: 'MEDIUM',
          source: 'AI_EXTRACTED'
        });
      });
    
    // Add selected insights
    extractedData.insights
      ?.filter((_: any, i: number) => selectedInsights.has(i))
      .forEach((insight: ExtractedInsight) => {
        itemsToCreate.push({
          title: insight.title,
          description: insight.description,
          type: 'INSIGHT',
          priority: insight.category === 'risk' ? 'HIGH' : 'LOW',
          source: 'AI_EXTRACTED'
        });
      });
    
    if (itemsToCreate.length === 0) {
      toast.error('Select at least one item to create');
      return;
    }
    
    createActionsMutation.mutate(itemsToCreate);
  };

  const totalSelected = selectedActions.size + selectedDecisions.size + selectedInsights.size;

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
                        setSelectedDecisions(new Set());
                        setSelectedInsights(new Set());
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
                                {action.isBlocker && (
                                      <Badge size="sm" variant="danger">
                                        Blocker
                                      </Badge>
                                    )}
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

                    {/* Decisions */}
                    {extractedData.decisions && extractedData.decisions.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                            <Scale className="w-4 h-4 text-blue-500" />
                            Decisions ({selectedDecisions.size} selected)
                          </h4>
                          <button
                            onClick={() => {
                              if (selectedDecisions.size === extractedData.decisions!.length) {
                                setSelectedDecisions(new Set());
                              } else {
                                setSelectedDecisions(new Set(
                                  extractedData.decisions!.map((_: any, i: number) => i)
                                ));
                              }
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            {selectedDecisions.size === extractedData.decisions.length 
                              ? 'Deselect all' 
                              : 'Select all'}
                          </button>
                        </div>
                        <ul className="space-y-2">
                          {extractedData.decisions.map((decision: ExtractedDecision, i: number) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={cn(
                                "p-3 rounded-xl border-2 transition-colors cursor-pointer",
                                selectedDecisions.has(i)
                                  ? "border-blue-300 bg-blue-50/50"
                                  : "border-surface hover:border-blue-200"
                              )}
                              onClick={() => toggleDecision(i)}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                                  selectedDecisions.has(i)
                                    ? "border-blue-500 bg-blue-500 text-white"
                                    : "border-text-muted"
                                )}>
                                  {selectedDecisions.has(i) && <CheckSquare className="w-3 h-3" />}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-text-primary">{decision.title}</p>
                                  {decision.description && (
                                    <p className="text-sm text-text-secondary mt-0.5">
                                      {decision.description}
                                    </p>
                                  )}
                                  {decision.participants && decision.participants.length > 0 && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-text-muted">
                                      <span>Participants:</span>
                                      {decision.participants.join(', ')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Insights */}
                    {extractedData.insights && extractedData.insights.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            Insights ({selectedInsights.size} selected)
                          </h4>
                          <button
                            onClick={() => {
                              if (selectedInsights.size === extractedData.insights!.length) {
                                setSelectedInsights(new Set());
                              } else {
                                setSelectedInsights(new Set(
                                  extractedData.insights!.map((_: any, i: number) => i)
                                ));
                              }
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            {selectedInsights.size === extractedData.insights.length 
                              ? 'Deselect all' 
                              : 'Select all'}
                          </button>
                        </div>
                        <ul className="space-y-2">
                          {extractedData.insights.map((insight: ExtractedInsight, i: number) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className={cn(
                                "p-3 rounded-xl border-2 transition-colors cursor-pointer",
                                selectedInsights.has(i)
                                  ? "border-amber-300 bg-amber-50/50"
                                  : "border-surface hover:border-amber-200"
                              )}
                              onClick={() => toggleInsight(i)}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                                  selectedInsights.has(i)
                                    ? "border-amber-500 bg-amber-500 text-white"
                                    : "border-text-muted"
                                )}>
                                  {selectedInsights.has(i) && <CheckSquare className="w-3 h-3" />}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-text-primary">{insight.title}</p>
                                  {insight.description && (
                                    <p className="text-sm text-text-secondary mt-0.5">
                                      {insight.description}
                                    </p>
                                  )}
                                  {insight.category && (
                                    <Badge 
                                      size="sm" 
                                      variant={insight.category === 'risk' ? 'danger' : 'secondary'}
                                      className="mt-2"
                                    >
                                      {insight.category}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Create All Button */}
                    {totalSelected > 0 && (
                      <Button
                        onClick={handleCreateAll}
                        isLoading={createActionsMutation.isPending}
                        disabled={totalSelected === 0}
                        className="w-full"
                        leftIcon={<Plus className="w-5 h-5" />}
                      >
                        Create {totalSelected} Item{totalSelected !== 1 ? 's' : ''}
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

