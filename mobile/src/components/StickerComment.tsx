import React, { useEffect, useState } from 'react';
import { Image, StyleProp, TextStyle, View } from 'react-native';
import { parseStickerText } from '../utils/stickerUtils';
import SafeHTML from './SafeHTML';

const STICKER_WIDTH = 160;

// A comment can be plain text, sticker markup, or text + sticker. Splitting it
// here keeps every comment renderer honest:
//  - `Image` with only `maxHeight` (no width/height) collapses to 0x0 in RN,
//    which is why stickers posted as comments showed up blank;
//  - surrounding text used to be dropped because callers only read `.url`.
function StickerImage({ url }: { url: string }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    Image.getSize(
      url,
      (w, h) => {
        if (mounted && w > 0 && h > 0) setDims({ w, h });
      },
      () => {},
    );
    return () => {
      mounted = false;
    };
  }, [url]);

  const height = dims ? Math.round((STICKER_WIDTH * dims.h) / dims.w) : 120;

  return (
    <Image
      source={{ uri: url }}
      style={{ width: STICKER_WIDTH, height, borderRadius: 8 }}
      resizeMode="contain"
    />
  );
}

export default function StickerComment({
  text,
  style,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
}) {
  const parsed = parseStickerText(text);
  if (!parsed.isSticker || !parsed.url) {
    return <SafeHTML text={text} style={style} />;
  }

  const before = (parsed.before || '').trim();
  const after = (parsed.after || '').trim();

  return (
    <View>
      {before ? <SafeHTML text={before} style={style} /> : null}
      <StickerImage url={parsed.url} />
      {after ? <SafeHTML text={after} style={style} /> : null}
    </View>
  );
}
