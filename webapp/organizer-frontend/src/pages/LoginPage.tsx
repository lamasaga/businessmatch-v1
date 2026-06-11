import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Radio, Lock, Mail } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(form.email, form.password);
      navigate('/', { replace: true });
    } catch {
      /* handled in store */
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
            <Radio className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">组织者登录</h1>
          <p className="text-foreground-muted text-sm mt-2">商识唯智 · 教师控场端</p>
          <p className="text-xs text-foreground-muted mt-3">
            演示账号：用户名 <strong>admin</strong> / 密码 <strong>admin123</strong>
          </p>
          <p className="text-xs text-foreground-muted mt-1">
            若提示无法连接，请先确认后端窗口已启动（http://localhost:8000）
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">邮箱 / 用户名</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                type="text"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-background-secondary border border-border-subtle rounded-xl focus:outline-none focus:border-primary"
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-background-secondary border border-border-subtle rounded-xl focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-primary text-background rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
