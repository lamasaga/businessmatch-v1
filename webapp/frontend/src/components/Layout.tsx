import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCareerStore } from '../stores/careerStore';
import {
  Home,
  Gamepad2,
  GraduationCap,
  Network,
  LogOut,
  Menu,
  X,
  Sparkles,
  Flame,
  Award,
  Compass,
  Zap,
  Rocket,
  Tent,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { filterNavItems, isCampPhase1, type NavItem } from '../lib/campPhase';

const allNavItems: NavItem[] = [
  { path: '/', label: '首页', icon: Home },
  { path: '/camp', label: '我的体验营', icon: Tent, highlight: true },
  { path: '/career', label: '生涯中枢', icon: Sparkles },
  { path: '/activities', label: '日常活动', icon: Flame },
  { path: '/games', label: '商赛大厅', icon: Gamepad2, highlight: true },
  { path: '/courses', label: '课程学院', icon: GraduationCap },
  { path: '/wiki', label: '知识图谱', icon: Network },
  { path: '/achievements', label: '成就中心', icon: Award },
  { path: '/opc', label: 'OPC 一人公司', icon: Rocket },
];

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { careerActive } = useCareerStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navItems = useMemo(() => filterNavItems(allNavItems), []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex flex-col w-64 bg-background-secondary border-r border-border-subtle fixed h-full z-40">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
              <Compass className="w-5 h-5 text-background" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground tracking-tight">商识唯智</h1>
              <p className="text-[11px] text-foreground-muted tracking-wide uppercase">
                {isCampPhase1 ? '商识唯智 · 体验营' : '商识唯智'}
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  active
                    ? 'bg-primary-soft text-primary nav-item-active'
                    : 'text-foreground-secondary hover:bg-background-hover hover:text-foreground'
                } ${item.highlight && !active ? 'ring-1 ring-primary/10' : ''}`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="font-medium text-sm">{item.label}</span>
                {item.highlight && (
                  <Zap className="w-3 h-3 text-primary/60 ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border-subtle">
          {careerActive ? (
            <Link
              to="/career"
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-background-hover transition-colors mb-2"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.username ?? '学员'}
                </p>
                <p className="text-xs text-foreground-muted">
                  {isCampPhase1 ? '体验营学员' : '赛季进行中'}
                </p>
              </div>
            </Link>
          ) : null}
          {isAuthenticated && user ? (
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg w-full text-foreground-secondary hover:bg-danger/10 hover:text-danger transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>退出登录</span>
            </button>
          ) : (
            <div className="space-y-2">
              <Link
                to="/career/start"
                className="block w-full text-center py-2.5 rounded-xl bg-primary text-background hover:bg-primary/90 transition-colors font-semibold text-sm"
              >
                开启生涯
              </Link>
              <Link
                to="/showcase"
                className="block w-full text-center py-2.5 rounded-xl border border-border-subtle text-foreground-secondary text-sm hover:bg-background-hover transition-colors"
              >
                新手指引
              </Link>
            </div>
          )}
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background-secondary/95 backdrop-blur-xl border-b border-border-subtle z-50 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
            <Compass className="w-4 h-4 text-background" />
          </div>
          <span className="font-bold text-foreground text-sm tracking-tight">商识唯智</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-background-hover transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-background z-40 p-4 overflow-y-auto">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                    isActive(item.path)
                      ? 'bg-primary-soft text-primary'
                      : 'text-foreground-secondary hover:bg-background-hover'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
