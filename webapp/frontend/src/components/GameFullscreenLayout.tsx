import { Outlet } from 'react-router-dom';

/** 对局全屏壳：无侧栏、无平台内边距，占满视口 */
export default function GameFullscreenLayout() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground overflow-hidden">
      <Outlet />
    </div>
  );
}
