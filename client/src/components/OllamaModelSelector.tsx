import { useQuery } from '@tanstack/react-query';
import { Select } from './ui/Input';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import Button from './ui/Button';

interface OllamaModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export default function OllamaModelSelector({ 
  selectedModel, 
  onModelChange 
}: OllamaModelSelectorProps) {
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['ollamaStatus'],
    queryFn: () => apiHelpers.getOllamaStatus().then(r => r.data),
    retry: 1,
    refetchInterval: 30000 // Check every 30 seconds
  });

  const { data: modelsData, isLoading: modelsLoading, refetch } = useQuery({
    queryKey: ['ollamaModels'],
    queryFn: () => apiHelpers.getOllamaModels().then(r => r.data.data),
    enabled: statusData?.data?.connected === true,
    retry: 1
  });

  const isConnected = statusData?.data?.connected === true;
  const models = modelsData?.models || [];

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(2)} GB`;
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className={`p-4 rounded-xl flex items-start gap-3 ${
        isConnected ? 'bg-success/10 border border-success/20' : 'bg-warning/10 border border-warning/20'
      }`}>
        {statusLoading ? (
          <RefreshCw className="w-5 h-5 animate-spin text-text-secondary" />
        ) : isConnected ? (
          <CheckCircle className="w-5 h-5 text-success" />
        ) : (
          <XCircle className="w-5 h-5 text-warning" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">
            {statusLoading ? 'Checking Ollama...' : 
             isConnected ? 'Ollama Connected' : 'Ollama Not Available'}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {isConnected 
              ? `${models.length} model${models.length !== 1 ? 's' : ''} installed (default: localhost:11434)`
              : 'Make sure Ollama is running on your machine. Install from ollama.ai'}
          </p>
        </div>
        {isConnected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            isLoading={modelsLoading}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Model Selection */}
      {isConnected && models.length > 0 && (
        <div>
          <Select
            label="Ollama Model"
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            options={models.map((model: any) => ({
              value: model.name,
              label: `${model.name} (${formatSize(model.size)})`
            }))}
          />
          <p className="text-xs text-text-muted mt-2">
            Select which local AI model to use for insights and suggestions.
          </p>
        </div>
      )}

      {/* No Models Warning */}
      {isConnected && models.length === 0 && (
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
          <p className="text-sm font-medium text-warning">No Models Installed</p>
          <p className="text-xs text-text-muted mt-1">
            Install a model using: <code className="bg-surface px-2 py-1 rounded">ollama pull llama2</code>
          </p>
        </div>
      )}
    </div>
  );
}
