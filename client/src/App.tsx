import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import Layout from '@/components/Layout';
import Login from '@/features/auth/Login';
import Register from '@/features/auth/Register';
import Dashboard from '@/features/dashboard/Dashboard';
import EmployeeList from '@/features/employees/EmployeeList';
import EmployeeDetail from '@/features/employees/EmployeeDetail';
import TeamList from '@/features/teams/TeamList';
import TeamDetail from '@/features/teams/TeamDetail';
import EventList from '@/features/events/EventList';
import EventDetail from '@/features/events/EventDetail';
import ActionHub from '@/features/actions/ActionHub';
import Responsibilities from '@/features/responsibilities/Responsibilities';
import SkillTree from '@/features/gamification/SkillTree';
import Achievements from '@/features/gamification/Achievements';
import Settings from '@/features/settings/Settings';
import NoteExtractor from '@/features/ai/NoteExtractor';
import WeeklyReview from '@/features/review/WeeklyReview';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />

      {/* Protected routes */}
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<EmployeeList />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="teams" element={<TeamList />} />
        <Route path="teams/:id" element={<TeamDetail />} />
        <Route path="events" element={<EventList />} />
        <Route path="events/:id" element={<EventDetail />} />
        <Route path="actions" element={<ActionHub />} />
        <Route path="responsibilities" element={<Responsibilities />} />
        <Route path="skills" element={<SkillTree />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="extract" element={<NoteExtractor />} />
        <Route path="review" element={<WeeklyReview />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

