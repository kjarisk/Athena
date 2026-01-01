import { Users, Target, TrendingUp, Zap, Calendar, Sparkles } from 'lucide-react';

/**
 * Icon options for work area customization
 */
export const iconOptions = [
  { value: 'users', label: 'Team', icon: Users },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'briefcase', label: 'Briefcase', icon: TrendingUp },
  { value: 'zap', label: 'Lightning', icon: Zap },
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'sparkles', label: 'Sparkles', icon: Sparkles },
];

/**
 * Color options for work area customization
 */
export const colorOptions = [
  { value: '#7BA087', label: 'Sage Green' },
  { value: '#D4A574', label: 'Warm Gold' },
  { value: '#E8B86D', label: 'Bright Gold' },
  { value: '#CD7F6E', label: 'Terracotta' },
  { value: '#8FBC8F', label: 'Forest Green' },
  { value: '#DAA520', label: 'Goldenrod' },
];

/**
 * Returns time-appropriate greeting based on current hour
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Keyboard shortcuts configuration
 */
export const keyboardShortcuts = [
  { key: 'A', description: 'New Action' },
  { key: 'E', description: 'New Event' },
  { key: 'F', description: 'Focus Mode Toggle' },
  { key: 'N', description: 'Extract Notes' },
  { key: '?', description: 'Show This Help' },
];
