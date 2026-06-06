import { useState, useEffect, useRef } from 'react';

// gn – scroll direction hook
export default function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState('up');
  const [isAtTop, setIsAtTop] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setIsAtTop(y < 10);
      if (Math.abs(y - lastY.current) > 5) {
        setScrollDirection(y > lastY.current ? 'down' : 'up');
      }
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return { scrollDirection, isAtTop };
}
