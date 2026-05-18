import { useRef, useEffect, useCallback, useState } from 'react';
import type { KnowledgeNode, KnowledgeEdge } from '../types';

interface GraphProps {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  onNodeClick?: (id: string) => void;
  selectedNodeId?: string | null;
  height?: number;
}

const DISCIPLINE_COLORS: Record<string, string> = {
  '经济学': '#60a5fa',
  '商学': '#34d399',
  '管理学': '#f59e0b',
};

export default function KnowledgeGraph({
  nodes,
  edges,
  onNodeClick,
  selectedNodeId,
  height = 420,
}: GraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const layoutRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; id: string }>>([]);
  const animFrame = useRef<number>(0);

  // Simple force-directed layout
  const computeLayout = useCallback((width: number, heightVal: number) => {
    if (nodes.length === 0) return [];
    const positions = nodes.map((n) => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: heightVal / 2 + (Math.random() - 0.5) * heightVal * 0.6,
      vx: 0,
      vy: 0,
      id: n.id,
    }));
    const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));

    // Simulate physics
    for (let iter = 0; iter < 120; iter++) {
      // Repulsion
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[i].x - positions[j].x;
          const dy = positions[i].y - positions[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 2000 / (dist * dist + 100);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          positions[i].vx += fx;
          positions[i].vy += fy;
          positions[j].vx -= fx;
          positions[j].vy -= fy;
        }
      }

      // Attraction (edges)
      for (const edge of edges) {
        const si = nodeMap.get(edge.source);
        const ti = nodeMap.get(edge.target);
        if (si === undefined || ti === undefined) continue;
        const dx = positions[ti].x - positions[si].x;
        const dy = positions[ti].y - positions[si].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 80) * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        positions[si].vx += fx;
        positions[si].vy += fy;
        positions[ti].vx -= fx;
        positions[ti].vy -= fy;
      }

      // Center gravity
      for (const p of positions) {
        p.vx += (width / 2 - p.x) * 0.005;
        p.vy += (heightVal / 2 - p.y) * 0.005;
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;
      }
    }

    return positions;
  }, [nodes, edges]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height: h } = canvas;

    ctx.clearRect(0, 0, width, h);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    const layout = layoutRef.current;
    const nodeMap = new Map(layout.map((p, i) => [p.id, i]));
    // Draw edges
    for (const edge of edges) {
      const si = nodeMap.get(edge.source);
      const ti = nodeMap.get(edge.target);
      if (si === undefined || ti === undefined) continue;
      const sp = layout[si];
      const tp = layout[ti];

      const isConnectedToSelected =
        selectedNodeId !== null &&
        selectedNodeId !== undefined &&
        (edge.source === selectedNodeId || edge.target === selectedNodeId);

      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(tp.x, tp.y);
      ctx.strokeStyle = isConnectedToSelected
        ? 'rgba(212, 168, 83, 0.5)'
        : 'rgba(100, 100, 110, 0.15)';
      ctx.lineWidth = isConnectedToSelected ? 2 : 1;
      ctx.stroke();
    }

    // Draw nodes
    for (let i = 0; i < layout.length; i++) {
      const p = layout[i];
      const node = nodes[i];
      if (!node) continue;

      const isSelected = selectedNodeId === node.id;
      const isHovered = hoverNode === node.id;
      const isDimmed =
        selectedNodeId &&
        selectedNodeId !== node.id &&
        !edges.some(
          (e) =>
            (e.source === selectedNodeId && e.target === node.id) ||
            (e.target === selectedNodeId && e.source === node.id)
        );

      const color = DISCIPLINE_COLORS[node.discipline] || '#94a3b8';
      const radius = 4 + Math.min(node.difficulty * 1.5, 8);
      const alpha = isDimmed ? 0.2 : isSelected ? 1 : isHovered ? 0.9 : 0.7;

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = color + '18';
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.fill();

      // Border
      ctx.strokeStyle = isSelected ? '#d4a853' : color + '88';
      ctx.lineWidth = isSelected ? 2.5 : 1;
      ctx.stroke();

      // Label for selected/hovered/large nodes
      if (isSelected || isHovered || radius > 6) {
        ctx.fillStyle = isDimmed ? 'rgba(150,150,150,0.3)' : '#e4e2dd';
        ctx.font = `${isSelected ? '600' : '400'} 11px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.title, p.x, p.y + radius + 13);
      }
    }

    ctx.restore();
  }, [nodes, edges, transform, hoverNode, selectedNodeId]);

  // Initialize layout and resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    if (nodes.length > 0) {
      const rect = container.getBoundingClientRect();
      layoutRef.current = computeLayout(rect.width, rect.height);
      // Center initially
      const xs = layoutRef.current.map((p) => p.x);
      const ys = layoutRef.current.map((p) => p.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      setTransform((t) => ({
        ...t,
        x: rect.width / 2 - cx,
        y: rect.height / 2 - cy,
      }));
    }

    return () => observer.disconnect();
  }, [nodes, computeLayout]);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      draw();
      animFrame.current = requestAnimationFrame(loop);
    };
    animFrame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame.current);
  }, [draw]);

  // Mouse events
  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - transform.x) / transform.scale,
      y: (e.clientY - rect.top - transform.y) / transform.scale,
    };
  };

  const findNodeAt = (x: number, y: number): string | null => {
    for (let i = 0; i < layoutRef.current.length; i++) {
      const p = layoutRef.current[i];
      const node = nodes[i];
      if (!node) continue;
      const r = 4 + Math.min(node.difficulty * 1.5, 8) + 6;
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy < r * r) return node.id;
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    const nodeId = findNodeAt(pos.x, pos.y);
    if (nodeId) {
      onNodeClick?.(nodeId);
    } else {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    const nodeId = findNodeAt(pos.x, pos.y);
    setHoverNode(nodeId);

    if (isDragging) {
      setTransform((t) => ({
        ...t,
        x: t.x + (e.clientX - dragStart.current.x),
        y: t.y + (e.clientY - dragStart.current.y),
      }));
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => {
      const newScale = Math.max(0.3, Math.min(4, t.scale * delta));
      return {
        scale: newScale,
        x: mx - (mx - t.x) * (newScale / t.scale),
        y: my - (my - t.y) * (newScale / t.scale),
      };
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full cursor-grab active:cursor-grabbing"
      style={{ height }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />
      {/* Legend */}
      <div className="absolute top-3 left-3 flex flex-wrap gap-3 pointer-events-none">
        {Object.entries(DISCIPLINE_COLORS).map(([name, color]) => (
          <div key={name} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-foreground-muted">{name}</span>
          </div>
        ))}
      </div>
      {/* Controls */}
      <div className="absolute bottom-3 right-3 flex gap-1">
        <button
          onClick={() => setTransform((t) => ({ ...t, scale: Math.min(4, t.scale * 1.2) }))}
          className="w-7 h-7 rounded-lg bg-background-secondary/80 text-foreground-muted hover:text-foreground text-xs backdrop-blur-sm border border-border-subtle flex items-center justify-center"
        >
          +
        </button>
        <button
          onClick={() => setTransform((t) => ({ ...t, scale: Math.max(0.3, t.scale / 1.2) }))}
          className="w-7 h-7 rounded-lg bg-background-secondary/80 text-foreground-muted hover:text-foreground text-xs backdrop-blur-sm border border-border-subtle flex items-center justify-center"
        >
          −
        </button>
        <button
          onClick={() => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const xs = layoutRef.current.map((p) => p.x);
            const ys = layoutRef.current.map((p) => p.y);
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
            const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
            setTransform({ scale: 1, x: rect.width / 2 - cx, y: rect.height / 2 - cy });
          }}
          className="w-7 h-7 rounded-lg bg-background-secondary/80 text-foreground-muted hover:text-foreground text-[10px] backdrop-blur-sm border border-border-subtle flex items-center justify-center"
        >
          ⌖
        </button>
      </div>
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-foreground-muted">暂无图谱数据</p>
        </div>
      )}
    </div>
  );
}
