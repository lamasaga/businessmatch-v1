import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, LogOut, Radio } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useOrganizerStore } from '../stores/organizerStore';

const nav = [
  { to: '/', label: '控制台', icon: LayoutDashboard },
  { to: '/events/create', label: '创建比赛', icon: PlusCircle },
];

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const profile = useOrganizerStore((s) => s.profile);

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-border-subtle bg-background-secondary flex flex-col">
        <div className="p-5 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            <span className="font-semibold text-sm">组织者控制台</span>
          </div>
          <p className="text-xs text-foreground-muted mt-1 truncate">
            {profile?.organization_name || user?.username}
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-foreground-muted hover:bg-background-hover hover:text-foreground'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground-muted hover:text-danger rounded-lg hover:bg-background-hover"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
