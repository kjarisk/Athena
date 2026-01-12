import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Plus,
  MessageSquare,
  Target,
  TrendingUp,
  Calendar,
  CheckSquare,
  Sparkles
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { formatDate, formatStatus, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Import extracted components
import { 
  AddNoteModal, 
  AddOneOnOneModal, 
  EditEmployeeModal, 
  DevelopmentTab 
} from './components';

const tabs = [
  { id: 'overview', label: 'Overview', icon: Target },
  { id: 'one-on-ones', label: '1:1s', icon: MessageSquare },
  { id: 'actions', label: 'Actions', icon: CheckSquare },
  { id: 'development', label: 'Development', icon: TrendingUp },
];

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isOneOnOneModalOpen, setIsOneOnOneModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => apiHelpers.getEmployee(id!).then(r => r.data.data)
  });

  const { data: workAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiHelpers.deleteEmployee(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate('/employees');
      toast.success('Employee removed');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.updateEmployee(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      setIsEditModalOpen(false);
      toast.success('Employee updated');
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.addEmployeeNote(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      setIsNoteModalOpen(false);
      toast.success('Note added');
    }
  });

  const addOneOnOneMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.addOneOnOne(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      setIsOneOnOneModalOpen(false);
      toast.success('1:1 recorded');
    }
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!employee) {
    return <div>Employee not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/employees')}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Avatar name={employee.name} src={employee.avatarUrl} size="xl" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wider text-text-primary uppercase">
              {employee.name}
            </h1>
            <p className="text-text-secondary">{employee.role}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={employee.status === 'ACTIVE' ? 'success' : 'default'}>
                {formatStatus(employee.status)}
              </Badge>
              <span className="text-sm text-text-muted">{employee.team}</span>
              {employee.workArea && (
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: `${employee.workArea.color}20`,
                    color: employee.workArea.color 
                  }}
                >
                  {employee.workArea.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsEditModalOpen(true)}>
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to remove this employee?')) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 className="w-4 h-4 text-danger" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <OverviewTab 
            employee={employee} 
            onAddNote={() => setIsNoteModalOpen(true)} 
          />
        )}

        {activeTab === 'one-on-ones' && (
          <OneOnOnesTab 
            employee={employee}
            onAddOneOnOne={() => setIsOneOnOneModalOpen(true)}
          />
        )}

        {activeTab === 'actions' && (
          <ActionsTab employee={employee} />
        )}

        {activeTab === 'development' && (
          <DevelopmentTab employee={employee} />
        )}
      </motion.div>

      {/* Modals */}
      <AddNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSubmit={(data) => addNoteMutation.mutate(data)}
        isLoading={addNoteMutation.isPending}
      />

      <AddOneOnOneModal
        isOpen={isOneOnOneModalOpen}
        onClose={() => setIsOneOnOneModalOpen(false)}
        onSubmit={(data) => addOneOnOneMutation.mutate(data)}
        isLoading={addOneOnOneMutation.isPending}
        employeeId={id}
        employee={employee}
      />

      <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employee={employee}
        workAreas={workAreas || []}
        onSubmit={(data) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}

