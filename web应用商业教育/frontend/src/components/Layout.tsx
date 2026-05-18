import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  Home,
  BookOpen,
  Gamepad2,
  GraduationCap,
  Network,
  User,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/games', label: '商赛大厅', icon: Gamepad2 },
  { path: '/courses', label: '课程中心', icon: GraduationCap },
  { path: '/wiki', label: '知识图谱', icon: Network },
];

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-background-secondary border-r border-border-subtle fixed h-full z-40">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">商业模拟</h1>
              <p className="text-xs text-foreground-muted">BizSim Edu</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-soft text-primary'
                    : 'text-foreground-secondary hover:bg-background-hover hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          {isAuthenticated && user ? (
            <div className="space-y-3">
              <Link
                to="/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-background-hover transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.username}</p>
                  <p className="text-xs text-foreground-muted capitalize">{user.role}</p>
                </div>
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-foreground-secondary hover:bg-danger/10 hover:text-danger transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>退出登录</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                to="/login"
                className="block w-full text-center py-2.5 rounded-lg border border-primary text-primary hover:bg-primary-soft transition-colors font-medium"
              >
                登录
              </Link>
              <Link
                to="/register"
                className="block w-full text-center py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
              >
                注册
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background-secondary/95 backdrop-blur-lg border-b border-border-subtle z-50 flex items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-foreground">商业模拟</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-background-hover"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-background z-40 p-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
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

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
