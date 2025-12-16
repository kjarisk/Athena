import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Edit2, Save, X } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import Button from './ui/Button';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// Competency definitions by role type
const technicalSkillsByRole: Record<string, string[]> = {
  FRONTEND: ['React', 'CSS', 'TypeScript', 'Testing', 'Performance', 'Accessibility'],
  BACKEND: ['APIs', 'Databases', 'Architecture', 'Security', 'DevOps', 'Testing'],
  DESIGNER: ['UI Design', 'UX Research', 'Prototyping', 'Design Systems', 'Collaboration', 'Tools'],
  QA: ['Test Strategy', 'Automation', 'Manual Testing', 'Performance', 'Security', 'Documentation'],
  DEVOPS: ['CI/CD', 'Cloud', 'Monitoring', 'Security', 'Infrastructure', 'Automation'],
  DEFAULT: ['Technical Knowledge', 'Problem Solving', 'Tools', 'Quality', 'Documentation', 'Innovation']
};

const softSkills = [
  'Communication',
  'Problem Solving',
  'Collaboration',
  'Initiative',
  'Adaptability',
  'Leadership'
];

interface CompetencyRadarProps {
  employeeId: string;
  employeeRole?: string;
}

export default function CompetencyRadar({ employeeId, employeeRole }: CompetencyRadarProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, number>>({});

  // Determine which technical skills to use based on role
  const getRoleKey = (role?: string): string => {
    if (!role) return 'DEFAULT';
    const upper = role.toUpperCase();
    if (upper.includes('FRONTEND') || upper.includes('FRONT-END')) return 'FRONTEND';
    if (upper.includes('BACKEND') || upper.includes('BACK-END')) return 'BACKEND';
    if (upper.includes('DESIGN')) return 'DESIGNER';
    if (upper.includes('QA') || upper.includes('TEST')) return 'QA';
    if (upper.includes('DEVOPS') || upper.includes('SRE') || upper.includes('INFRA')) return 'DEVOPS';
    return 'DEFAULT';
  };

  const roleKey = getRoleKey(employeeRole);
  const technicalSkills = technicalSkillsByRole[roleKey];

  const { data: competencies, isLoading } = useQuery({
    queryKey: ['competencies', employeeId],
    queryFn: () => apiHelpers.getEmployeeCompetencies(employeeId).then(r => r.data.data)
  });

  const updateMutation = useMutation({
    mutationFn: (competencies: any[]) => apiHelpers.bulkUpdateCompetencies(employeeId, competencies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competencies', employeeId] });
      setIsEditing(false);
      toast.success('Competencies updated');
    }
  });

  // Build competency map from data
  const competencyMap = (competencies || []).reduce((acc: Record<string, number>, c: any) => {
    acc[`${c.category}:${c.name}`] = c.rating;
    return acc;
  }, {});

  const getCompetencyValue = (category: string, name: string) => {
    const key = `${category}:${name}`;
    if (isEditing) {
      return editData[key] ?? competencyMap[key] ?? 0;
    }
    return competencyMap[key] ?? 0;
  };

  const setCompetencyValue = (category: string, name: string, value: number) => {
    const key = `${category}:${name}`;
    setEditData({ ...editData, [key]: value });
  };

  const startEditing = () => {
    setEditData(competencyMap);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditData({});
    setIsEditing(false);
  };

  const saveCompetencies = () => {
    const allCompetencies = [
      ...technicalSkills.map(name => ({
        category: 'TECHNICAL',
        name,
        rating: editData[`TECHNICAL:${name}`] ?? competencyMap[`TECHNICAL:${name}`] ?? 0
      })),
      ...softSkills.map(name => ({
        category: 'SOFT_SKILL',
        name,
        rating: editData[`SOFT_SKILL:${name}`] ?? competencyMap[`SOFT_SKILL:${name}`] ?? 0
      }))
    ];
    updateMutation.mutate(allCompetencies);
  };

  // Calculate radar chart coordinates
  const calculateRadarPoints = (skills: string[], category: string, radius: number, centerX: number, centerY: number) => {
    const angleStep = (2 * Math.PI) / skills.length;
    return skills.map((skill, i) => {
      const value = getCompetencyValue(category, skill);
      const normalizedValue = (value / 5) * radius;
      const angle = i * angleStep - Math.PI / 2; // Start from top
      return {
        x: centerX + normalizedValue * Math.cos(angle),
        y: centerY + normalizedValue * Math.sin(angle),
        labelX: centerX + (radius + 20) * Math.cos(angle),
        labelY: centerY + (radius + 20) * Math.sin(angle),
        skill,
        value,
        angle
      };
    });
  };

  const renderRadarChart = (skills: string[], category: string, color: string, title: string) => {
    const size = 220;
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = 80;

    const points = calculateRadarPoints(skills, category, maxRadius, centerX, centerY);
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

    // Grid circles
    const gridLevels = [1, 2, 3, 4, 5];

    return (
      <div className="relative">
        <h4 className="text-sm font-medium text-text-secondary mb-2 text-center">{title}</h4>
        <svg width={size} height={size} className="mx-auto">
          {/* Grid circles */}
          {gridLevels.map(level => (
            <circle
              key={level}
              cx={centerX}
              cy={centerY}
              r={(level / 5) * maxRadius}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.1}
              className="text-text-muted"
            />
          ))}

          {/* Axis lines */}
          {points.map((p, i) => (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={centerX + maxRadius * Math.cos(p.angle)}
              y2={centerY + maxRadius * Math.sin(p.angle)}
              stroke="currentColor"
              strokeOpacity={0.1}
              className="text-text-muted"
            />
          ))}

          {/* Filled area */}
          <motion.path
            d={pathData}
            fill={color}
            fillOpacity={0.2}
            stroke={color}
            strokeWidth={2}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Data points */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={color}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            />
          ))}

          {/* Labels */}
          {points.map((p, i) => (
            <text
              key={i}
              x={p.labelX}
              y={p.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] fill-current text-text-secondary"
            >
              {p.skill.length > 10 ? p.skill.slice(0, 10) + '...' : p.skill}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  const renderEditableList = (skills: string[], category: string, color: string, title: string) => {
    return (
      <div>
        <h4 className="text-sm font-medium text-text-secondary mb-3">{title}</h4>
        <div className="space-y-2">
          {skills.map(skill => {
            const value = getCompetencyValue(category, skill);
            return (
              <div key={skill} className="flex items-center gap-3">
                <span className="text-sm text-text-primary w-28 truncate" title={skill}>
                  {skill}
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setCompetencyValue(category, skill, level)}
                      className={cn(
                        "w-6 h-6 rounded-md transition-all text-xs font-medium",
                        value >= level
                          ? "text-white"
                          : "bg-surface text-text-muted hover:bg-surface/80"
                      )}
                      style={value >= level ? { backgroundColor: color } : undefined}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-text-muted">
            Loading competencies...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-display tracking-wide">COMPETENCIES</CardTitle>
          {isEditing ? (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={cancelEditing}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={saveCompetencies} isLoading={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={startEditing}>
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="grid md:grid-cols-2 gap-8">
            {renderEditableList(technicalSkills, 'TECHNICAL', '#7BA087', `Technical Skills (${roleKey})`)}
            {renderEditableList(softSkills, 'SOFT_SKILL', '#D4A574', 'Soft Skills')}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {renderRadarChart(technicalSkills, 'TECHNICAL', '#7BA087', `Technical Skills`)}
            {renderRadarChart(softSkills, 'SOFT_SKILL', '#D4A574', 'Soft Skills')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