// ============================================
// Overview Tab Component
// ============================================
function OverviewTab({ employee, onAddNote }: { employee: any; onAddNote: () => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-text-secondary">Email</dt>
              <dd className="font-medium">{employee.email || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Start Date</dt>
              <dd className="font-medium">{formatDate(employee.startDate)}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Team</dt>
              <dd className="font-medium">{employee.team}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strengths & Growth Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">Strengths</h4>
              <div className="flex flex-wrap gap-2">
                {employee.strengths?.length > 0 ? (
                  employee.strengths.map((s: string, i: number) => (
                    <Badge key={i} variant="success">{s}</Badge>
                  ))
                ) : (
                  <p className="text-text-muted text-sm">No strengths added yet</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-secondary mb-2">Growth Areas</h4>
              <div className="flex flex-wrap gap-2">
                {employee.growthAreas?.length > 0 ? (
                  employee.growthAreas.map((g: string, i: number) => (
                    <Badge key={i} variant="warning">{g}</Badge>
                  ))
                ) : (
                  <p className="text-text-muted text-sm">No growth areas identified yet</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="md:col-span-2 bg-gradient-ethereal border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle>AI Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {employee.oneOnOnes?.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-4">
              {/* Mood Trend */}
              <div className="p-4 bg-white/50 rounded-xl">
                <h4 className="text-sm font-medium text-text-secondary mb-2">Mood Trend</h4>
                <div className="flex items-center gap-2">
                  {employee.oneOnOnes.slice(0, 5).reverse().map((o: any, i: number) => (
                    <span key={i} className="text-xl" title={formatDate(o.date)}>
                      {['😟', '😕', '😐', '🙂', '😊'][o.mood - 1] || '😐'}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Last {Math.min(employee.oneOnOnes.length, 5)} 1:1s
                </p>
              </div>

              {/* Common Topics */}
              <div className="p-4 bg-white/50 rounded-xl">
                <h4 className="text-sm font-medium text-text-secondary mb-2">Common Topics</h4>
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const topicCounts: Record<string, number> = {};
                    employee.oneOnOnes.forEach((o: any) => {
                      o.topics?.forEach((t: string) => {
                        topicCounts[t] = (topicCounts[t] || 0) + 1;
                      });
                    });
                    return Object.entries(topicCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([topic, count]) => (
                        <Badge key={topic} size="sm" variant="secondary">
                          {topic} ({count})
                        </Badge>
                      ));
                  })()}
                </div>
              </div>

              {/* Last 1:1 Summary */}
              <div className="p-4 bg-white/50 rounded-xl">
                <h4 className="text-sm font-medium text-text-secondary mb-2">Last 1:1</h4>
                <p className="text-sm text-text-primary">
                  {formatDate(employee.oneOnOnes[0]?.date)}
                </p>
                {employee.oneOnOnes[0]?.followUps?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-text-muted">Follow-ups:</p>
                    <ul className="text-xs text-text-secondary">
                      {employee.oneOnOnes[0].followUps.slice(0, 2).map((f: string, i: number) => (
                        <li key={i} className="truncate">- {f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-text-muted text-center py-4">
              Record a 1:1 to start seeing insights
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Notes */}
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Notes</CardTitle>
            <Button size="sm" variant="ghost" onClick={onAddNote}>
              <Plus className="w-4 h-4 mr-1" /> Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {employee.notes?.length > 0 ? (
            <ul className="space-y-3">
              {employee.notes.map((note: any) => (
                <li key={note.id} className="p-3 bg-surface rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <Badge size="sm">{formatStatus(note.type)}</Badge>
                    <span className="text-xs text-text-muted">
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-text-primary">{note.content}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted text-center py-4">No notes yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// 1:1s Tab Component
// ============================================
function OneOnOnesTab({ employee, onAddOneOnOne }: { employee: any; onAddOneOnOne: () => void }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>1:1 History</CardTitle>
          <Button size="sm" onClick={onAddOneOnOne}>
            <Plus className="w-4 h-4 mr-1" /> Record 1:1
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {employee.oneOnOnes?.length > 0 ? (
          <ul className="space-y-4">
            {employee.oneOnOnes.map((oneOnOne: any) => (
              <li key={oneOnOne.id} className="p-4 bg-surface rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-text-muted" />
                    <span className="font-medium">{formatDate(oneOnOne.date)}</span>
                  </div>
                  {oneOnOne.mood && (
                    <span className="text-lg">
                      {['😟','😕','😐','🙂','😊'][oneOnOne.mood - 1]}
                    </span>
                  )}
                </div>
                {oneOnOne.topics?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {oneOnOne.topics.map((topic: string, i: number) => (
                      <Badge key={i} size="sm" variant="secondary">{topic}</Badge>
                    ))}
                  </div>
                )}
                {oneOnOne.notes && (
                  <p className="text-sm text-text-secondary">{oneOnOne.notes}</p>
                )}
                {oneOnOne.followUps?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-surface">
                    <p className="text-xs text-text-muted mb-1">Follow-ups:</p>
                    <ul className="text-sm space-y-1">
                      {oneOnOne.followUps.map((fu: string, i: number) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckSquare className="w-3 h-3 text-text-muted" />
                          {fu}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted text-center py-8">
            No 1:1s recorded yet. Schedule your first one!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Actions Tab Component
// ============================================
function ActionsTab({ employee }: { employee: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Actions</CardTitle>
      </CardHeader>
      <CardContent>
        {employee.actions?.length > 0 ? (
          <ul className="space-y-2">
            {employee.actions.map((action: any) => (
              <li key={action.id} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                <div className="flex items-center gap-3">
                  <CheckSquare className={cn(
                    "w-5 h-5",
                    action.status === 'COMPLETED' ? 'text-success' : 'text-text-muted'
                  )} />
                  <span className={cn(
                    action.status === 'COMPLETED' && 'line-through text-text-muted'
                  )}>
                    {action.title}
                  </span>
                </div>
                <Badge variant={action.status === 'COMPLETED' ? 'success' : 'default'} size="sm">
                  {formatStatus(action.status)}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted text-center py-8">
            No actions linked to this employee
          </p>
        )}
      </CardContent>
    </Card>
  );
}

