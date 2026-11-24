import {useCallback, useRef, useState, type ReactNode} from 'react';

export function Interactive3DCard({
  children,
  className = '',
  intensity = 5,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState(
    'perspective(1050px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'mouse') return;
      if (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const rotateY = Number((px * intensity).toFixed(2));
      const rotateX = Number((-py * intensity).toFixed(2));
      setTransformStyle(
        `perspective(1050px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.008, 1.008, 1.008)`,
      );
    },
    [intensity],
  );

  const handlePointerLeave = useCallback(() => {
    setTransformStyle('perspective(1050px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{
        transform: transformStyle,
        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={`tilt-3d-shell ${className}`}
    >
      {children}
    </div>
  );
}
