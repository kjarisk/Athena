import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Plus,
  Users,
  CheckSquare,
  Calendar,
  UserPlus,
  X,
  Briefcase
} from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { formatDate, formatStatus, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ROLE_COLORS, ROLE_LABELS, ROLE_ORDER } from '@athena/shared';

// Use shared constants - roleColors, roleLabels, roleOrder now come from @athena/shared

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => apiHelpers.getTeam(id!).then(r => r.data.data)
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiHelpers.getEmployees().then(r => r.data.data)
  });

  const { data: workAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

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

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => apiHelpers.removeTeamMember(id!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Member removed');
    }
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) => 
      apiHelpers.updateTeamMember(id!, memberId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
    }
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!team) {
    return <div>Team not found</div>;
  }

  // Group members by role for the structure diagram
  const membersByRole = team.members?.reduce((acc: any, member: any) => {
    if (!acc[member.role]) acc[member.role] = [];
    acc[member.role].push(member);
    return acc;
  }, {}) || {};

  // Get employees not in team for adding
  const availableEmployees = employees?.filter(
    (emp: any) => !team.members?.some((m: any) => m.employee.id === emp.id)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
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

      {/* Team Structure Diagram */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display tracking-wide">TEAM STRUCTURE</CardTitle>
            <Button 
              size="sm" 
              onClick={() => setIsAddMemberModalOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Add Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {team.members?.length > 0 ? (
            <div className="relative">
              {/* Team Lead at top */}
              {membersByRole['TEAM_LEAD']?.length > 0 && (
                <div className="flex justify-center mb-8">
                  {membersByRole['TEAM_LEAD'].map((member: any) => (
                    <MemberCard 
                      key={member.id} 
                      member={member} 
                      onRemove={() => removeMemberMutation.mutate(member.id)}
                      onRoleChange={(role) => updateMemberRoleMutation.mutate({ memberId: member.id, role })}
                    />
                  ))}
                </div>
              )}

              {/* Connector line */}
              {membersByRole['TEAM_LEAD']?.length > 0 && Object.keys(membersByRole).filter(r => r !== 'TEAM_LEAD').length > 0 && (
                <div className="flex justify-center mb-4">
                  <div className="w-px h-8 bg-surface" />
                </div>
              )}

              {/* Other roles in a row */}
              <div className="flex flex-wrap justify-center gap-4">
                {ROLE_ORDER.filter(role => role !== 'TEAM_LEAD' && membersByRole[role]).map(role => (
                  <div key={role} className="flex flex-col items-center gap-2">
                    <span 
                      className="text-xs font-medium px-2 py-1 rounded-full"
                      style={{ 
                        backgroundColor: `${ROLE_COLORS[role] || ROLE_COLORS.OTHER}20`,
                        color: ROLE_COLORS[role] || ROLE_COLORS.OTHER
                      }}
                    >
                      {ROLE_LABELS[role] || 'Other'}
                    </span>
                    <div className="flex flex-wrap gap-2 justify-center max-w-xs">
                      {membersByRole[role].map((member: any) => (
                        <MemberCard 
                          key={member.id} 
                          member={member} 
                          compact
                          onRemove={() => removeMemberMutation.mutate(member.id)}
                          onRoleChange={(newRole) => updateMemberRoleMutation.mutate({ memberId: member.id, role: newRole })}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No team members yet</p>
              <Button 
                variant="ghost" 
                className="mt-2"
                onClick={() => setIsAddMemberModalOpen(true)}
              >
                Add your first member
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions & Events */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Team Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              <CardTitle>Team Actions</CardTitle>
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
              <p className="text-text-muted text-center py-4">No actions linked to this team</p>
            )}
          </CardContent>
        </Card>

        {/* Team Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-secondary" />
              <CardTitle>Team Events</CardTitle>
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
              <p className="text-text-muted text-center py-4">No events linked to this team</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Team Modal */}
      <EditTeamModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        team={team}
        workAreas={workAreas || []}
        onSubmit={(data) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        employees={availableEmployees}
        onSubmit={(data) => addMemberMutation.mutate(data)}
        isLoading={addMemberMutation.isPending}
      />
    </div>
  );
}

function MemberCard({ member, compact, onRemove, onRoleChange }: any) {
  const [showRoleSelect, setShowRoleSelect] = useState(false);

  return (
    <div 
      className={cn(
        "relative group bg-white rounded-xl border border-surface p-3 transition-all hover:shadow-md",
        compact ? "w-24" : "w-32"
      )}
    >
      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-5 h-5 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>

      <div className="flex flex-col items-center">
        <Avatar 
          name={member.employee.name} 
          src={member.employee.avatarUrl} 
          size={compact ? "md" : "lg"} 
        />
        <p className={cn(
          "font-medium text-text-primary text-center mt-2 truncate w-full",
          compact ? "text-xs" : "text-sm"
        )}>
          {member.employee.name}
        </p>
        {!compact && (
          <p className="text-xs text-text-muted truncate w-full text-center">
            {member.employee.role}
          </p>
        )}
        
        {/* Role badge - clickable to change */}
        <button
          onClick={() => setShowRoleSelect(!showRoleSelect)}
          className="mt-2 text-xs font-medium px-2 py-0.5 rounded-full transition-all hover:ring-2 hover:ring-offset-1"
          style={{ 
            backgroundColor: `${ROLE_COLORS[member.role] || ROLE_COLORS.OTHER}20`,
            color: ROLE_COLORS[member.role] || ROLE_COLORS.OTHER,
            ringColor: ROLE_COLORS[member.role] || ROLE_COLORS.OTHER
          }}
        >
          {ROLE_LABELS[member.role] || 'Other'}
        </button>

        {/* Role dropdown */}
        {showRoleSelect && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-surface py-1 z-10">
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  onRoleChange(value);
                  setShowRoleSelect(false);
                }}
                className={cn(
                  "w-full px-3 py-1.5 text-xs text-left hover:bg-surface transition-colors",
                  member.role === value && "bg-surface font-medium"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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
    onSubmit({
      ...formData,
      workAreaId: formData.workAreaId || null
    });
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
        />

        <Select
          label="Work Area"
          value={formData.workAreaId}
          onChange={(e) => setFormData({ ...formData, workAreaId: e.target.value })}
          options={[
            { value: '', label: 'No area' },
            ...workAreas.map((area: any) => ({ 
              value: area.id, 
              label: area.name 
            }))
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

function AddMemberModal({ isOpen, onClose, employees, onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    employeeId: '',
    role: 'OTHER'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Team Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Employee"
          value={formData.employeeId}
          onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
          options={[
            { value: '', label: 'Select employee...' },
            ...employees.map((emp: any) => ({ 
              value: emp.id, 
              label: `${emp.name} - ${emp.role}` 
            }))
          ]}
          required
        />

        <Select
          label="Role in Team"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          options={Object.entries(ROLE_LABELS).map(([value, label]) => ({
            value,
            label
          }))}
        />

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading} disabled={!formData.employeeId}>
            Add Member
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

