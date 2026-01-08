import { Shield } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function IntegrationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Figma */}
          <div className="p-4 border-2 border-surface rounded-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F24E1E] flex items-center justify-center">
                  <span className="text-white font-bold">F</span>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">FigJam</h4>
                  <p className="text-sm text-text-secondary">
                    Extract actions from workshop boards
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" disabled>
                Connect
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-3">
              Requires Figma API access token. Coming soon.
            </p>
          </div>

          {/* Azure DevOps */}
          <div className="p-4 border-2 border-surface rounded-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0078D7] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary">Azure DevOps</h4>
                  <p className="text-sm text-text-secondary">
                    Sync work items and track sprint progress
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" disabled>
                Connect
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-3">
              Requires Azure DevOps PAT. Coming soon.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
