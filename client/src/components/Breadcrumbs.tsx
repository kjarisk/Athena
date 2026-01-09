import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// Route metadata for breadcrumb labels
const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  'employees': 'Team Members',
  'teams': 'Teams',
  'events': 'Events',
  'actions': 'Actions',
  'responsibilities': 'Responsibilities',
  'review': 'Weekly Review',
  'statistics': 'Statistics',
  'skills': 'Leadership Competencies',
  'achievements': 'Goals & Progress',
  'extract': 'Extract Notes',
  'settings': 'Settings'
};

interface BreadcrumbItem {
  label: string;
  href: string;
  current: boolean;
}

interface BreadcrumbsProps {
  className?: string;
  // Optional custom items to append (e.g., for detail pages)
  customItems?: { label: string; href?: string }[];
}

export default function Breadcrumbs({ className, customItems }: BreadcrumbsProps) {
  const location = useLocation();
  const params = useParams();
  
  // Split path and filter empty strings
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  // Build breadcrumb items
  const items: BreadcrumbItem[] = [];
  
  // Always start with Dashboard
  items.push({
    label: 'Dashboard',
    href: '/',
    current: pathSegments.length === 0
  });
  
  // Add each path segment
  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Skip if this is a UUID (detail page ID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
    
    if (!isUuid) {
      items.push({
        label: routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        href: currentPath,
        current: index === pathSegments.length - 1
      });
    }
  });
  
  // Add custom items if provided
  if (customItems) {
    customItems.forEach((item, index) => {
      items.push({
        label: item.label,
        href: item.href || '#',
        current: index === customItems.length - 1
      });
      // Update previous item to not be current
      if (items.length > 1) {
        items[items.length - 2].current = false;
      }
    });
  }
  
  // Don't show if only dashboard
  if (items.length <= 1) {
    return null;
  }
  
  return (
    <nav className={cn("flex items-center text-sm", className)} aria-label="Breadcrumb">
      <ol className="flex items-center gap-1">
        {items.map((item, index) => (
          <li key={item.href + index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-text-muted mx-1 flex-shrink-0" />
            )}
            {item.current ? (
              <span className="text-text-primary font-medium" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="text-text-secondary hover:text-primary transition-colors"
              >
                {index === 0 ? (
                  <span className="flex items-center gap-1">
                    <Home className="w-4 h-4" />
                    <span className="sr-only">{item.label}</span>
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
