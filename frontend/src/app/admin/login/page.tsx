'use client';

import { AuthForm } from '@/components/auth/AuthForm';

export default function AdminLoginPage() {
  return <AuthForm mode="login" isAdmin={true} />;
}