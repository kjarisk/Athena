/**
 * PDF Export Utilities
 * Shared utilities and components for generating PDF reports
 */
import { 
  Text, 
  View, 
  StyleSheet, 
  Font 
} from '@react-pdf/renderer';
import { format } from 'date-fns';

// Register fonts (using system fonts for simplicity)
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff2', fontWeight: 700 }
  ]
});

// Common styles for PDF documents
export const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#1f2937'
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#D4A574',
    paddingBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280'
  },
  section: {
    marginTop: 20,
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  text: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#4b5563'
  },
  boldText: {
    fontWeight: 600
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6
  },
  column: {
    flex: 1
  },
  label: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2
  },
  value: {
    fontSize: 11,
    fontWeight: 600,
    color: '#1f2937'
  },
  statBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    minWidth: 80
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    color: '#D4A574'
  },
  statLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4
  },
  bullet: {
    width: 10,
    fontSize: 10,
    color: '#D4A574'
  },
  listText: {
    flex: 1,
    fontSize: 10,
    color: '#4b5563'
  },
  table: {
    marginTop: 10
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 600,
    color: '#374151'
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  tableCell: {
    fontSize: 9,
    color: '#4b5563'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af'
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 600
  },
  badgeHigh: {
    backgroundColor: '#fef2f2',
    color: '#dc2626'
  },
  badgeMedium: {
    backgroundColor: '#fefce8',
    color: '#ca8a04'
  },
  badgeLow: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 5
  }
});

// Helper to format dates consistently
export function formatPdfDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy');
}

// Helper to format date ranges
export function formatPdfDateRange(start: Date | string, end: Date | string): string {
  const s = typeof start === 'string' ? new Date(start) : start;
  const e = typeof end === 'string' ? new Date(end) : end;
  return `${format(s, 'MMM d')} - ${format(e, 'MMM d, yyyy')}`;
}

// Priority badge component
interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getStyle = () => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return pdfStyles.badgeHigh;
      case 'medium':
        return pdfStyles.badgeMedium;
      default:
        return pdfStyles.badgeLow;
    }
  };

  return (
    <Text style={[pdfStyles.badge, getStyle()]}>
      {priority.toUpperCase()}
    </Text>
  );
}

// Score indicator component
interface ScoreIndicatorProps {
  score: number;
  maxScore?: number;
  label: string;
}

export function ScoreIndicator({ score, maxScore = 100, label }: ScoreIndicatorProps) {
  const percentage = Math.round((score / maxScore) * 100);
  const getColor = () => {
    if (percentage >= 80) return '#16a34a';
    if (percentage >= 60) return '#ca8a04';
    return '#dc2626';
  };

  return (
    <View style={pdfStyles.statBox}>
      <Text style={[pdfStyles.statValue, { color: getColor() }]}>
        {score}
      </Text>
      <Text style={pdfStyles.statLabel}>{label}</Text>
    </View>
  );
}

// List component
interface ListProps {
  items: string[];
}

export function BulletList({ items }: ListProps) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={index} style={pdfStyles.listItem}>
          <Text style={pdfStyles.bullet}>•</Text>
          <Text style={pdfStyles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// Metric row component
interface MetricRowProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
}

export function MetricRow({ label, value, trend }: MetricRowProps) {
  const getTrendIcon = () => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '';
  };

  const getTrendColor = () => {
    if (trend === 'up') return '#16a34a';
    if (trend === 'down') return '#dc2626';
    return '#6b7280';
  };

  return (
    <View style={pdfStyles.row}>
      <Text style={[pdfStyles.text, { flex: 2 }]}>{label}</Text>
      <Text style={[pdfStyles.value, { flex: 1, textAlign: 'right' }]}>
        {value}
        {trend && (
          <Text style={{ color: getTrendColor() }}> {getTrendIcon()}</Text>
        )}
      </Text>
    </View>
  );
}
