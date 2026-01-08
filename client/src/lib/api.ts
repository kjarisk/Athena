import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth state
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API helper functions
export const apiHelpers = {
  // Employees
  getEmployees: (params?: Record<string, string>) => 
    api.get('/employees', { params }),
  getEmployee: (id: string) => 
    api.get(`/employees/${id}`),
  createEmployee: (data: any) => 
    api.post('/employees', data),
  updateEmployee: (id: string, data: any) => 
    api.patch(`/employees/${id}`, data),
  deleteEmployee: (id: string) => 
    api.delete(`/employees/${id}`),
  addEmployeeNote: (id: string, data: any) => 
    api.post(`/employees/${id}/notes`, data),
  addOneOnOne: (id: string, data: any) => 
    api.post(`/employees/${id}/one-on-ones`, data),
  getEmployeeCompetencies: (id: string) => 
    api.get(`/employees/${id}/competencies`),
  updateEmployeeCompetency: (id: string, data: any) => 
    api.post(`/employees/${id}/competencies`, data),
  bulkUpdateCompetencies: (id: string, competencies: any[]) => 
    api.put(`/employees/${id}/competencies`, { competencies }),

  // Events
  getEventTypes: () => 
    api.get('/events/types'),
  getEvents: (params?: Record<string, string>) => 
    api.get('/events', { params }),
  getEvent: (id: string) => 
    api.get(`/events/${id}`),
  createEvent: (data: any) => 
    api.post('/events', data),
  updateEvent: (id: string, data: any) => 
    api.patch(`/events/${id}`, data),
  deleteEvent: (id: string) => 
    api.delete(`/events/${id}`),

  // Actions
  getActions: (params?: Record<string, string>) => 
    api.get('/actions', { params }),
  getActionStats: () => 
    api.get('/actions/stats'),
  getFocusSuggestions: () => 
    api.get('/actions/focus/suggestions'),
  getAction: (id: string) => 
    api.get(`/actions/${id}`),
  createAction: (data: any) => 
    api.post('/actions', data),
  createGroupedActions: (parentAction: any, subtasks: any[]) => 
    api.post('/actions/grouped', { parentAction, subtasks }),
  updateAction: (id: string, data: any) => 
    api.patch(`/actions/${id}`, data),
  deleteAction: (id: string) => 
    api.delete(`/actions/${id}`),
  bulkUpdateActions: (data: any) => 
    api.post('/actions/bulk-status', data),

  // Responsibilities
  getResponsibilities: () => 
    api.get('/responsibilities'),
  getMyResponsibilities: () => 
    api.get('/responsibilities/my'),
  assignResponsibility: (responsibilityId: string) => 
    api.post('/responsibilities/assign', { responsibilityId }),
  unassignResponsibility: (responsibilityId: string) => 
    api.delete(`/responsibilities/unassign/${responsibilityId}`),

  // Gamification
  getGamificationStats: () => 
    api.get('/gamification/stats'),
  getAchievements: () => 
    api.get('/gamification/achievements'),
  getChallenges: () => 
    api.get('/gamification/challenges'),
  getSkillTree: (type: string) => 
    api.get(`/gamification/skill-tree/${type}`),
  unlockSkill: (skillId: string) => 
    api.post('/gamification/skill-tree/unlock', { skillId }),

  // AI
  extractActions: (notes: string, context?: string) => 
    api.post('/ai/extract-actions', { notes, context }),
  generateMessage: (type: string, context: string, tone?: string) => 
    api.post('/ai/generate-message', { type, context, tone }),
  getMeetingPrep: (eventId: string) => 
    api.get(`/ai/meeting-prep/${eventId}`),
  summarize: (text: string, format?: string) => 
    api.post('/ai/summarize', { text, format }),
  analyzeOneOnOne: (notes: string, employeeId?: string) => 
    api.post('/ai/analyze-one-on-one', { notes, employeeId }),
  analyzeCompetencies: (employeeId: string) => 
    api.post('/ai/analyze-competencies', { employeeId }),
  generateDevelopmentPlan: (employeeId: string) => 
    api.post('/ai/generate-development-plan', { employeeId }),
  getDevelopmentPlan: (employeeId: string) => 
    api.get(`/ai/development-plan/${employeeId}`),
  getOllamaModels: () => 
    api.get('/ai/ollama/models'),
  getOllamaStatus: () => 
    api.get('/ai/ollama/status'),

  // Uploads
  uploadFile: (actionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/uploads/action/${actionId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteAttachment: (attachmentId: string) => 
    api.delete(`/uploads/attachment/${attachmentId}`),

  // Work Areas
  getWorkAreas: () => 
    api.get('/work-areas'),
  getWorkArea: (id: string) => 
    api.get(`/work-areas/${id}`),
  createWorkArea: (data: any) => 
    api.post('/work-areas', data),
  updateWorkArea: (id: string, data: any) => 
    api.patch(`/work-areas/${id}`, data),
  deleteWorkArea: (id: string, reassignToId?: string) => 
    api.delete(`/work-areas/${id}`, { params: { reassignToId } }),
  reorderWorkAreas: (orderedIds: string[]) => 
    api.post('/work-areas/reorder', { orderedIds }),

  // Teams
  getTeams: (params?: Record<string, string>) => 
    api.get('/teams', { params }),
  getTeam: (id: string) => 
    api.get(`/teams/${id}`),
  createTeam: (data: any) => 
    api.post('/teams', data),
  updateTeam: (id: string, data: any) => 
    api.patch(`/teams/${id}`, data),
  deleteTeam: (id: string) => 
    api.delete(`/teams/${id}`),
  addTeamMember: (teamId: string, data: any) => 
    api.post(`/teams/${teamId}/members`, data),
  updateTeamMember: (teamId: string, memberId: string, data: any) => 
    api.patch(`/teams/${teamId}/members/${memberId}`, data),
  removeTeamMember: (teamId: string, memberId: string) => 
    api.delete(`/teams/${teamId}/members/${memberId}`),

  // Leadership Playbook
  getCadenceRules: () => 
    api.get('/playbook/cadence'),
  createCadenceRule: (data: any) => 
    api.post('/playbook/cadence', data),
  updateCadenceRule: (id: string, data: any) => 
    api.patch(`/playbook/cadence/${id}`, data),
  deleteCadenceRule: (id: string) => 
    api.delete(`/playbook/cadence/${id}`),
  getDueItems: () => 
    api.get('/playbook/due-items'),
  getAIContext: () => 
    api.get('/playbook/ai-context'),
  saveAIContext: (content: string, isActive?: boolean) => 
    api.put('/playbook/ai-context', { content, isActive }),
  getDailyBriefing: () => 
    api.get('/ai/daily-briefing'),

  // Calendar
  getCalendarStatus: () => 
    api.get('/calendar/status'),
  disconnectGoogle: () => 
    api.post('/calendar/disconnect/google'),
  syncCalendars: () => 
    api.post('/calendar/sync'),
  getTimeInsights: () => 
    api.post('/ai/time-insights').then(res => res.data),
  
  // EventKit (Mac Calendar)
  checkEventkitStatus: () => 
    api.get('/calendar/eventkit/status').then(res => res.data),
  getEventkitCalendars: () => 
    api.get('/calendar/eventkit/calendars').then(res => res.data),
  syncEventkitCalendars: (data: { calendarIds: string[], daysBack?: number, daysAhead?: number }) => 
    api.post('/calendar/eventkit/sync', data).then(res => res.data),
  previewEventkitEvents: (data: { calendarIds: string[], daysBack?: number, daysAhead?: number }) => 
    api.post('/calendar/eventkit/preview', data).then(res => res.data)
};

