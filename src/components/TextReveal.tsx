'use client';

import { useEffect, useRef } from 'react';

interface TextRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
}

export default function TextReveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: TextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cleanup: (() => void) | undefined;

    const init = async () => {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default || gsapModule;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const lines = container.querySelectorAll('.line-inner');
      if (lines.length === 0) return;

      gsap.set(lines, { yPercent: 110 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 85%',
          once: true,
        },
      });

      tl.to(lines, {
        yPercent: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
        delay,
      });

      cleanup = () => {
        tl.kill();
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger === container) st.kill();
        });
      };
    };

    init();

    return () => {
      cleanup?.();
    };
  }, [delay]);

  // Split children text into lines
  const text = typeof children === 'string' ? children : '';
  const words = text.split(' ');

  // If children is a string, wrap in line masks
  if (typeof children === 'string') {
    return (
      <Tag ref={containerRef as any} className={className}>
        <span className="line-mask">
          <span className="line-inner">{children}</span>
        </span>
      </Tag>
    );
  }

  // If children are React elements, wrap the container
  return (
    <div ref={containerRef} className={className}>
      <span className="line-mask">
        <span className="line-inner">{children}</span>
      </span>
    </div>
  );
}

// Multi-line variant for long headings
export function TextRevealLines({
  lines,
  className = '',
  delay = 0,
  as: Tag = 'h2',
}: {
  lines: string[];
  className?: string;
  delay?: number;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cleanup: (() => void) | undefined;

    const init = async () => {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default || gsapModule;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const lineEls = container.querySelectorAll('.line-inner');
      if (lineEls.length === 0) return;

      gsap.set(lineEls, { yPercent: 110 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 85%',
          once: true,
        },
      });

      tl.to(lineEls, {
        yPercent: 0,
        duration: 1.0,
        ease: 'power3.out',
        stagger: 0.1,
        delay,
      });

      cleanup = () => {
        tl.kill();
      };
    };

    init();

    return () => {
      cleanup?.();
    };
  }, [delay]);

  return (
    <Tag ref={containerRef as any} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="line-mask" style={{ display: 'block' }}>
          <span className="line-inner">{line}</span>
        </span>
      ))}
    </Tag>
  );
}
