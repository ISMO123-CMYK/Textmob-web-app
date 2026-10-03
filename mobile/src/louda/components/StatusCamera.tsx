import React, { useCallback } from 'react';
import { useLoudaStore } from '../store';
import { InAppCamera } from './InAppCamera';

// Mobile replacement for the web CameraOverlay (LoudaApp.jsx:9469-9483) —
// now a thin wrapper over the shared InAppCamera (tap=photo / hold=video),
// capped at 30s like WhatsApp status video. Keeps feeding StatusCreator the
// exact media shape it expects ({ file, type, music }).
export function StatusCamera() {
  const st = useLoudaStore();

  const close = useCallback(() => st.setShowStatusCamera(false), [st.setShowStatusCamera]);

  const onCapture = useCallback(
    (file: { uri: string; fileName: string; mimeType: string; type: 'image' | 'video' }) => {
      st.setStatusCameraMedia({
        file: { uri: file.uri, fileName: file.fileName, mimeType: file.mimeType, type: file.mimeType },
        type: file.type,
        music: undefined,
      });
      st.setShowStatusCreator(true);
      st.setShowStatusCamera(false);
    },
    [st.setStatusCameraMedia, st.setShowStatusCreator, st.setShowStatusCamera],
  );

  return (
    <InAppCamera
      mode="both"
      maxVideoSeconds={30}
      filePrefix="status"
      onCancel={close}
      onCapture={onCapture}
    />
  );
}
