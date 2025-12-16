import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', options || {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return formatDate(d);
}

export function getDaysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function isOverdue(date: Date | string): boolean {
  return getDaysUntil(date) < 0;
}

export function getDueDateLabel(date: Date | string): { text: string; variant: 'success' | 'warning' | 'danger' | 'default' } {
  const days = getDaysUntil(date);
  
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, variant: 'danger' };
  if (days === 0) return { text: 'Due today', variant: 'warning' };
  if (days === 1) return { text: 'Due tomorrow', variant: 'warning' };
  if (days <= 7) return { text: `${days}d left`, variant: 'default' };
  
  return { text: formatDate(date), variant: 'success' };
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getXpProgress(currentXp: number, level: number): { current: number; required: number; percentage: number } {
  const thresholds = [0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000, 7700, 9700, 12000, 15000];
  
  const currentLevelXp = thresholds[level - 1] || 0;
  const nextLevelXp = thresholds[level] || currentLevelXp + 5000;
  
  const current = currentXp - currentLevelXp;
  const required = nextLevelXp - currentLevelXp;
  const percentage = Math.min(Math.round((current / required) * 100), 100);
  
  return { current, required, percentage };
}

export function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'primary';
    case 'low': return 'secondary';
    default: return 'default';
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed': return 'success';
    case 'in_progress': return 'primary';
    case 'pending': return 'secondary';
    case 'delegated': return 'warning';
    case 'cancelled': return 'danger';
    default: return 'default';
  }
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatStatus(status: string): string {
  return status.split('_').map(capitalizeFirst).join(' ');
}

