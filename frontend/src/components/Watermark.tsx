'use client';

import { useAuthStore } from '@/stores/auth-store';

interface WatermarkProps {
  text?: string;
}

export function Watermark({ text }: WatermarkProps) {
  const user = useAuthStore((state) => state.user);
  
  const watermarkText = text || `芸仔AI - UID:${user?.id || 'guest'}`;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
      aria-hidden="true"
    >
      <div
        className="text-gray-300/20 text-4xl font-bold select-none"
        style={{
          transform: 'rotate(-45deg)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {watermarkText}
      </div>
    </div>
  );
}
