'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export function UserHeader() {
  const router = useRouter();
  const { user } = useAuthStore();

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Home Link */}
          <Link href="/" className="text-xl font-bold text-primary hover:opacity-80">
            芸仔AI
          </Link>

          {/* Right Side: Auth Links or User Info */}
          <div className="flex items-center gap-4">
            {user ? (
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-gray-100 rounded-full px-3 py-2"
                onClick={() => router.push('/settings')}
              >
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-600">{user.email}</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full"
                  onClick={() => router.push('/login')}
                >
                  登录
                </Button>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => router.push('/register')}
                >
                  注册
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}