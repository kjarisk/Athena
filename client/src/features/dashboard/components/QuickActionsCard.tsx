import { Link } from 'react-router-dom';
import { Sparkles, Users, Calendar } from 'lucide-react';
import Card, { CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

/**
 * Quick Actions card in the sidebar
 */
export function QuickActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display tracking-wide">QUICK ACTIONS</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Link
            to="/extract"
            className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-primary/10 transition-colors"
          >
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-medium">Extract from Notes</span>
          </Link>
          <Link
            to="/employees"
            className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-secondary/10 transition-colors"
          >
            <Users className="w-5 h-5 text-secondary" />
            <span className="font-medium">View Team</span>
          </Link>
          <Link
            to="/events"
            className="flex items-center gap-3 p-3 bg-surface rounded-xl hover:bg-accent/10 transition-colors"
          >
            <Calendar className="w-5 h-5 text-accent" />
            <span className="font-medium">Events & Meetings</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
