import { Users } from 'lucide-react';
import { useCampStore } from '../../stores/campStore';

interface Props {
  groupId: number;
}

export default function MembersTab({ groupId }: Props) {
  const { current } = useCampStore();
  const members = current?.members ?? [];

  return (
    <div>
      <p className="text-sm text-foreground-muted mb-4">
        共 {members.length} 名学员
      </p>
      {members.length === 0 ? (
        <p className="text-sm text-foreground-muted">尚无学员加入，请将邀请码发给学生</p>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-foreground-muted text-left">
                <th className="px-4 py-3 font-medium">用户名</th>
                <th className="px-4 py-3 font-medium">角色</th>
                <th className="px-4 py-3 font-medium">加入时间</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.user_id} className="border-b border-border-subtle/50 last:border-0">
                  <td className="px-4 py-3">{m.username}</td>
                  <td className="px-4 py-3">{m.role === 'student' ? '学员' : m.role}</td>
                  <td className="px-4 py-3 text-foreground-muted">
                    {new Date(m.joined_at).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
