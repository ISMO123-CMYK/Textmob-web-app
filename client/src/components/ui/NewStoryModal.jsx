import { useState, useEffect, useRef } from 'react';
import { apiFetch, API_BASE_URL } from '../../config/api';
import { cn } from '../../utils/classNames';

export default function NewStoryModal({ isOpen, onClose, onStoryCreated }) {
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(null);
  const [isImage, setIsImage] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef(null);
  const username = localStorage.getItem('currentUser') || '';

  useEffect(() => {
    if (!isOpen) {
      setCaption('');
      setMediaFile(null);
      setErrorMsg(null);
      setUploading(false);
      setProgress(0);
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
        setMediaUrl(null);
      }
    }
  }, [isOpen]);

  function handleFile(file) {
    if (!file) return;
    if (file.size > 104857600) { // 100MB
      setErrorMsg('Media file must be under 100 MB');
      return;
    }
    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');
    if (!isImg && !isVid) {
      setErrorMsg('Please upload an image or video file');
      return;
    }
    setErrorMsg(null);
    setMediaFile(file);
    setIsImage(isImg);
    setMediaUrl(URL.createObjectURL(file));
  }

  function uploadStory(formData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/create-spark`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText || '{}'));
            } catch {
              resolve({});
            }
          } else {
            try {
              const errData = JSON.parse(xhr.responseText || '{}');
              reject(new Error(errData.error || `Upload failed (${xhr.status})`));
            } catch {
              reject(new Error(`Upload failed (${xhr.status})`));
            }
          }
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(formData);
    });
  }

  async function handlePost(e) {
    e?.preventDefault();
    if (!mediaFile) {
      setErrorMsg('Please attach a media file first.');
      return;
    }
    setErrorMsg(null);
    setUploading(true);
    const formData = new FormData();
    formData.append('username', username);
    formData.append('caption', caption || '');
    formData.append('media', mediaFile);
    try {
      const result = await uploadStory(formData);
      setUploading(false);
      if (onStoryCreated) onStoryCreated(result);
      onClose();
      window.showNotification?.({ title: 'Success', message: 'Story created! ✨', type: 'success' });
    } catch (err) {
      setUploading(false);
      setErrorMsg(err.message || 'Upload failed. Try again.');
    }
  }

  if (!isOpen) return null;

  const radius = 17;
  const strokeDasharray = Math.PI * 2 * radius;
  const strokeDashoffset = strokeDasharray - (progress / 100) * strokeDasharray;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-gray-100 tracking-tight">Create Story</h3>
            <p className="text-xs text-gray-400 mt-0.5">Share an image or video that expires in 24 hours</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {mediaUrl ? (
            <div className="relative rounded-2xl overflow-hidden bg-black max-h-[300px] flex items-center justify-center">
              {isImage ? (
                <img src={mediaUrl} className="max-h-[300px] object-contain" alt="Preview" />
              ) : (
                <video src={mediaUrl} className="max-h-[300px] object-contain" controls playsInline muted />
              )}
              <button
                onClick={() => {
                  setMediaFile(null);
                  setMediaUrl(null);
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFile(e.dataTransfer?.files?.[0]);
              }}
              className={cn(
                "h-52 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-colors",
                dragActive
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-600 fill-none stroke-current" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Upload story media</p>
                <p className="text-xs text-gray-400 mt-1">Image or Video up to 50 MB</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Caption (Optional)</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add some text to your story..."
              rows={2}
              maxLength={150}
              className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all resize-none"
            />
            <p className="text-right text-[10px] text-gray-400">{caption.length}/150</p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-red-500 flex-shrink-0 fill-none stroke-current" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-red-600 font-semibold">{errorMsg}</p>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-3 px-3 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <svg viewBox="0 0 44 44" className="w-10 h-10 flex-shrink-0">
                <circle cx="22" cy="22" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                />
                <text x="22" y="27" textAnchor="middle" fontSize="9" fontWeight="700" fill="#2563eb">
                  {progress}%
                </text>
              </svg>
              <div>
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Sharing story…</p>
                <p className="text-[11px] text-blue-500">Light up your sparks feed</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-[0.98] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={uploading || !mediaFile}
              className="flex-1 py-3 rounded-xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? 'Posting…' : '✦ Post Story'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
