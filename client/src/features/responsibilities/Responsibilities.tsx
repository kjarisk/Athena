import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Target, Users, Briefcase, CheckCircle2 } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { LoadingPage } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const roleIcons = {
  TEAM_LEAD: Users,
  COMPETENCE_LEADER: Target,
  DEPARTMENT_MANAGER: Briefcase
};

const roleColors = {
  TEAM_LEAD: 'teamlead',
  COMPETENCE_LEADER: 'competence',
  DEPARTMENT_MANAGER: 'manager'
};

export default function Responsibilities() {
  const queryClient = useQueryClient();

  const { data: responsibilities, isLoading } = useQuery({
    queryKey: ['responsibilities'],
    queryFn: () => apiHelpers.getResponsibilities().then(r => r.data.data)
  });

  const { data: myResponsibilities } = useQuery({
    queryKey: ['myResponsibilities'],
    queryFn: () => apiHelpers.getMyResponsibilities().then(r => r.data.data)
  });

  const assignMutation = useMutation({
    mutationFn: (responsibilityId: string) => apiHelpers.assignResponsibility(responsibilityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responsibilities'] });
      queryClient.invalidateQueries({ queryKey: ['myResponsibilities'] });
      toast.success('Responsibility assigned');
    }
  });

  const unassignMutation = useMutation({
    mutationFn: (responsibilityId: string) => apiHelpers.unassignResponsibility(responsibilityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responsibilities'] });
      queryClient.invalidateQueries({ queryKey: ['myResponsibilities'] });
      toast.success('Responsibility removed');
    }
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  const myResponsibilityIds = new Set(
    myResponsibilities?.filter((r: any) => r.isActive).map((r: any) => r.responsibilityId) || []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-text-primary">Responsibilities</h1>
        <p className="text-text-secondary mt-1">
          Track your leadership responsibilities across different roles
        </p>
      </div>

      {/* Responsibilities Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {responsibilities?.map((resp: any) => {
          const Icon = roleIcons[resp.roleType as keyof typeof roleIcons] || Target;
          const color = roleColors[resp.roleType as keyof typeof roleColors] || 'primary';
          const isActive = myResponsibilityIds.has(resp.id);
          const myResp = myResponsibilities?.find((r: any) => r.responsibilityId === resp.id);
          const progress = myResp?.progress || 0;

          // Group areas by category
          const areasByCategory = resp.areas?.reduce((acc: any, area: any) => {
            if (!acc[area.category]) acc[area.category] = [];
            acc[area.category].push(area);
            return acc;
          }, {}) || {};

          return (
            <motion.div
              key={resp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col"
            >
              <Card 
                variant={resp.roleType.toLowerCase().replace('_', '') as any}
                className="flex-1 flex flex-col"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        `bg-${color}/10`
                      )}>
                        <Icon className={cn("w-5 h-5", `text-${color}`)} />
                      </div>
                      <div>
                        <CardTitle>{resp.name}</CardTitle>
                        {isActive && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden w-20">
                              <div 
                                className={cn("h-full rounded-full", `bg-${color}`)}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-text-muted">{progress}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {isActive ? (
                      <Badge variant="success" size="sm">Active</Badge>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => assignMutation.mutate(resp.id)}
                        isLoading={assignMutation.isPending}
                      >
                        Activate
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                    {Object.entries(areasByCategory).map(([category, areas]: [string, any]) => (
                      <div key={category}>
                        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                          {category}
                        </h4>
                        <ul className="space-y-1">
                          {areas.map((area: any) => (
                            <li 
                              key={area.id}
                              className={cn(
                                "flex items-center gap-2 text-sm py-1",
                                area.isMandatory ? "text-text-primary" : "text-text-secondary"
                              )}
                            >
                              <CheckCircle2 className={cn(
                                "w-4 h-4 flex-shrink-0",
                                isActive && area.actions?.length > 0 
                                  ? "text-success" 
                                  : "text-text-muted"
                              )} />
                              <span className="flex-1">{area.name}</span>
                              {area.isMandatory && (
                                <Badge size="sm" variant="warning">Required</Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
                {isActive && (
                  <div className="p-4 pt-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-danger"
                      onClick={() => unassignMutation.mutate(resp.id)}
                    >
                      Deactivate
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Mental Model */}
      <Card className="bg-gradient-ethereal">
        <CardHeader>
          <CardTitle>Quick Mental Model</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-white/50 rounded-xl">
              <Users className="w-8 h-8 text-teamlead mx-auto mb-2" />
              <h4 className="font-semibold">Team Lead</h4>
              <p className="text-sm text-text-secondary mt-1">
                "Can my people succeed every day?"
              </p>
            </div>
            <div className="p-4 bg-white/50 rounded-xl">
              <Target className="w-8 h-8 text-competence mx-auto mb-2" />
              <h4 className="font-semibold">Competence Leader</h4>
              <p className="text-sm text-text-secondary mt-1">
                "Are we getting better over time?"
              </p>
            </div>
            <div className="p-4 bg-white/50 rounded-xl">
              <Briefcase className="w-8 h-8 text-manager mx-auto mb-2" />
              <h4 className="font-semibold">Department Manager</h4>
              <p className="text-sm text-text-secondary mt-1">
                "Can we scale and survive long-term?"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

