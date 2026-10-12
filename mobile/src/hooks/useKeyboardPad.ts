import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';

/**
 * Android 15 / edge-to-edge breaks `softwareKeyboardLayoutMode: "resize"`
 * (Expo SDK 57 targets API 35): the keyboard overlays the window instead of
 * resizing it, so bottom bars stay underneath it. ChatThreadPane already
 * solved this by measuring the overlap and padding the host view; this hook
 * is that solution, reusable.
 *
 * Returns `keyboardPad` (0 on iOS, where KeyboardAvoidingView takes care of
 * it, and whenever the keyboard is hidden) plus a ref to attach to the host
 * view that has a fixed outer height (flex:1 inside a fixed-height parent).
 */
export function useKeyboardPad<T = View>() {
  const containerRef = useRef<T>(null);
  const [keyboardPad, setKeyboardPad] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;

    const apply = (screenY: number) => {
      const host: any = containerRef.current;
      host?.measureInWindow((_x: number, y: number, _w: number, h: number) => {
        const overlap = y + h - screenY;
        setKeyboardPad(overlap > 0 ? Math.ceil(overlap) : 0);
      });
    };

    const show = Keyboard.addListener('keyboardDidShow', (e: any) => {
      apply(e.endCoordinates?.screenY ?? 0);
      // Re-measure while the keyboard/frame settles (animation + input growth)
      t1 = setTimeout(() => apply(e.endCoordinates?.screenY ?? 0), 120);
      t2 = setTimeout(() => apply(e.endCoordinates?.screenY ?? 0), 350);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardPad(0));

    return () => {
      show.remove();
      hide.remove();
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, []);

  return { containerRef, keyboardPad };
}
