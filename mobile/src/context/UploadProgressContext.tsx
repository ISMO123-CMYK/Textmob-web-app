import React, { createContext, useContext, useState, useCallback } from 'react';
import { View } from 'react-native';

interface UploadInfo {
  progress: number;
  status: 'uploading' | 'error';
  error?: string;
}

interface UploadProgressContextType {
  uploads: Record<string, UploadInfo>;
  startUpload: (uploadId: string) => void;
  updateProgress: (uploadId: string, progress: number) => void;
  completeUpload: (uploadId: string) => void;
  failUpload: (uploadId: string, error: string) => void;
}

const UploadProgressContext = createContext<UploadProgressContextType | null>(null);

export function UploadProgressProvider({ children }: { children: React.ReactNode }) {
  const [uploads, setUploads] = useState<Record<string, UploadInfo>>({});

  const startUpload = useCallback((uploadId: string) => {
    setUploads(prev => ({ ...prev, [uploadId]: { progress: 0, status: 'uploading' } }));
  }, []);

  const updateProgress = useCallback((uploadId: string, progress: number) => {
    setUploads(prev => prev[uploadId] ? { ...prev, [uploadId]: { ...prev[uploadId], progress } } : prev);
  }, []);

  const completeUpload = useCallback((uploadId: string) => {
    setUploads(prev => {
      const next = { ...prev };
      delete next[uploadId];
      return next;
    });
  }, []);

  const failUpload = useCallback((uploadId: string, error: string) => {
    setUploads(prev => prev[uploadId] ? { ...prev, [uploadId]: { ...prev[uploadId], status: 'error', error } } : prev);
  }, []);

  return (
    <UploadProgressContext.Provider value={{ uploads, startUpload, updateProgress, completeUpload, failUpload }}>
      {children}
      {/* Global Upload Progress Indicator */}
      {Object.entries(uploads).map(([id, upload]) => (
        <View key={id} style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
          height: 4, backgroundColor: 'rgba(37,99,235,0.15)',
        }}>
          <View style={{
            height: '100%', width: `${upload.progress}%`,
            backgroundColor: '#2563eb',
          }} />
        </View>
      ))}
    </UploadProgressContext.Provider>
  );
}

export function useUploadProgress() {
  const context = useContext(UploadProgressContext);
  if (!context) {
    throw new Error('useUploadProgress must be used within an UploadProgressProvider');
  }
  return context;
}
