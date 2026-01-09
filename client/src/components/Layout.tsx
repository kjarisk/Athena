import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Calendar,
  CheckSquare,
  Target,
  Sparkles,
  Trophy,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  CalendarCheck,
  BarChart3
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { cn, getXpProgress } from '@/lib/utils';
import Particles from './Particles';
import QuickAddButton from './QuickAddButton';
import Breadcrumbs from './Breadcrumbs';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Team Members', href: '/employees', icon: Users },
  { name: 'Teams', href: '/teams', icon: UsersRound },
  { name: 'Events', href: '/events', icon: Calendar },
  { name: 'Actions', href: '/actions', icon: CheckSquare },
  { name: 'Responsibilities', href: '/responsibilities', icon: Target },
  { name: 'Weekly Review', href: '/review', icon: CalendarCheck },
  { name: 'Statistics', href: '/statistics', icon: BarChart3 },
  { name: 'Skills', href: '/skills', icon: Sparkles },
  { name: 'Achievements', href: '/achievements', icon: Trophy },
  { name: 'Extract Notes', href: '/extract', icon: FileText },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const stats = user?.gamificationStats;
  const xpProgress = stats ? getXpProgress(stats.totalXp, stats.level) : { current: 0, required: 100, percentage: 0 };

  return (
    <div className="min-h-screen bg-ethereal">
      <Particles />
      
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 bg-white/90 backdrop-blur-md shadow-xl",
        "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-surface">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-warm flex items-center justify-center shadow-glow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-lg font-bold tracking-widest text-text-primary uppercase">
                  Leadership Hub
                </h1>
                <p className="text-xs text-text-muted font-body tracking-wide">Command Center</p>
              </div>
            </div>
          </div>

          {/* User XP Card */}
          {user && stats && (
            <div className="p-4 mx-4 mt-4 rounded-xl bg-gradient-ethereal border border-primary/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-warm flex items-center justify-center text-white font-display text-lg shadow-glow">
                  {stats.level}
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{user.name}</p>
                  <p className="text-sm text-text-secondary">Level {stats.level} Leader</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-text-secondary">
                  <span>{xpProgress.current} / {xpProgress.required} XP</span>
                  <span>{xpProgress.percentage}%</span>
                </div>
                <div className="xp-bar">
                  <div 
                    className="xp-bar-fill" 
                    style={{ width: `${xpProgress.percentage}%` }}
                  />
                </div>
              </div>
              {stats.streak > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-warning">Streak: {stats.streak} days</span>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "nav-item",
                    isActive && "nav-item-active"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-surface space-y-1">
            <NavLink
              to="/settings"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "nav-item",
                location.pathname === '/settings' && "nav-item-active"
              )}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </NavLink>
            <button
              onClick={logout}
              className="nav-item w-full text-left hover:text-danger"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-b border-surface">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-surface"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-warm flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold tracking-widest text-sm uppercase">Hub</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      {/* Main content */}
      <main className="lg:ml-72 pt-16 lg:pt-0 min-h-screen relative z-10">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Breadcrumbs */}
          <Breadcrumbs className="mb-4" />
          
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Close button for mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed top-4 right-4 z-50 lg:hidden p-2 rounded-full bg-white shadow-lg"
          >
            <X className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Quick Add Floating Button */}
      <QuickAddButton />
    </div>
  );
}

