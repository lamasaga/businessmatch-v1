import { BarChart3, Sparkles, TrendingUp, Activity, Target, Trophy } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

type Snap = Record<string, unknown> | null | undefined;
type History = Record<string, unknown>[];

interface Props {
  snap: Snap;
  history?: History;
}

export default function TvKpiCards({ snap, history = [] }: Props) {
  if (!snap) {
    return (
      <div className="rounded-xl border border-tv-primary/20 bg-background-secondary/60 p-6 text-xs text-foreground-muted text-center flex flex-col items-center gap-2">
        <Activity className="w-6 h-6 text-tv-primary/50" />
        <p>首轮结算后显示数据仪表盘</p>
      </div>
    );
  }

  const tech = Number((snap.tech as number) || 0);
  const fit = Number((snap.fit as number) || (snap.fit_total as number) || 0);
  const show = Number((snap.show as number) || (snap.show_total as number) || 0);
  const attention = Number((snap.eff_attention as number) || (snap.attention_total as number) || 0);
  const bqi = Number((snap.bqi as number) || 1);
  const rank = (snap.rank as number | undefined) ?? '—';

  const trendData = history.map((h) => ({
    round: `R${(h.round_no as number | undefined) ?? (h.round_number as number | undefined) ?? '-'}`,
    tech: Number((h.tech as number) || 0),
    bqi: Number((h.bqi as number) || 1),
    attention: Number((h.eff_attention as number) || (h.attention_total as number) || 0),
  }));

  const radarData = [
    { subject: 'Tech', A: tech, fullMark: Math.max(tech * 1.2, 10) },
    { subject: 'Fit', A: fit, fullMark: Math.max(fit * 1.2, 10) },
    { subject: 'Show', A: show, fullMark: Math.max(show * 1.2, 10) },
    { subject: 'Attention', A: attention, fullMark: Math.max(attention * 1.2, 10) },
    { subject: 'BQI', A: bqi, fullMark: Math.max(bqi * 1.2, 10) },
  ];

  return (
    <div className="space-y-3">
      {/* KPI 卡 */}
      <div className="grid grid-cols-3 gap-2">
        <KpiCard label="Tech" value={tech.toFixed(2)} icon={BarChart3} color="tv-tech" />
        <KpiCard label="Fit" value={fit.toFixed(2)} icon={Target} color="tv-user" />
        <KpiCard label="Show" value={show.toFixed(2)} icon={Sparkles} color="tv-brand" />
        <KpiCard label="BQI" value={bqi.toFixed(2)} icon={Activity} color="tv-primary" />
        <KpiCard label="声量" value={attention.toFixed(1)} icon={TrendingUp} color="tv-pathfinder" />
        <KpiCard label="排名" value={`#${rank}`} icon={Trophy} color="tv-primary" />
      </div>

      {/* 趋势图 */}
      {trendData.length > 1 && (
        <div className="rounded-xl border border-tv-primary/20 bg-background-secondary/60 p-3">
          <h3 className="text-xs font-bold flex items-center gap-1.5 mb-2 text-foreground-secondary">
            <TrendingUp className="w-3.5 h-3.5 text-tv-primary" /> 数据迭代趋势
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="round" stroke="#8a8a92" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#8a8a92" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#141416', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />
                <Line type="monotone" dataKey="tech" name="Tech" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="bqi" name="BQI" stroke="#a855f7" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="attention" name="声量" stroke="#eab308" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 雷达图 */}
      <div className="rounded-xl border border-tv-primary/20 bg-background-secondary/60 p-3">
        <h3 className="text-xs font-bold flex items-center gap-1.5 mb-1 text-foreground-secondary">
          <Target className="w-3.5 h-3.5 text-tv-primary" /> 产品五维画像
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" stroke="#b4b4be" fontSize={10} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#8a8a92" fontSize={9} />
              <Radar
                name="当前产品"
                dataKey="A"
                stroke="#a855f7"
                strokeWidth={2}
                fill="#a855f7"
                fillOpacity={0.25}
              />
              <Tooltip
                contentStyle={{ background: '#141416', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px' }}
                itemStyle={{ fontSize: '12px' }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'tv-tech' | 'tv-user' | 'tv-brand' | 'tv-primary' | 'tv-pathfinder';
}) {
  const styles = {
    'tv-tech': { text: 'text-tv-tech', bg: 'bg-tv-tech/15', border: 'border-tv-tech/30' },
    'tv-user': { text: 'text-tv-user', bg: 'bg-tv-user/15', border: 'border-tv-user/30' },
    'tv-brand': { text: 'text-tv-brand', bg: 'bg-tv-brand/15', border: 'border-tv-brand/30' },
    'tv-primary': { text: 'text-tv-primary', bg: 'bg-tv-primary/15', border: 'border-tv-primary/30' },
    'tv-pathfinder': { text: 'text-tv-pathfinder', bg: 'bg-tv-pathfinder/15', border: 'border-tv-pathfinder/30' },
  }[color];
  return (
    <div className={`rounded-xl border ${styles.border} bg-background/60 p-2.5 text-center`}>
      <div className={`w-6 h-6 rounded-lg ${styles.bg} flex items-center justify-center mx-auto mb-1`}>
        <Icon className={`w-3.5 h-3.5 ${styles.text}`} />
      </div>
      <p className="text-[9px] text-foreground-muted">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${styles.text}`}>{value}</p>
    </div>
  );
}
