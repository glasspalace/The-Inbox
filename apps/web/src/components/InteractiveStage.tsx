import { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export function InteractiveStage({ density = 44 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pointer = { x: 0, y: 0, active: false };
    let width = 0;
    let height = 0;
    let raf = 0;
    let scroll = window.scrollY;
    const points: Point[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      points.length = 0;
      for (let i = 0; i < density; i += 1) {
        points.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          r: 1 + Math.random() * 3,
        });
      }
    };

    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = true;
    };

    const syncScroll = () => {
      scroll = window.scrollY;
    };

    const draw = () => {
      scroll += (window.scrollY - scroll) * 0.08;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(4, 4, 4, 0.24)";
      ctx.fillRect(0, 0, width, height);

      const drift = scroll * 0.035;
      points.forEach((point, index) => {
        const dx = pointer.x - point.x;
        const dy = pointer.y - point.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const pull = pointer.active && dist < 240 ? (240 - dist) / 240 : 0;

        point.vx += (dx / dist) * pull * 0.035;
        point.vy += (dy / dist) * pull * 0.035;
        point.x += point.vx + Math.sin(index + drift) * 0.12;
        point.y += point.vy + Math.cos(index * 1.7 + drift) * 0.12;
        point.vx *= 0.985;
        point.vy *= 0.985;

        if (point.x < -20) point.x = width + 20;
        if (point.x > width + 20) point.x = -20;
        if (point.y < -20) point.y = height + 20;
        if (point.y > height + 20) point.y = -20;

        ctx.fillStyle = index % 5 === 0 ? "#e43d30" : "#f2f0e8";
        ctx.fillRect(Math.round(point.x / 4) * 4, Math.round(point.y / 4) * 4, point.r * 3, point.r * 3);

        for (let j = index + 1; j < points.length; j += 1) {
          const other = points[j];
          const link = Math.hypot(point.x - other.x, point.y - other.y);
          if (link < 118) {
            ctx.strokeStyle = `rgba(242, 240, 232, ${0.22 - link / 620})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
      });

      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move);
    window.addEventListener("scroll", syncScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", syncScroll);
    };
  }, [density]);

  return <canvas className="interactive-stage" ref={canvasRef} aria-hidden="true" />;
}
