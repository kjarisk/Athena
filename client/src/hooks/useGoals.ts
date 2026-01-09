import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiHelpers } from '@/lib/api';

// Types
export interface KeyResult {
  id: string;
  goalId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: 'LEADERSHIP' | 'TEAM' | 'TECHNICAL' | 'PERSONAL';
  quarter: string;
  targetDate?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  progress: number;
  keyResults: KeyResult[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  category: Goal['category'];
  quarter: string;
  targetDate?: string;
  keyResults?: { title: string; targetValue?: number; unit?: string }[];
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  category?: Goal['category'];
  quarter?: string;
  targetDate?: string;
  status?: Goal['status'];
  progress?: number;
}

export interface UpdateKeyResultInput {
  title?: string;
  currentValue?: number;
  targetValue?: number;
  unit?: string;
}

// Get current quarter string
export function getCurrentQuarter(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${quarter} ${now.getFullYear()}`;
}

// Get quarter options
export function getQuarterOptions(): string[] {
  const now = new Date();
  const year = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  
  const options: string[] = [];
  
  // Previous quarter
  if (currentQuarter > 1) {
    options.push(`Q${currentQuarter - 1} ${year}`);
  } else {
    options.push(`Q4 ${year - 1}`);
  }
  
  // Current quarter
  options.push(`Q${currentQuarter} ${year}`);
  
  // Next 2 quarters
  for (let i = 1; i <= 2; i++) {
    const nextQ = currentQuarter + i;
    if (nextQ <= 4) {
      options.push(`Q${nextQ} ${year}`);
    } else {
      options.push(`Q${nextQ - 4} ${year + 1}`);
    }
  }
  
  return options;
}

// Hooks
export function useGoals(params?: { quarter?: string; status?: string }) {
  return useQuery({
    queryKey: ['goals', params],
    queryFn: async () => {
      const response = await apiHelpers.getGoals(params);
      return response.data.data as Goal[];
    }
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateGoalInput) => {
      const response = await apiHelpers.createGoal(data);
      return response.data.data as Goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateGoalInput }) => {
      const response = await apiHelpers.updateGoal(id, data);
      return response.data.data as Goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiHelpers.deleteGoal(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });
}

export function useUpdateKeyResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ goalId, krId, data }: { goalId: string; krId: string; data: UpdateKeyResultInput }) => {
      const response = await apiHelpers.updateKeyResult(goalId, krId, data);
      return response.data.data as KeyResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });
}

export function useAddKeyResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ goalId, data }: { goalId: string; data: { title: string; targetValue?: number; unit?: string } }) => {
      const response = await apiHelpers.addKeyResult(goalId, data);
      return response.data.data as KeyResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });
}

export function useDeleteKeyResult() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ goalId, krId }: { goalId: string; krId: string }) => {
      await apiHelpers.deleteKeyResult(goalId, krId);
      return krId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });
}
