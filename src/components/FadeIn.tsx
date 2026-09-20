'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
}

export default function FadeIn({
  children,
  className = '',
  delay = 0,
  threshold = 0.15,
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.classList.add('visible');
          }, delay * 1000);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [delay, threshold]);

  return (
    <div ref={ref} className={`fade-up ${className}`}>
      {children}
    </div>
  );
}
