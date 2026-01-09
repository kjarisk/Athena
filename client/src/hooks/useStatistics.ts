/**
 * Statistics Hooks
 * React Query hooks for fetching dashboard statistics and metrics
 */
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================
// Types
// ============================================

export interface DashboardStatistics {
  totalActions: number;
  completedActions: number;
  pendingActions: number;
  inProgressActions: number;
  overdueActions: number;
  blockers: number;
  decisionsThisWeek: number;
  decisionsThisMonth: number;
  meetingsThisWeek: number;
  meetingHoursThisWeek: number;
  oneOnOnesThisWeek: number;
  teamsManaged: number;
  employeesManaged: number;
}

export interface TimeAllocation {
  workAreaId: string;
  workAreaName: string;
  hours: number;
  percentage: number;
  eventCount: number;
}

export interface TeamMetrics {
  teamId: string;
  timestamp: string;
  memberCount: number;
  avgEngagementScore: number | null;
  avgHealthScore: number | null;
  actionVelocity: number | null;
  blockerCount: number;
}

// ============================================
// Dashboard Statistics
// ============================================

export function useDashboardStatistics() {
  return useQuery({
    queryKey: ['dashboardStatistics'],
    queryFn: async () => {
      const { data } = await api.get<DashboardStatistics>('/statistics/dashboard');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================
// Time Allocation
// ============================================

interface TimeAllocationResponse {
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  allocation: TimeAllocation[];
}

export function useTimeAllocation(weekOffset: number = 0) {
  return useQuery({
    queryKey: ['timeAllocation', weekOffset],
    queryFn: async () => {
      const { data } = await api.get<TimeAllocationResponse>('/statistics/time-allocation', {
        params: { weekOffset }
      });
      return data;
    }
  });
}

// ============================================
// Team Metrics
// ============================================

interface TeamMetricsResponse extends TeamMetrics {
  teamName: string;
}

export function useTeamMetrics(teamId: string) {
  return useQuery({
    queryKey: ['teamMetrics', teamId],
    queryFn: async () => {
      const { data } = await api.get<TeamMetricsResponse>(`/statistics/teams/${teamId}/metrics`);
      return data;
    },
    enabled: !!teamId
  });
}

export function useTeamMetricsHistory(teamId: string, limit: number = 12) {
  return useQuery({
    queryKey: ['teamMetricsHistory', teamId, limit],
    queryFn: async () => {
      const { data } = await api.get<TeamMetrics[]>(`/statistics/teams/${teamId}/history`, {
        params: { limit }
      });
      return data;
    },
    enabled: !!teamId
  });
}

// ============================================
// Team Comparison
// ============================================

export interface TeamComparison {
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

export function useTeamComparison() {
  return useQuery({
    queryKey: ['teamComparison'],
    queryFn: async () => {
      const { data } = await api.get<TeamComparison[]>('/statistics/teams/comparison');
      return data;
    }
  });
}
