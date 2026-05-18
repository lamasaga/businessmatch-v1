import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { authService } from '../../services/authService';
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth, setLoading, setError, isLoading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少为6位');
      setLoading(false);
      return;
    }

    try {
      const auth = await authService.register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });
      setAuth(auth);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">创建账户</h1>
          <p className="text-foreground-muted mt-2">开始你的商业学习之旅</p>
        </div>

        <div className="glass-card p-8">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">用户名</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-background-hover border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="输入用户名"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-background-hover border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="your@email.com"
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
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 rounded-lg bg-background-hover border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="至少6位密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">确认密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-background-hover border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder="再次输入密码"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-foreground-muted">
            已有账户？{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              立即登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
