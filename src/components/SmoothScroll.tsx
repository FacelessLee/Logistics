'use client';

import { useEffect, useRef } from 'react';

export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<any>(null);

  useEffect(() => {
    let lenis: any;

    const init = async () => {
      const Lenis = (await import('lenis')).default;
      const gsapModule = await import('gsap');
      const gsap = gsapModule.default || gsapModule;
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');

      gsap.registerPlugin(ScrollTrigger);

      lenis = new Lenis({
        duration: 1.2,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        touchMultiplier: 2,
        infinite: false,
      });

      lenisRef.current = lenis;

      // Sync Lenis with GSAP ScrollTrigger
      lenis.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time: number) => {
        lenis.raf(time * 1000);
      });

      gsap.ticker.lagSmoothing(0);
    };

    init();

    return () => {
      if (lenis) {
        lenis.destroy();
      }
    };
  }, []);

  return <div id="smooth-wrapper">{children}</div>;
}
