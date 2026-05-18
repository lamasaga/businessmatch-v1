import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Mail, Lock, Eye, EyeOff, Loader2, Compass } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const from = (location.state as { from?: string })?.from || '/career';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(formData.email, formData.password);
      navigate(from, { replace: true });
    } catch {
      // 错误已在store中设置
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <Compass className="w-7 h-7 text-background" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">欢迎回来</h1>
          <p className="text-foreground-muted mt-2 text-sm">登录你的商域账户</p>
        </div>

        <div className="glass-card p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">邮箱 / 用户名</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (error) clearError();
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="邮箱或用户名"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (error) clearError();
                  }}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-background-secondary border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-primary text-background font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-foreground-muted">
            还没有账户？{' '}
            <Link to="/register" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              立即注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
