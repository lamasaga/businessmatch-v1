import { lazy, Suspense, useState } from 'react';
import { Loader2 } from 'lucide-react';

const MembersTab = lazy(() => import('./MembersTab'));
const MemberProgressTab = lazy(() => import('./MemberProgressTab'));
const GroupsTab = lazy(() => import('./GroupsTab'));
const AnnouncementsTab = lazy(() => import('./AnnouncementsTab'));

const SUB_TABS = [
  { id: 'members', label: '成员名册', component: MembersTab },
  { id: 'progress', label: '学员进度', component: MemberProgressTab },
  { id: 'groups', label: '分组管理', component: GroupsTab },
  { id: 'announcements', label: '公告', component: AnnouncementsTab },
] as const;

interface Props {
  groupId: number;
}

export default function MemberManagementTab({ groupId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState('members');
  const ActiveComponent = SUB_TABS.find((t) => t.id === activeSubTab)?.component ?? MembersTab;

  return (
    <div>
      <div className="border-b border-border-subtle mb-4">
        <div className="flex gap-1">
          {SUB_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSubTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
        <ActiveComponent groupId={groupId} />
      </Suspense>
    </div>
  );
}
