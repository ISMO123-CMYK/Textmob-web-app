import React, { createContext, useContext, useState, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

const SnapUploadContext = createContext();

export function SnapUploadProvider({ children }) {
  const [uploads, setUploads] = useState({});

  const startUpload = useCallback(async (formData, onComplete, onError) => {
    const uploadId = Date.now().toString();
    
    setUploads(prev => ({
      ...prev,
      [uploadId]: { progress: 0, status: 'uploading' }
    }));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/create-snap`);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploads(prev => ({
            ...prev,
            [uploadId]: { ...prev[uploadId], progress }
          }));
        }
      };

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            let result = {};
            try { result = JSON.parse(xhr.responseText || '{}'); } catch (e) {}
            
            setUploads(prev => {
              const newUploads = { ...prev };
              delete newUploads[uploadId];
              return newUploads;
            });
            
            onComplete?.(result);
            resolve(result);
          } else {
            const err = new Error(`Upload failed (${xhr.status})`);
            setUploads(prev => ({
              ...prev,
              [uploadId]: { ...prev[uploadId], status: 'error', error: err.message }
            }));
            onError?.(err);
            reject(err);
          }
        }
      };

      xhr.onerror = () => {
        const err = new Error('Network error');
        setUploads(prev => ({
          ...prev,
          [uploadId]: { ...prev[uploadId], status: 'error', error: err.message }
        }));
        onError?.(err);
        reject(err);
      };

      xhr.send(formData);
    });
  }, []);

  return (
    <SnapUploadContext.Provider value={{ uploads, startUpload }}>
      {children}
      {/* Global Upload Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 z-[1000] pointer-events-none">
        {Object.entries(uploads).map(([id, upload]) => (
          <div key={id} className="w-full h-1.5 bg-blue-100/30 backdrop-blur-sm overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
        ))}
      </div>
    </SnapUploadContext.Provider>
  );
}

export function useSnapUpload() {
  const context = useContext(SnapUploadContext);
  if (!context) {
    throw new Error('useSnapUpload must be used within a SnapUploadProvider');
  }
  return context;
}
