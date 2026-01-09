/**
 * Meeting Templates Hooks
 * React Query hooks for managing meeting templates
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

type EventCategory = 'ONE_ON_ONE' | 'TEAM_MEETING' | 'SKIP_LEVEL' | 'STANDUP' | 'RETROSPECTIVE' | 'PLANNING' | 'REVIEW' | 'COACHING' | 'FEEDBACK' | 'OTHER';

interface MeetingTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: EventCategory;
  agenda: AgendaItem[];
  checkpoints?: string[];
  defaultDuration: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AgendaItem {
  id: string;
  title: string;
  duration: number;
  notes?: string;
  order: number;
}

// ============================================
// Template Queries
// ============================================

export function useMeetingTemplates() {
  return useQuery({
    queryKey: ['meetingTemplates'],
    queryFn: async () => {
      const { data } = await api.get<MeetingTemplate[]>('/templates');
      return data;
    }
  });
}

export function useMeetingTemplatesByCategory(category: EventCategory) {
  return useQuery({
    queryKey: ['meetingTemplates', category],
    queryFn: async () => {
      const { data } = await api.get<MeetingTemplate[]>(`/templates/category/${category}`);
      return data;
    },
    enabled: !!category
  });
}

export function useMeetingTemplate(id: string) {
  return useQuery({
    queryKey: ['meetingTemplate', id],
    queryFn: async () => {
      const { data } = await api.get<MeetingTemplate>(`/templates/${id}`);
      return data;
    },
    enabled: !!id
  });
}

// ============================================
// Template Mutations
// ============================================

interface CreateTemplateInput {
  name: string;
  description?: string;
  category: EventCategory;
  agenda?: Array<{
    id: string;
    title: string;
    duration: number;
    description?: string;
    order: number;
  }>;
  checkpoints?: string[];
  defaultDuration?: number;
  isDefault?: boolean;
}

export function useCreateMeetingTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data } = await api.post<MeetingTemplate>('/templates', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingTemplates'] });
    }
  });
}

export function useUpdateMeetingTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...input }: CreateTemplateInput & { id: string }) => {
      const { data } = await api.put<MeetingTemplate>(`/templates/${id}`, input);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meetingTemplates'] });
      queryClient.setQueryData(['meetingTemplate', data.id], data);
    }
  });
}

export function useDeleteMeetingTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingTemplates'] });
    }
  });
}

export function useDuplicateMeetingTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<MeetingTemplate>(`/templates/${id}/duplicate`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetingTemplates'] });
    }
  });
}
