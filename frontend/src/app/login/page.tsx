'use client';

import { Suspense } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';

function LoginContent() {
  return <AuthModal defaultMode="login" />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">加载中...</div>}>
      <LoginContent />
    </Suspense>
  );
}
