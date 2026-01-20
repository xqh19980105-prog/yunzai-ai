'use client';

import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface ModelBadgeProps {
  modelName: string;
}

export function ModelBadge({ modelName }: ModelBadgeProps) {
  return (
    <Badge variant="outline" className="rounded-full">
      <Sparkles className="w-3 h-3 mr-1" />
      Powered by {modelName}
    </Badge>
  );
}
