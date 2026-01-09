/**
 * Responsibilities Hooks
 * Hooks for responsibility insights and management
 */
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// Types
export interface Evidence {
  type: 'action' | 'event' | 'oneOnOne';
  id: string;
  title: string;
  date: string;
}

export interface ResponsibilityInsight {
  id: string;
  title: string;
  description: string;
  category: string;
  evidence: Evidence[];
  frequency: number;
  lastActivity: string | null;
  mentalModelTips: string[];
}

export interface InsightsByCategory {
  'People & Individual Care': ResponsibilityInsight[];
  'Team Development': ResponsibilityInsight[];
  'Delivery & Execution': ResponsibilityInsight[];
  'Strategy & Culture': ResponsibilityInsight[];
}

export interface InsightsSummary {
  totalActions: number;
  totalEvents: number;
  totalOneOnOnes: number;
  teamsManaged: number;
  employeesManaged: number;
  workAreasActive: number;
}

export interface ResponsibilityInsightsData {
  insights: InsightsByCategory;
  summary: InsightsSummary;
  lastUpdated: string;
}

// Hooks
export function useResponsibilityInsights() {
  return useQuery({
    queryKey: ['responsibilities', 'insights'],
    queryFn: async () => {
      const response = await api.get('/responsibilities/insights');
      return response.data.data as ResponsibilityInsightsData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
