import { useState, useRef, useCallback } from 'react';

export default function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
  const [isAtTop, setIsAtTop] = useState(true);
  const lastY = useRef(0);

  const onScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    setIsAtTop(y < 10);
    if (Math.abs(y - lastY.current) > 5) {
      setScrollDirection(y > lastY.current ? 'down' : 'up');
    }
    lastY.current = y;
  }, []);

  return { scrollDirection, isAtTop, onScroll };
}
