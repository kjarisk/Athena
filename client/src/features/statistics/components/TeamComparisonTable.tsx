/**
 * Team Comparison Table Component
 * Displays team metrics in a sortable table format
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronUp, 
  ChevronDown, 
  AlertTriangle, 
  Users,
  ArrowRight
} from 'lucide-react';

interface TeamData {
  teamId: string;
  teamName: string;
  color: string;
  memberCount: number;
  totalActions: number;
  healthScore: number | null;
  velocityScore: number | null;
  engagementScore: number | null;
  blockerCount: number;
  overdueActions: number;
}

interface TeamComparisonTableProps {
  teams: TeamData[];
  showDetails?: boolean;
}

type SortField = 'name' | 'health' | 'velocity' | 'blockers' | 'overdue';
type SortDirection = 'asc' | 'desc';

export function TeamComparisonTable({ teams, showDetails = false }: TeamComparisonTableProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('health');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTeams = [...teams].sort((a, b) => {
    let aVal: number | string = 0;
    let bVal: number | string = 0;

    switch (sortField) {
      case 'name':
        aVal = a.teamName;
        bVal = b.teamName;
        break;
      case 'health':
        aVal = a.healthScore ?? 0;
        bVal = b.healthScore ?? 0;
        break;
      case 'velocity':
        aVal = a.velocityScore ?? 0;
        bVal = b.velocityScore ?? 0;
        break;
      case 'blockers':
        aVal = a.blockerCount;
        bVal = b.blockerCount;
        break;
      case 'overdue':
        aVal = a.overdueActions;
        bVal = b.overdueActions;
        break;
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal);
    }

    return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
  });

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-text-muted';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number | null) => {
    if (score === null) return 'bg-surface';
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-amber-100';
    return 'bg-red-100';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-dark">
            <th 
              className="text-left py-3 px-4 text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-1">
                Team <SortIcon field="name" />
              </div>
            </th>
            <th className="text-center py-3 px-4 text-sm font-medium text-text-secondary">
              Members
            </th>
            <th 
              className="text-center py-3 px-4 text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary"
              onClick={() => handleSort('health')}
            >
              <div className="flex items-center justify-center gap-1">
                Health <SortIcon field="health" />
              </div>
            </th>
            <th 
              className="text-center py-3 px-4 text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary"
              onClick={() => handleSort('velocity')}
            >
              <div className="flex items-center justify-center gap-1">
                Velocity <SortIcon field="velocity" />
              </div>
            </th>
            <th 
              className="text-center py-3 px-4 text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary"
              onClick={() => handleSort('blockers')}
            >
              <div className="flex items-center justify-center gap-1">
                Blockers <SortIcon field="blockers" />
              </div>
            </th>
            <th 
              className="text-center py-3 px-4 text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary"
              onClick={() => handleSort('overdue')}
            >
              <div className="flex items-center justify-center gap-1">
                Overdue <SortIcon field="overdue" />
              </div>
            </th>
            {showDetails && (
              <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedTeams.map(team => (
            <tr 
              key={team.teamId}
              className="border-b border-surface hover:bg-surface/50 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="font-medium text-text-primary">
                    {team.teamName}
                  </span>
                </div>
              </td>
              <td className="text-center py-3 px-4">
                <div className="flex items-center justify-center gap-1 text-text-secondary">
                  <Users size={14} />
                  {team.memberCount}
                </div>
              </td>
              <td className="text-center py-3 px-4">
                <span className={`
                  inline-flex items-center justify-center w-12 h-8 rounded-lg font-bold text-sm
                  ${getScoreBg(team.healthScore)} ${getScoreColor(team.healthScore)}
                `}>
                  {team.healthScore !== null ? Math.round(team.healthScore) : '-'}
                </span>
              </td>
              <td className="text-center py-3 px-4">
                <span className={`
                  inline-flex items-center justify-center w-12 h-8 rounded-lg font-bold text-sm
                  ${getScoreBg(team.velocityScore !== null ? team.velocityScore * 100 : null)} 
                  ${getScoreColor(team.velocityScore !== null ? team.velocityScore * 100 : null)}
                `}>
                  {team.velocityScore !== null ? `${Math.round(team.velocityScore * 100)}%` : '-'}
                </span>
              </td>
              <td className="text-center py-3 px-4">
                {team.blockerCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-medium">
                    <AlertTriangle size={14} />
                    {team.blockerCount}
                  </span>
                ) : (
                  <span className="text-green-600">0</span>
                )}
              </td>
              <td className="text-center py-3 px-4">
                {team.overdueActions > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-600 rounded-lg text-sm font-medium">
                    {team.overdueActions}
                  </span>
                ) : (
                  <span className="text-green-600">0</span>
                )}
              </td>
              {showDetails && (
                <td className="text-right py-3 px-4">
                  <button
                    onClick={() => navigate(`/teams/${team.teamId}`)}
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm"
                  >
                    View <ArrowRight size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
