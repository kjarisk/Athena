import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Users, Briefcase } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ROLE_COLORS, ROLE_LABELS } from '@athena/shared';

// Use shared constants - roleColors and roleLabels now come from @athena/shared

export default function TeamList() {
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiHelpers.getTeams().then(r => r.data.data)
  });

  const { data: workAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

  const createMutation = useMutation({
    mutationFn: apiHelpers.createTeam,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setIsCreateModalOpen(false);
      toast.success('Team created');
    }
  });

  const filteredTeams = teams?.filter((team: any) =>
    team.name.toLowerCase().includes(search.toLowerCase()) ||
    team.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-text-primary uppercase">
            Teams
          </h1>
          <p className="text-text-secondary mt-1">
            Manage your teams and their composition
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
          Create Team
        </Button>
      </div>

      {/* Search */}
      <Card padding="sm">
        <Input
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-5 h-5" />}
        />
      </Card>

      {/* Teams Grid */}
      {filteredTeams && filteredTeams.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredTeams.map((team: any, index: number) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/teams/${team.id}`}>
                <Card 
                  className="h-full hover:border-primary/30 border-2 border-transparent transition-all"
                  style={{ borderColor: `${team.color}30` }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${team.color}20` }}
                    >
                      <Users className="w-6 h-6" style={{ color: team.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-text-primary tracking-wide">
                        {team.name}
                      </h3>
                      {team.description && (
                        <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">
                          {team.description}
                        </p>
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

                  {/* Role composition */}
                  <div className="mt-4 flex flex-wrap gap-1">
                    {team.members?.slice(0, 6).map((member: any) => (
                      <span 
                        key={member.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium"
                        style={{ 
                          backgroundColor: `${ROLE_COLORS[member.role] || ROLE_COLORS.OTHER}20`,
                          color: ROLE_COLORS[member.role] || ROLE_COLORS.OTHER
                        }}
                        title={`${member.employee.name} - ${ROLE_LABELS[member.role] || 'Other'}`}
                      >
                        {(ROLE_LABELS[member.role] || 'OT')?.slice(0, 2).toUpperCase()}
                      </span>
                    ))}
                    {team.members?.length > 6 && (
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium bg-surface text-text-muted">
                        +{team.members.length - 6}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mt-4 pt-4 border-t border-surface flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      {team._count?.members || 0} members
                    </span>
                    <div className="flex items-center gap-3 text-text-muted">
                      <span>{team._count?.actions || 0} actions</span>
                      <span>{team._count?.events || 0} events</span>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No teams yet"
          description="Create your first team to organize your people."
          action={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Team
            </Button>
          }
        />
      )}

      {/* Create Modal */}
      <CreateTeamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
        workAreas={workAreas || []}
      />
    </div>
  );
}

function CreateTeamModal({ isOpen, onClose, onSubmit, isLoading, workAreas }: any) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#7BA087',
    workAreaId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      workAreaId: formData.workAreaId || undefined
    });
  };

  const colorOptions = [
    { value: '#7BA087', label: 'Sage Green' },
    { value: '#D4A574', label: 'Warm Gold' },
    { value: '#E8B86D', label: 'Bright Gold' },
    { value: '#CD7F6E', label: 'Terracotta' },
    { value: '#8FBC8F', label: 'Forest Green' },
    { value: '#DAA520', label: 'Goldenrod' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Team">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Team Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Toolbox, PWEX, Frontend Squad"
          required
        />
        
        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What does this team work on?"
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

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Create Team</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

