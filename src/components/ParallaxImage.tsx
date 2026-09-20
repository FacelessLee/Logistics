'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface ParallaxImageProps {
  children: ReactNode;
  speed?: number;
  className?: string;
}

export default function ParallaxImage({
  children,
  speed = 0.3,
  className = '',
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cleanup: (() => void) | undefined;

    const init = async () => {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default || gsapModule;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const inner = el.querySelector('.parallax-inner');
      if (!inner) return;

      gsap.to(inner, {
        yPercent: speed * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });

      cleanup = () => {
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger === el) st.kill();
        });
      };
    };

    init();

    return () => {
      cleanup?.();
    };
  }, [speed]);

  return (
    <div ref={ref} className={`${className}`} style={{ overflow: 'hidden' }}>
      <div className="parallax-inner" style={{ willChange: 'transform' }}>
        {children}
      </div>
    </div>
  );
}
