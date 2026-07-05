import { DEMO_CAREER } from '../../data/mockPlatform';
import type { CareerRadar } from '../../stores/careerStore';

const labels = [
  { key: 'financial', label: '财务' },
  { key: 'marketing', label: '市场' },
  { key: 'strategic', label: '战略' },
  { key: 'collaborative', label: '协作' },
  { key: 'ethical', label: '伦理' },
] as const;

type Props = {
  radar?: CareerRadar | null;
};

export default function AbilityRadar({ radar }: Props) {
  const abilities = radar ?? DEMO_CAREER.abilities;
  const cx = 120;
  const cy = 120;
  const r = 80;
  const angleStep = (2 * Math.PI) / labels.length;

  const points = labels.map((_, i) => {
    const val = (abilities[labels[i].key as keyof typeof abilities] ?? 50) / 100;
    const angle = -Math.PI / 2 + i * angleStep;
    return {
      x: cx + r * val * Math.cos(angle),
      y: cy + r * val * Math.sin(angle),
    };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 240" className="w-full max-w-[220px]">
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon
            key={scale}
            points={labels
              .map((_, i) => {
                const angle = -Math.PI / 2 + i * angleStep;
                return `${cx + r * scale * Math.cos(angle)},${cy + r * scale * Math.sin(angle)}`;
              })
              .join(' ')}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
          />
        ))}
        <polygon
          points={polygon}
          fill="rgba(46, 195, 229, 0.22)"
          stroke="var(--primary, #2ec3e5)"
          strokeWidth={2}
        />
        {labels.map((item, i) => {
          const angle = -Math.PI / 2 + i * angleStep;
          const lx = cx + (r + 22) * Math.cos(angle);
          const ly = cy + (r + 22) * Math.sin(angle);
          return (
            <text
              key={item.key}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground-muted text-[11px]"
            >
              {item.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
