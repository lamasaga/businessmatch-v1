import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useOrganizerStore } from '../stores/organizerStore';
import ApplyPage from '../pages/ApplyPage';

/** 确保已登录用户具备组织者档案 */
export default function OrganizerBootstrap({ children }: { children: ReactNode }) {
  const { fetchProfile, profile } = useOrganizerStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchProfile();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  if (!ready) {
    return (      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <ApplyPage />;
  }

  return <>{children}</>;
}
