import { useState, useRef, useEffect } from 'react';

export const useCountUp = (target: number, duration = 1000) => {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const animRef = useRef<number>();

  const start = () => {
    let startTime: number | undefined;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      setValue(Math.floor(progress * target));
      
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    
    animRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [target, duration]);

  return { value, ref };
};
