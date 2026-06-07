import { useEffect, useRef } from 'react';
import GameHUD from './components/GameHUD';

export default function OPSSIMEntry() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // TODO: 接入 Phaser 后初始化 Game 实例
    return () => {};
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 bg-slate-900" />
      <GameHUD />
    </div>
  );
}
