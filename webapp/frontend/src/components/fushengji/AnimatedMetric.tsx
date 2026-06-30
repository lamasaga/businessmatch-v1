import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  className?: string;
};

/** 数值变化时短暂高亮，减轻跳变感。 */
export default function AnimatedMetric({ value, className }: Props) {
  const prev = useRef(value);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 700);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <strong className={`${className || ''}${pulse ? ' fst-metric-pulse' : ''}`.trim()}>
      {value}
    </strong>
  );
}
