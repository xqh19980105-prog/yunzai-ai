import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  status: string;
  isLegalSigned?: boolean;
  membershipExpireAt?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isHydrated: false,
      
      setUser: (user) => {
        set({ user });
        // 同时手动更新 localStorage 中的 auth-storage
        if (typeof window !== 'undefined') {
          try {
            const stored = localStorage.getItem('auth-storage');
            if (stored) {
              const parsed = JSON.parse(stored);
              parsed.state.user = user;
              localStorage.setItem('auth-storage', JSON.stringify(parsed));
            }
          } catch (e) {
            console.error('Failed to update auth-storage:', e);
          }
        }
      },
      
      setAccessToken: (token) => {
        set({ accessToken: token });
        if (typeof window !== 'undefined') {
          if (token) {
            localStorage.setItem('accessToken', token);
            // 同时更新 auth-storage
            try {
              const stored = localStorage.getItem('auth-storage');
              if (stored) {
                const parsed = JSON.parse(stored);
                parsed.state.accessToken = token;
                localStorage.setItem('auth-storage', JSON.stringify(parsed));
              }
            } catch (e) {
              console.error('Failed to update auth-storage:', e);
            }
          } else {
            localStorage.removeItem('accessToken');
          }
        }
      },
      
      // 同时设置用户和token，确保原子性操作
      setAuth: (user, token) => {
        // 先更新 zustand state
        set({ user, accessToken: token });
        
        // 然后手动同步写入 localStorage（确保 persist 中间件的数据一致）
        if (typeof window !== 'undefined') {
          // 写入独立的 accessToken
          localStorage.setItem('accessToken', token);
          
          // 写入 auth-storage（zustand persist 格式）
          const authStorage = {
            state: {
              user,
              accessToken: token,
            },
            version: 0,
          };
          localStorage.setItem('auth-storage', JSON.stringify(authStorage));
          
          console.log('[auth-store] setAuth completed:', { email: user.email, hasToken: !!token });
        }
      },
      
      logout: () => {
        set({ user: null, accessToken: null });
        if (typeof window !== 'undefined') {
          // 清除所有认证相关的 localStorage 数据
          localStorage.removeItem('accessToken');
          localStorage.removeItem('auth-storage');
          // 注意：不清除 remembered-email，因为用户可能想保留邮箱以便下次登录
        }
      },
      
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // 只持久化 user 和 accessToken
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
      // 水合完成后设置标志
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        }
      },
    },
  ),
);

// 辅助函数：等待 store 水合完成
export const waitForHydration = (): Promise<void> => {
  return new Promise((resolve) => {
    const state = useAuthStore.getState();
    if (state.isHydrated) {
      resolve();
      return;
    }
    
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.isHydrated) {
        unsubscribe();
        resolve();
      }
    });
  });
};

// 辅助函数：从 localStorage 同步恢复状态（用于页面刷新后）
export const syncAuthFromStorage = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const storedToken = localStorage.getItem('accessToken');
  const storedAuth = localStorage.getItem('auth-storage');
  
  if (storedToken && storedAuth) {
    try {
      const parsed = JSON.parse(storedAuth);
      if (parsed.state?.user && parsed.state?.accessToken) {
        const state = useAuthStore.getState();
        if (!state.user || !state.accessToken) {
          useAuthStore.setState({
            user: parsed.state.user,
            accessToken: parsed.state.accessToken,
          });
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to sync auth from storage:', e);
    }
  }
  
  return false;
};
