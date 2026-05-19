import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

/**
 * 应用初始化组件
 * 在应用挂载时自动尝试恢复用户登录状态
 */
export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
