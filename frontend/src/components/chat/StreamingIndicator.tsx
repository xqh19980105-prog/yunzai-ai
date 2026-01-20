'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface StreamingIndicatorProps {
  stage: 'thinking' | 'generating';
}

export function StreamingIndicator({ stage }: StreamingIndicatorProps) {
  return (
    <div className="flex gap-4">
      {/* Avatar */}
      <Avatar className="w-8 h-8 rounded-full shrink-0">
        <AvatarFallback className="bg-gray-200">
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>

      {/* Streaming Content */}
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
        {stage === 'thinking' ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">思考中...</p>
            <Progress value={30} className="h-1" />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">生成中...</p>
            <Progress value={70} className="h-1" />
          </div>
        )}
      </div>
    </div>
  );
}
