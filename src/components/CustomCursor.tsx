'use client';

import { useEffect, useRef, useState } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [label, setLabel] = useState('');
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // Don't show on touch devices
    if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
      return;
    }

    const cursor = cursorRef.current;
    if (!cursor) return;

    const handleMouseMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseEnter = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const cursorType = el.closest('[data-cursor]')?.getAttribute('data-cursor');
      if (cursorType) {
        setIsExpanded(true);
        setLabel(cursorType);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('[data-cursor]')) {
        setIsExpanded(false);
        setLabel('');
      }
    };

    // Lerp animation loop
    const lerp = (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    };

    const animate = () => {
      pos.current.x = lerp(pos.current.x, target.current.x, 0.15);
      pos.current.y = lerp(pos.current.y, target.current.y, 0.15);

      if (cursor) {
        cursor.style.left = `${pos.current.x}px`;
        cursor.style.top = `${pos.current.y}px`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    // Initialize position
    pos.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    target.current = { ...pos.current };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseover', handleMouseEnter);
    document.addEventListener('mouseout', handleMouseLeave);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseEnter);
      document.removeEventListener('mouseout', handleMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className={`cursor-dot ${isExpanded ? 'expanded' : ''}`}
    >
      <span ref={labelRef} className="cursor-label">{label}</span>
    </div>
  );
}
