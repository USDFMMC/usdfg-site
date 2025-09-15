import { useRef, useEffect } from 'react';

export const useSectionFadeIn = (direction = 'left') => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.style.opacity = '1';
          node.style.transform = direction === 'left' 
            ? 'translateX(0)' 
            : direction === 'right' 
            ? 'translateX(0)' 
            : 'translateY(0)';
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [direction]);

  return ref;
};
