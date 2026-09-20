'use client';

import { useEffect, useRef } from 'react';

interface CountUpProps {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

export default function CountUp({
  end,
  suffix = '',
  prefix = '',
  duration = 2,
  decimals = 0,
  className = '',
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cleanup: (() => void) | undefined;

    const init = async () => {
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default || gsapModule;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);

      const counter = { value: 0 };

      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          if (hasAnimated.current) return;
          hasAnimated.current = true;

          gsap.to(counter, {
            value: end,
            duration,
            ease: 'power2.out',
            onUpdate: () => {
              if (el) {
                const val = decimals > 0
                  ? counter.value.toFixed(decimals)
                  : Math.round(counter.value).toLocaleString();
                el.textContent = `${prefix}${val}${suffix}`;
              }
            },
          });
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
  }, [end, suffix, prefix, duration, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}0{suffix}
    </span>
  );
}
