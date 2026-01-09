import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Users,
  CheckSquare,
  Calendar,
  UserPlus,
  X,
  Briefcase,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Plus,
  FileText,
  Sparkles,
  MessageSquare,
  Target,
  Lightbulb
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, formatStatus, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ORDER, EXTERNAL_ROLES, SECONDARY_ROLES } from '@athena/shared';

// Types
interface TeamMember {
  id: string;
  teamId: string;
  employeeId?: string;
  employee?: {
    id: string;
    name: string;
    email?: string;
    role: string;
    avatarUrl?: string;
    status: string;
  };
  isExternal: boolean;
  isAutoIncluded?: boolean;
  name?: string;
  email?: string;
  role: string;
  secondaryRole?: string;
}

interface TeamNote {
  id: string;
  content: string;
  type: string;
  draftActions?: DraftAction[];
  createdAt: string;
}

interface DraftAction {
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  priority?: string;
  dueDate?: string;
  approved?: boolean;
}

const NOTE_TYPES = [
  { value: 'GENERAL', label: 'General', icon: FileText },
  { value: 'MEETING', label: 'Meeting Notes', icon: MessageSquare },
  { value: 'RETROSPECTIVE', label: 'Retrospective', icon: Target },
  { value: 'PLANNING', label: 'Planning', icon: Calendar },
  { value: 'DISCOVERY', label: 'Discovery', icon: Lightbulb }
];

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // UI State
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedNote, setSelectedNote] = useState<TeamNote | null>(null);

  // Queries
  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => apiHelpers.getTeam(id!).then(r => r.data.data)
  });

  const { data: teamNotes, isLoading: notesLoading } = useQuery({
    queryKey: ['teamNotes', id],
    queryFn: () => apiHelpers.getTeamNotes(id!).then(r => r.data.data),
    enabled: !!id
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data)
  });

  const { data: workAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: () => apiHelpers.deleteTeam(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      navigate('/teams');
      toast.success('Team deleted');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.updateTeam(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsEditModalOpen(false);
      toast.success('Team updated');
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.addTeamMember(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsAddMemberModalOpen(false);
      toast.success('Member added');
    }
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: any }) => 
      apiHelpers.updateTeamMember(id!, memberId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      setEditingMember(null);
      toast.success('Member updated');
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => apiHelpers.removeTeamMember(id!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Member removed');
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: (data: { content: string; type: string; draftActions?: DraftAction[] }) => 
      apiHelpers.addTeamNote(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamNotes', id] });
      setIsAddNoteModalOpen(false);
      toast.success('Note added');
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => apiHelpers.deleteTeamNote(id!, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamNotes', id] });
      setSelectedNote(null);
      toast.success('Note deleted');
    }
  });

  const createActionMutation = useMutation({
    mutationFn: (data: any) => apiHelpers.createAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      toast.success('Action created');
    }
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!team) {
    return <div>Team not found</div>;
  }

  // Group members by role hierarchy
  const membersByRole = team.members?.reduce((acc: Record<string, TeamMember[]>, member: TeamMember) => {
    if (!acc[member.role]) acc[member.role] = [];
    acc[member.role].push(member);
    return acc;
  }, {} as Record<string, TeamMember[]>) || {};

  // Get available employees for adding
  const availableEmployees = employees?.filter(
    (emp: any) => {
      const isExplicitMember = team.members?.some((m: TeamMember) => 
        !m.isAutoIncluded && m.employeeId === emp.id
      );
      return !isExplicitMember;
    }
  ) || [];

  // Separate external stakeholders from team members
  const externalMembers = team.members?.filter((m: TeamMember) => 
    m.isExternal || EXTERNAL_ROLES.includes(m.role)
  ) || [];
  
  const internalMembers = team.members?.filter((m: TeamMember) => 
    !m.isExternal && !EXTERNAL_ROLES.includes(m.role)
  ) || [];

  // Create action from draft
  const handleCreateAction = (draft: DraftAction) => {
    createActionMutation.mutate({
      title: draft.title,
      description: draft.description,
      employeeId: draft.assigneeId,
      teamId: id,
      priority: draft.priority || 'MEDIUM',
      dueDate: draft.dueDate
    });
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Main Content Area */}
      <div className={cn(
        "flex-1 overflow-auto p-6 transition-all duration-300",
        isPanelOpen ? "mr-80" : "mr-0"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/teams')}
              className="p-2 rounded-lg hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${team.color}20` }}
            >
              <Users className="w-7 h-7" style={{ color: team.color }} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-wider text-text-primary uppercase">
                {team.name}
              </h1>
              {team.description && (
                <p className="text-text-secondary mt-1">{team.description}</p>
              )}
              {team.workArea && (
                <span 
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mt-2"
                  style={{ 
                    backgroundColor: `${team.workArea.color}20`,
                    color: team.workArea.color 
                  }}
                >
                  <Briefcase className="w-3 h-3" />
                  {team.workArea.name}
                </span>
              )}
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
                if (confirm('Are you sure you want to delete this team?')) {
                  deleteMutation.mutate();
                }
              }}
            >
              <Trash2 className="w-4 h-4 text-danger" />
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-text-primary">{team.members?.length || 0}</div>
            <div className="text-xs text-text-muted uppercase tracking-wide">Members</div>
          </Card>
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-primary">{team.actions?.length || 0}</div>
            <div className="text-xs text-text-muted uppercase tracking-wide">Active Actions</div>
          </Card>
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-secondary">{team.events?.length || 0}</div>
            <div className="text-xs text-text-muted uppercase tracking-wide">Upcoming Events</div>
          </Card>
          <Card className="text-center py-4">
            <div className="text-2xl font-bold text-accent">{teamNotes?.length || 0}</div>
            <div className="text-xs text-text-muted uppercase tracking-wide">Notes</div>
          </Card>
        </div>

        {/* Team Notes Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <CardTitle className="font-display tracking-wide">TEAM NOTES & INSIGHTS</CardTitle>
              </div>
              <Button 
                size="sm" 
                onClick={() => setIsAddNoteModalOpen(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Note
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {notesLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : teamNotes && teamNotes.length > 0 ? (
              <div className="space-y-3">
                {teamNotes.slice(0, 5).map((note: TeamNote) => {
                  const noteType = NOTE_TYPES.find(t => t.value === note.type) || NOTE_TYPES[0];
                  const NoteIcon = noteType.icon;
                  const hasDrafts = note.draftActions && note.draftActions.length > 0;
                  
                  return (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-surface rounded-xl hover:bg-surface/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedNote(note)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-white">
                          <NoteIcon className="w-4 h-4 text-text-muted" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge size="sm" variant="secondary">{noteType.label}</Badge>
                            <span className="text-xs text-text-muted">
                              {formatDate(note.createdAt, { month: 'short', day: 'numeric' })}
                            </span>
                            {hasDrafts && (
                              <Badge size="sm" className="bg-warning/20 text-warning">
                                <Sparkles className="w-3 h-3 mr-1" />
                                {note.draftActions?.filter(d => !d.approved).length} drafts
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-text-primary line-clamp-2">
                            {note.content}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No team notes yet</p>
                <p className="text-xs mt-1">Add meeting notes, discoveries, or planning insights</p>
                <Button 
                  variant="ghost" 
                  className="mt-4"
                  onClick={() => setIsAddNoteModalOpen(true)}
                >
                  Add your first note
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions & Events */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-primary" />
                  <CardTitle>Active Actions</CardTitle>
                </div>
                <Button size="sm" variant="ghost" leftIcon={<Plus className="w-4 h-4" />}>
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {team.actions?.length > 0 ? (
                <ul className="space-y-2">
                  {team.actions.map((action: any) => (
                    <li key={action.id} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckSquare className={cn(
                          "w-4 h-4",
                          action.status === 'COMPLETED' ? 'text-success' : 'text-text-muted'
                        )} />
                        <div>
                          <p className="font-medium text-text-primary text-sm">{action.title}</p>
                          {action.employee && (
                            <p className="text-xs text-text-muted">{action.employee.name}</p>
                          )}
                        </div>
                      </div>
                      <Badge size="sm" variant={action.status === 'COMPLETED' ? 'success' : 'default'}>
                        {formatStatus(action.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted text-center py-4">No active actions</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-secondary" />
                  <CardTitle>Upcoming Events</CardTitle>
                </div>
                <Button size="sm" variant="ghost" leftIcon={<Plus className="w-4 h-4" />}>
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {team.events?.length > 0 ? (
                <ul className="space-y-2">
                  {team.events.map((event: any) => (
                    <li key={event.id} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-text-muted" />
                        <div>
                          <p className="font-medium text-text-primary text-sm">{event.title}</p>
                          <p className="text-xs text-text-muted">
                            {formatDate(event.startTime, { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {event.eventType && (
                        <Badge size="sm" style={{ backgroundColor: `${event.eventType.color}20`, color: event.eventType.color }}>
                          {event.eventType.name}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted text-center py-4">No upcoming events</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Side Panel Toggle */}
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-20 p-2 bg-white rounded-l-xl shadow-lg border border-r-0 border-surface transition-all",
          isPanelOpen ? "right-80" : "right-0"
        )}
      >
        {isPanelOpen ? (
          <ChevronRight className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {/* Right Side Panel - Team Structure */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-16 bottom-0 w-80 bg-white border-l border-surface overflow-auto p-4"
          >
            {/* Stakeholders */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-sm font-semibold tracking-wide uppercase text-text-primary">
                    Stakeholders
                  </h3>
                </div>
                <button 
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="p-1 rounded-lg hover:bg-surface transition-colors"
                >
                  <Plus className="w-4 h-4 text-text-muted" />
                </button>
              </div>
              
              {externalMembers.length > 0 ? (
                <div className="space-y-2">
                  {externalMembers.map((member: TeamMember) => (
                    <MemberCard 
                      key={member.id}
                      member={member}
                      compact
                      onEdit={() => setEditingMember(member)}
                      onRemove={() => removeMemberMutation.mutate(member.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted text-center py-3">No stakeholders assigned</p>
              )}
            </div>

            {/* Team Structure */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-secondary" />
                  <h3 className="font-display text-sm font-semibold tracking-wide uppercase text-text-primary">
                    Team Members
                  </h3>
                </div>
                <button 
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="p-1 rounded-lg hover:bg-surface transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              {internalMembers.length > 0 ? (
                <div className="space-y-4">
                  {ROLE_ORDER.filter(role => !EXTERNAL_ROLES.includes(role) && membersByRole[role]?.length > 0).map((role) => {
                    const membersInRole = membersByRole[role] || [];
                    if (membersInRole.length === 0) return null;
                    
                    return (
                      <div key={role}>
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ 
                              backgroundColor: `${ROLE_COLORS[role] || ROLE_COLORS.OTHER}20`,
                              color: ROLE_COLORS[role] || ROLE_COLORS.OTHER
                            }}
                          >
                            {ROLE_LABELS[role] || role}
                          </span>
                          <span className="text-xs text-text-muted">({membersInRole.length})</span>
                        </div>
                        <div className="space-y-1">
                          {membersInRole.map((member: TeamMember) => (
                            <MemberCard 
                              key={member.id}
                              member={member}
                              compact
                              onEdit={() => setEditingMember(member)}
                              onRemove={member.isAutoIncluded ? undefined : () => removeMemberMutation.mutate(member.id)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-text-muted">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No team members</p>
                  <p className="text-xs mt-1">Employees with team "{team.name}" appear here</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <EditTeamModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        team={team}
        workAreas={workAreas || []}
        onSubmit={(data: Record<string, unknown>) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        employees={availableEmployees}
        onSubmit={(data: Record<string, unknown>) => addMemberMutation.mutate(data)}
        isLoading={addMemberMutation.isPending}
      />

      <EditMemberModal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        member={editingMember}
        onSubmit={(data: Record<string, unknown>) => editingMember && updateMemberMutation.mutate({ memberId: editingMember.id, data })}
        isLoading={updateMemberMutation.isPending}
      />

      <AddNoteModal
        isOpen={isAddNoteModalOpen}
        onClose={() => setIsAddNoteModalOpen(false)}
        onSubmit={(data: { content: string; type: string; draftActions?: DraftAction[] }) => addNoteMutation.mutate(data)}
        isLoading={addNoteMutation.isPending}
      />

      <NoteDetailModal
        isOpen={!!selectedNote}
        onClose={() => setSelectedNote(null)}
        note={selectedNote}
        onDelete={(noteId) => deleteNoteMutation.mutate(noteId)}
        onCreateAction={handleCreateAction}
      />
    </div>
  );
}

// ============================================
// Member Card Component
// ============================================
function MemberCard({ member, onEdit, onRemove }: { 
  member: TeamMember; 
  compact?: boolean;
  onEdit: () => void;
  onRemove?: () => void;
}) {
  const name = member.isExternal ? member.name : member.employee?.name;
  const avatarUrl = member.employee?.avatarUrl;
  
  return (
    <div className={cn(
      "group relative bg-surface rounded-lg p-2 hover:bg-surface/80 transition-colors",
      member.isAutoIncluded && "border border-dashed border-border"
    )}>
      <div className="flex items-center gap-2">
        <Avatar name={name || 'Unknown'} src={avatarUrl} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{name}</p>
          {member.secondaryRole && (
            <span 
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${ROLE_COLORS[member.secondaryRole]}20`,
                color: ROLE_COLORS[member.secondaryRole]
              }}
            >
              + {ROLE_LABELS[member.secondaryRole]}
            </span>
          )}
          {member.isAutoIncluded && (
            <span className="text-xs text-text-muted">(auto)</span>
          )}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button onClick={onEdit} className="p-1 rounded hover:bg-white transition-colors">
            <Edit2 className="w-3 h-3 text-text-muted" />
          </button>
          {onRemove && (
            <button onClick={onRemove} className="p-1 rounded hover:bg-danger/10 transition-colors">
              <X className="w-3 h-3 text-danger" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Edit Team Modal
// ============================================
function EditTeamModal({ isOpen, onClose, team, workAreas, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    name: team?.name || '',
    description: team?.description || '',
    color: team?.color || '#7BA087',
    workAreaId: team?.workAreaId || ''
  });

  const colorOptions = [
    { value: '#7BA087', label: 'Sage Green' },
    { value: '#D4A574', label: 'Warm Gold' },
    { value: '#E8B86D', label: 'Bright Gold' },
    { value: '#CD7F6E', label: 'Terracotta' },
    { value: '#8FBC8F', label: 'Forest Green' },
    { value: '#DAA520', label: 'Goldenrod' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, workAreaId: formData.workAreaId || null });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Team">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Team Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the team's purpose..."
        />
        <Select
          label="Work Area"
          value={formData.workAreaId}
          onChange={(e) => setFormData({ ...formData, workAreaId: e.target.value })}
          options={[
            { value: '', label: 'No area' },
            ...workAreas.map((area: any) => ({ value: area.id, label: area.name }))
          ]}
        />
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
              />
            ))}
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

// ============================================
// Add Member Modal
// ============================================
function AddMemberModal({ isOpen, onClose, employees, onSubmit, isLoading }: any) {
  const [memberType, setMemberType] = useState<'internal' | 'external'>('internal');
  const [formData, setFormData] = useState({
    employeeId: '',
    role: 'OTHER',
    secondaryRole: '',
    name: '',
    email: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (memberType === 'external') {
      onSubmit({
        isExternal: true,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        secondaryRole: formData.secondaryRole || null
      });
    } else {
      onSubmit({
        employeeId: formData.employeeId,
        role: formData.role,
        secondaryRole: formData.secondaryRole || null
      });
    }
  };

  const internalRoles = ROLE_ORDER.filter(r => !EXTERNAL_ROLES.includes(r));
  const externalRoles = EXTERNAL_ROLES;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Team Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 p-1 bg-surface rounded-lg">
          <button
            type="button"
            onClick={() => { setMemberType('internal'); setFormData({ ...formData, role: 'OTHER' }); }}
            className={cn(
              "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all",
              memberType === 'internal' ? "bg-white shadow text-text-primary" : "text-text-muted hover:text-text-primary"
            )}
          >
            Team Member
          </button>
          <button
            type="button"
            onClick={() => { setMemberType('external'); setFormData({ ...formData, role: 'PROJECT_LEADER' }); }}
            className={cn(
              "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all",
              memberType === 'external' ? "bg-white shadow text-text-primary" : "text-text-muted hover:text-text-primary"
            )}
          >
            Stakeholder
          </button>
        </div>

        {memberType === 'internal' ? (
          <>
            <Select
              label="Employee"
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              options={[
                { value: '', label: 'Select employee...' },
                ...employees.map((emp: any) => ({ value: emp.id, label: `${emp.name} - ${emp.role}` }))
              ]}
              required
            />
            <Select
              label="Role in Team"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={internalRoles.map(role => ({ value: role, label: ROLE_LABELS[role] || role }))}
            />
            <Select
              label="Secondary Role (optional)"
              value={formData.secondaryRole}
              onChange={(e) => setFormData({ ...formData, secondaryRole: e.target.value })}
              options={[
                { value: '', label: 'None' },
                ...SECONDARY_ROLES.map(role => ({ value: role, label: ROLE_LABELS[role] || role }))
              ]}
            />
          </>
        ) : (
          <>
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. John Smith"
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@company.com"
            />
            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={externalRoles.map(role => ({ value: role, label: ROLE_LABELS[role] || role }))}
            />
          </>
        )}

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            isLoading={isLoading} 
            disabled={memberType === 'internal' ? !formData.employeeId : !formData.name}
          >
            Add {memberType === 'external' ? 'Stakeholder' : 'Member'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ============================================
// Edit Member Modal
// ============================================
function EditMemberModal({ isOpen, onClose, member, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    role: 'OTHER',
    secondaryRole: '',
    name: '',
    email: ''
  });

  useEffect(() => {
    if (member) {
      setFormData({
        role: member.role || 'OTHER',
        secondaryRole: member.secondaryRole || '',
        name: member.name || '',
        email: member.email || ''
      });
    }
  }, [member]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      role: formData.role,
      secondaryRole: formData.secondaryRole || null,
      ...(member?.isExternal && { name: formData.name, email: formData.email }),
      ...(member?.isAutoIncluded && member?.employeeId && { employeeId: member.employeeId })
    });
  };

  if (!member) return null;

  const isExternal = member.isExternal || EXTERNAL_ROLES.includes(member.role);
  const availableRoles = isExternal ? EXTERNAL_ROLES : ROLE_ORDER.filter(r => !EXTERNAL_ROLES.includes(r));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        {member.isExternal && (
          <>
            <Input
              label="Name"
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
          </>
        )}
        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          options={availableRoles.map(role => ({ value: role, label: ROLE_LABELS[role] || role }))}
        />
        {!isExternal && (
          <Select
            label="Secondary Role"
            value={formData.secondaryRole}
            onChange={(e) => setFormData({ ...formData, secondaryRole: e.target.value })}
            options={[
              { value: '', label: 'None' },
              ...SECONDARY_ROLES.map(role => ({ value: role, label: ROLE_LABELS[role] || role }))
            ]}
          />
        )}
        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Save Changes</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ============================================
// Add Note Modal with AI Extraction
// ============================================
function AddNoteModal({ isOpen, onClose, onSubmit, isLoading }: any) {
  const [content, setContent] = useState('');
  const [type, setType] = useState('GENERAL');
  const [isExtracting, setIsExtracting] = useState(false);
  const [draftActions, setDraftActions] = useState<DraftAction[]>([]);

  const handleExtractActions = async () => {
    if (!content.trim()) return;
    
    setIsExtracting(true);
    try {
      const response = await apiHelpers.extractActions(content, 'team meeting notes - extract only work/project related actions, NOT personal 1:1s or personal development items');
      const extracted = response.data.data?.actions || [];
      
      // Map extracted actions to draft format, filtering out personal items
      const drafts: DraftAction[] = extracted
        .filter((a: any) => {
          const lower = (a.title || '').toLowerCase();
          // Filter out personal/1:1 related items
          return !lower.includes('1:1') && 
                 !lower.includes('one-on-one') && 
                 !lower.includes('personal') &&
                 !lower.includes('career') &&
                 !lower.includes('feedback session');
        })
        .map((a: any) => ({
          title: a.title,
          description: a.description,
          assigneeName: a.assignee,
          priority: a.priority || 'MEDIUM',
          dueDate: a.dueDate,
          approved: false
        }));
      
      setDraftActions(drafts);
      
      if (drafts.length === 0 && extracted.length > 0) {
        toast('Filtered out personal items. Only work-related actions are shown.', { icon: 'ℹ️' });
      } else if (drafts.length > 0) {
        toast.success(`Found ${drafts.length} potential actions`);
      } else {
        toast('No work-related actions found in the notes', { icon: 'ℹ️' });
      }
    } catch (error) {
      console.error('Extract error:', error);
      toast.error('Failed to extract actions');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      content,
      type,
      draftActions: draftActions.length > 0 ? draftActions : undefined
    });
    // Reset form
    setContent('');
    setType('GENERAL');
    setDraftActions([]);
  };

  const toggleDraftApproval = (index: number) => {
    setDraftActions(prev => prev.map((d, i) => 
      i === index ? { ...d, approved: !d.approved } : d
    ));
  };

  const removeDraft = (index: number) => {
    setDraftActions(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Team Note" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Note Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={NOTE_TYPES.map(t => ({ value: t.value, label: t.label }))}
        />
        
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-text-secondary">
              Content
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleExtractActions}
              isLoading={isExtracting}
              leftIcon={<Sparkles className="w-4 h-4" />}
              disabled={!content.trim()}
            >
              Extract Actions
            </Button>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter meeting notes, decisions, discoveries..."
            rows={6}
            required
          />
        </div>

        {/* Draft Actions Preview */}
        {draftActions.length > 0 && (
          <div className="border border-warning/30 rounded-xl p-4 bg-warning/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium text-text-primary">
                Extracted Actions (Review & Approve)
              </span>
            </div>
            <div className="space-y-2">
              {draftActions.map((draft, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg transition-colors",
                    draft.approved ? "bg-success/10 border border-success/30" : "bg-white border border-border"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleDraftApproval(idx)}
                    className={cn(
                      "mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                      draft.approved 
                        ? "bg-success border-success text-white" 
                        : "border-border hover:border-primary"
                    )}
                  >
                    {draft.approved && <CheckSquare className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{draft.title}</p>
                    {draft.assigneeName && (
                      <p className="text-xs text-text-muted">Assignee: {draft.assigneeName}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDraft(idx)}
                    className="p-1 rounded hover:bg-danger/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-danger" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">
              Approved actions will be saved as drafts. Create them from the note detail view.
            </p>
          </div>
        )}

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Save Note</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ============================================
// Note Detail Modal
// ============================================
function NoteDetailModal({ isOpen, onClose, note, onDelete, onCreateAction }: {
  isOpen: boolean;
  onClose: () => void;
  note: TeamNote | null;
  onDelete: (noteId: string) => void;
  onCreateAction: (draft: DraftAction) => void;
}) {
  if (!note) return null;
  
  const noteType = NOTE_TYPES.find(t => t.value === note.type) || NOTE_TYPES[0];
  const pendingDrafts = note.draftActions?.filter(d => !d.approved) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Note Details" size="lg">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge>{noteType.label}</Badge>
          <span className="text-sm text-text-muted">
            {formatDate(note.createdAt, { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="p-4 bg-surface rounded-xl">
          <p className="text-text-primary whitespace-pre-wrap">{note.content}</p>
        </div>

        {/* Draft Actions */}
        {pendingDrafts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium text-text-primary">
                Draft Actions to Create
              </span>
            </div>
            <div className="space-y-2">
              {pendingDrafts.map((draft, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{draft.title}</p>
                    {draft.assigneeName && (
                      <p className="text-xs text-text-muted">For: {draft.assigneeName}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onCreateAction(draft)}
                    leftIcon={<Plus className="w-3 h-3" />}
                  >
                    Create
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <ModalFooter>
          <Button 
            variant="ghost" 
            onClick={() => {
              if (confirm('Delete this note?')) {
                onDelete(note.id);
              }
            }}
            className="text-danger"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Note
          </Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}

