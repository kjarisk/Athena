/**
 * Reports Hooks
 * React Query hooks for fetching and managing reports
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================
// Types
// ============================================

export interface WeeklyReport {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  meetingHours: number;
  focusHours: number;
  actionsCreated: number;
  actionsCompleted: number;
  decisionsCount: number;
  breakdownByArea: Array<{ areaId: string; areaName: string; hours: number; percentage: number }>;
  breakdownByTeam: Array<{ teamId: string; teamName: string; hours: number; percentage: number }>;
  topAccomplishments: Array<{ title: string; category?: string; completedAt: string }>;
  summary?: string;
  highlights?: string[];
  recommendations?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeReport {
  id: string;
  employeeId: string;
  reportType: 'quarterly' | 'yearly';
  periodStart: string;
  periodEnd: string;
  meetingsHeld: number;
  oneOnOnesCount: number;
  actionsCreated: number;
  actionsCompleted: number;
  notesCount: number;
  keyAccomplishments: string[];
  developmentAreas: string[];
  notes?: string;
  generatedAt: string;
}

// ============================================
// Weekly Reports
// ============================================

export function useWeeklyReport(weekOffset: number = 0) {
  return useQuery({
    queryKey: ['weeklyReport', weekOffset],
    queryFn: async () => {
      const { data } = await api.get<WeeklyReport>('/reports/weekly', {
        params: { weekOffset }
      });
      return data;
    }
  });
}

export function useRegenerateWeeklyReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (weekOffset: number) => {
      const { data } = await api.post<WeeklyReport>('/reports/weekly/regenerate', {
        weekOffset
      });
      return data;
    },
    onSuccess: (data, weekOffset) => {
      queryClient.setQueryData(['weeklyReport', weekOffset], data);
      queryClient.invalidateQueries({ queryKey: ['weeklyReportHistory'] });
    }
  });
}

export function useWeeklyReportHistory(limit: number = 12) {
  return useQuery({
    queryKey: ['weeklyReportHistory', limit],
    queryFn: async () => {
      const { data } = await api.get<WeeklyReport[]>('/reports/weekly/history', {
        params: { limit }
      });
      return data;
    }
  });
}

// ============================================
// Employee Reports
// ============================================

interface GenerateEmployeeReportParams {
  employeeId: string;
  reportType: 'quarterly' | 'yearly';
  periodOffset?: number;
}

export function useGenerateEmployeeReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ employeeId, reportType, periodOffset = 0 }: GenerateEmployeeReportParams) => {
      const { data } = await api.post<EmployeeReport>(`/reports/employee/${employeeId}`, {
        reportType,
        periodOffset
      });
      return data;
    },
    onSuccess: (_data, { employeeId }) => {
      queryClient.invalidateQueries({ queryKey: ['employeeReportHistory', employeeId] });
    }
  });
}

export function useEmployeeReportHistory(employeeId: string) {
  return useQuery({
    queryKey: ['employeeReportHistory', employeeId],
    queryFn: async () => {
      const { data } = await api.get<EmployeeReport[]>(`/reports/employee/${employeeId}/history`);
      return data;
    },
    enabled: !!employeeId
  });
}
