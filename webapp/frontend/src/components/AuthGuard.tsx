import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Loader2 } from 'lucide-react';
import type { UserRole } from '../types';

/**
 * 路由守卫组件
 * 1. 未初始化时显示加载状态
 * 2. 需要登录但未登录时重定向到登录页
 * 3. 已登录但访问仅限游客的页面（如登录/注册）时重定向到首页
 * 4. 已登录但角色不满足时重定向到首页
 */

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  guestOnly?: boolean;
  requiredRole?: UserRole | UserRole[];
}

function hasRequiredRole(userRole: UserRole | undefined, required?: UserRole | UserRole[]): boolean {
  if (!required) return true;
  if (!userRole) return false;
  const allowed = Array.isArray(required) ? required : [required];
  return allowed.includes(userRole);
}

export default function AuthGuard({
  children,
  requireAuth = false,
  guestOnly = false,
  requiredRole,
}: AuthGuardProps) {
  const { user, isAuthenticated, isInitialized } = useAuthStore();
  const location = useLocation();

  // 等待初始化完成
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-foreground-muted">加载中...</p>
        </div>
      </div>
    );
  }

  // 需要登录但未登录
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // 已登录但访问仅限游客的页面（如登录/注册）
  if (guestOnly && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 已登录但角色不满足
  if (isAuthenticated && requiredRole && !hasRequiredRole(user?.role, requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
