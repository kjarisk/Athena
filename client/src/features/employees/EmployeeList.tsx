import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Users, X, Briefcase, Sparkles } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import Combobox from '@/components/ui/Combobox';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { formatDate, formatStatus } from '@/lib/utils';
import { JOB_TITLE_SUGGESTIONS } from '@athena/shared';
import toast from 'react-hot-toast';

export default function EmployeeList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [workAreaFilter, setWorkAreaFilter] = useState(searchParams.get('workAreaId') || '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const areaId = searchParams.get('workAreaId');
    if (areaId) {
      setWorkAreaFilter(areaId);
    }
  }, [searchParams]);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees', { search, status: statusFilter, workAreaId: workAreaFilter }],
    queryFn: () => apiHelpers.getEmployees({ 
      search: search || undefined, 
      status: statusFilter || undefined,
      workAreaId: workAreaFilter || undefined
    } as any).then(r => r.data.data)
  });

  const { data: workAreas } = useQuery({
    queryKey: ['workAreas'],
    queryFn: () => apiHelpers.getWorkAreas().then(r => r.data.data)
  });

  const createMutation = useMutation({
    mutationFn: apiHelpers.createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['workAreas'] });
      setIsCreateModalOpen(false);
      toast.success('Employee added successfully');
    },
    onError: () => {
      toast.error('Failed to add employee');
    }
  });

  const clearAreaFilter = () => {
    setWorkAreaFilter('');
    setSearchParams({});
  };

  const activeArea = workAreas?.find((a: any) => a.id === workAreaFilter);

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-text-primary uppercase">Team</h1>
          <p className="text-text-secondary mt-1">
            Manage your direct reports and team members
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="w-5 h-5" />}>
          Add Team Member
        </Button>
      </div>

      {/* Active Area Filter Badge */}
      {activeArea && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Filtered by:</span>
          <Badge 
            variant="primary"
            className="flex items-center gap-2"
          >
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: activeArea.color }}
            />
            {activeArea.name}
            <button onClick={clearAreaFilter} className="ml-1 hover:bg-white/20 rounded p-0.5">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        </div>
      )}

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by name or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-5 h-5" />}
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'ON_LEAVE', label: 'On Leave' },
                { value: 'OFFBOARDING', label: 'Offboarding' },
                { value: 'OFFBOARDED', label: 'Offboarded' }
              ]}
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={workAreaFilter}
              onChange={(e) => {
                setWorkAreaFilter(e.target.value);
                if (e.target.value) {
                  setSearchParams({ workAreaId: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
              options={[
                { value: '', label: 'All Areas' },
                ...(workAreas || []).map((area: any) => ({ 
                  value: area.id, 
                  label: area.name 
                }))
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Employee Grid */}
      {employees && employees.length > 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {employees.map((employee: any, index: number) => (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={`/employees/${employee.id}`}>
                <Card className="h-full hover:border-primary/30 border-2 border-transparent">
                  <div className="flex items-start gap-4">
                    <Avatar name={employee.name} src={employee.avatarUrl} size="lg" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-primary truncate">
                        {employee.name}
                      </h3>
                      <p className="text-sm text-text-secondary truncate">
                        {employee.role}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {employee.team}
                      </p>
                    </div>
                    <Badge 
                      variant={employee.status === 'ACTIVE' ? 'success' : 'default'}
                      size="sm"
                    >
                      {formatStatus(employee.status)}
                    </Badge>
                  </div>

                  {/* Work Area Badge */}
                  {employee.workArea && (
                    <div className="mt-3">
                      <span 
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: `${employee.workArea.color}20`,
                          color: employee.workArea.color 
                        }}
                      >
                        <Briefcase className="w-3 h-3" />
                        {employee.workArea.name}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-surface flex items-center justify-between text-sm">
                    <span className="text-text-secondary">
                      Since {formatDate(employee.startDate, { month: 'short', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-3 text-text-muted">
                      <span>{employee._count?.actions || 0} actions</span>
                      <span>{employee._count?.oneOnOnes || 0} 1:1s</span>
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
          title="No team members yet"
          description="Add your first team member to start tracking their development and goals."
          action={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Add Team Member
            </Button>
          }
        />
      )}

      {/* Create Modal */}
      <CreateEmployeeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
        workAreas={workAreas || []}
      />
    </div>
  );
}

function CreateEmployeeModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading,
  workAreas
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: any) => void;
  isLoading: boolean;
  workAreas: any[];
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    teamId: '',
    startDate: new Date().toISOString().split('T')[0],
    workAreaId: '',
    birthday: '',
    skillNotes: ''
  });
  const [isExtractingSkills, setIsExtractingSkills] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    strengths: string[];
    growthAreas: string[];
  } | null>(null);

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiHelpers.getTeams().then(r => r.data.data),
    enabled: isOpen
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        email: '',
        role: '',
        teamId: '',
        startDate: new Date().toISOString().split('T')[0],
        workAreaId: '',
        birthday: '',
        skillNotes: ''
      });
      setExtractedData(null);
    }
  }, [isOpen]);

  const handleExtractSkills = async () => {
    if (!formData.skillNotes.trim()) {
      toast.error('Please enter some notes about the person first');
      return;
    }

    setIsExtractingSkills(true);
    try {
      const response = await apiHelpers.extractActions(
        formData.skillNotes,
        `Analyzing skills and competencies for ${formData.name || 'a new team member'}. Extract strengths and growth areas.`
      );
      
      const data = response.data.data;
      
      // Parse out strengths and growth areas from key points
      const strengths: string[] = [];
      const growthAreas: string[] = [];
      
      if (data.keyPoints) {
        data.keyPoints.forEach((point: string) => {
          const lowerPoint = point.toLowerCase();
          if (lowerPoint.includes('improve') || lowerPoint.includes('develop') || 
              lowerPoint.includes('learn') || lowerPoint.includes('growth') ||
              lowerPoint.includes('needs') || lowerPoint.includes('should')) {
            growthAreas.push(point);
          } else {
            strengths.push(point);
          }
        });
      }

      setExtractedData({
        strengths: strengths.slice(0, 5),
        growthAreas: growthAreas.slice(0, 5)
      });

      toast.success('Skills extracted! Review below.');
    } catch (error) {
      toast.error('Failed to extract skills. Make sure AI is configured.');
    } finally {
      setIsExtractingSkills(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get team name from selected team
    const selectedTeam = teams?.find((t: any) => t.id === formData.teamId);
    
    onSubmit({
      name: formData.name,
      email: formData.email || undefined,
      role: formData.role,
      team: selectedTeam?.name || 'Unassigned',
      startDate: formData.startDate,
      workAreaId: formData.workAreaId || undefined,
      birthday: formData.birthday || undefined,
      strengths: extractedData?.strengths || [],
      growthAreas: extractedData?.growthAreas || []
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Team Member"
      description="Add a new member to your team"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@company.com"
          />
        </div>
        
        <Combobox
          label="Role"
          value={formData.role}
          onChange={(value) => setFormData({ ...formData, role: value })}
          suggestions={JOB_TITLE_SUGGESTIONS}
          placeholder="Type or select a role..."
          required
          allowCustom
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Team (optional)"
            value={formData.teamId}
            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
            options={[
              { value: '', label: 'No team yet' },
              ...(teams || []).map((team: any) => ({ 
                value: team.id, 
                label: team.name 
              }))
            ]}
          />
          <Select
            label="Work Area (optional)"
            value={formData.workAreaId}
            onChange={(e) => setFormData({ ...formData, workAreaId: e.target.value })}
            options={[
              { value: '', label: 'No area yet' },
              ...workAreas.map((area: any) => ({ 
                value: area.id, 
                label: area.name 
              }))
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
          <Input
            label="Birthday (optional)"
            type="date"
            value={formData.birthday}
            onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
          />
        </div>

        {/* Skills & Notes Section */}
        <div className="border-t border-surface pt-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-text-secondary">
              Skills & Background (optional)
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleExtractSkills}
              isLoading={isExtractingSkills}
              leftIcon={<Sparkles className="w-4 h-4" />}
              disabled={!formData.skillNotes.trim()}
            >
              Extract with AI
            </Button>
          </div>
          <Textarea
            value={formData.skillNotes}
            onChange={(e) => setFormData({ ...formData, skillNotes: e.target.value })}
            placeholder="Describe their skills, experience, strengths, or areas for development...

Example: 'Strong in React and TypeScript. Has 5 years of frontend experience. Good communicator but could improve on documentation. Interested in learning backend development.'"
            className="min-h-[100px]"
          />
          
          {/* Extracted Skills Display */}
          {extractedData && (
            <div className="mt-3 p-3 bg-surface rounded-xl space-y-3">
              {extractedData.strengths.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-success mb-1">Strengths detected:</p>
                  <div className="flex flex-wrap gap-1">
                    {extractedData.strengths.map((s, i) => (
                      <span key={i} className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                        {s.length > 40 ? s.substring(0, 40) + '...' : s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {extractedData.growthAreas.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-warning mb-1">Growth areas detected:</p>
                  <div className="flex flex-wrap gap-1">
                    {extractedData.growthAreas.map((g, i) => (
                      <span key={i} className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">
                        {g.length > 40 ? g.substring(0, 40) + '...' : g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-text-muted">
                These will be saved to the team member's profile and shown on their competency radar.
              </p>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Add Member
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

