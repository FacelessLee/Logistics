'use client';

import React from 'react';

interface MarqueeProps {
  items: string[];
  speed?: number;
  direction?: 'left' | 'right';
  separator?: React.ReactNode;
  className?: string;
  itemClassName?: string;
}

export default function Marquee({
  items,
  speed = 30,
  direction = 'left',
  separator,
  className = '',
  itemClassName = '',
}: MarqueeProps) {
  // Duplicate items for seamless loop
  const duplicatedItems = [...items, ...items, ...items, ...items];

  const animationDirection = direction === 'left' ? 'marquee-scroll' : 'marquee-scroll-reverse';

  return (
    <div className={`marquee-container ${className}`}>
      <div
        className="marquee-track"
        style={{
          animationName: animationDirection,
          animationDuration: `${speed}s`,
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }}
      >
        {duplicatedItems.map((item, index) => (
          <span key={`${item}-${index}`} className={`marquee-item ${itemClassName}`}>
            {item}
            {separator || <span className="separator" />}
          </span>
        ))}
      </div>
    </div>
  );
}
