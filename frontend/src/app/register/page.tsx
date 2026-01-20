'use client';

import { Suspense } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';

function RegisterContent() {
  return <AuthModal defaultMode="register" />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">加载中...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
