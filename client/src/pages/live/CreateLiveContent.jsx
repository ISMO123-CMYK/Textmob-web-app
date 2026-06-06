import { useState, useEffect, useRef, Fragment } from 'react';
import { apiFetch, API_BASE_URL } from '../../config/api';
import GiftIcon, { giftsList, injectLiveStyles } from '../../components/ui/GiftIcon';

function ConfettiPart({ x, y, color, size, delay, duration, shape }) {
  return (
    <div
      className="tm-confetti"
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        '--dur': `${duration}s`,
        animationDelay: `${delay}s`,
        width: size,
        height: shape === 'circle' ? size : size * 0.6,
        borderRadius: shape === 'circle' ? '50%' : 3,
        background: color,
        opacity: 0
      }}
    />
  );
}

function GiftOverlay({ gift, sender, onDone }) {
  const duration = { 1: 2, 2: 2.5, 3: 3.5, 4: 4.5, 5: 5.5 }[gift.tier] || 2;
  const title = { 5: 'LEGENDARY', 4: 'EPIC', 3: 'INCREDIBLE', 2: 'AWESOME', 1: 'NICE' }[gift.tier] || 'NICE';

  useEffect(() => {
    const t = setTimeout(() => onDone?.(), duration * 1000 + 200);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  return (
    <>
      <div
        className="tm-screen-flash"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 55,
          pointerEvents: 'none',
          background: gift.color,
          '--dur': `${duration * 0.4}s`
        }}
      />
      <div
        className="tm-tier-text"
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          zIndex: 65,
          pointerEvents: 'none',
          '--dur': `${duration}s`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap'
        }}
      >
        <div
          style={{
            color: gift.color,
            fontSize: gift.tier >= 5 ? 52 : gift.tier >= 4 ? 44 : gift.tier >= 3 ? 36 : 28,
            fontWeight: 900,
            textShadow: `0 0 30px ${gift.color}, 0 2px 8px rgba(0,0,0,.8)`,
            letterSpacing: '-1px',
            lineHeight: 1
          }}
        >
          {title}
        </div>
        {gift.tier >= 2 && (
          <div
            style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: 800,
              textShadow: '0 1px 6px rgba(0,0,0,.9)',
              opacity: 0.9
            }}
          >
            {sender} sent {gift.name} · {gift.cost} coins
          </div>
        )}
      </div>
    </>
  );
}

function ConfettiBlast({ gift, onDone }) {
  const count = { 1: 60, 2: 120, 3: 240, 4: 420, 5: 700 }[gift.tier] || 80;
  const shapes = ['circle', 'rect', 'rect', 'rect'];
  const colors = [gift.color, '#fff', '#fde68a', '#a78bfa', '#34d399', '#f87171', '#38bdf8', '#fb7185'];

  const particles = useRef(
    Array.from({ length: count }, (_, idx) => {
      const colIdx = gift.tier >= 4 ? Math.floor(idx / (count / 4)) : 0;
      const targetX = gift.tier >= 4 ? [20, 50, 80, 50][colIdx] : 50;
      const range = gift.tier >= 4 ? 55 : gift.tier >= 3 ? 45 : 35;
      return {
        id: idx,
        x: Math.max(0, Math.min(100, targetX + (Math.random() - 0.5) * range * 2)),
        y: 100 + Math.random() * 30,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 5 + Math.random() * (gift.tier >= 5 ? 22 : gift.tier >= 4 ? 18 : gift.tier >= 3 ? 13 : 9),
        delay: Math.random() * (gift.tier >= 4 ? 1.2 : gift.tier >= 3 ? 0.9 : 0.5),
        duration: 1.8 + Math.random() * (gift.tier >= 5 ? 4 : gift.tier >= 4 ? 3.2 : gift.tier >= 3 ? 2.4 : 1.6),
        shape: shapes[Math.floor(Math.random() * shapes.length)]
      };
    })
  ).current;

  useEffect(() => {
    const duration = { 1: 3, 2: 4, 3: 5.5, 4: 7, 5: 9 }[gift.tier] || 3;
    const t = setTimeout(() => onDone?.(), duration * 1000);
    return () => clearTimeout(t);
  }, [gift.tier, onDone]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 50
      }}
    >
      {particles.map(p => (
        <ConfettiPart {...p} key={p.id} />
      ))}
    </div>
  );
}

function FloatersGroup({ floaters }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 45
      }}
    >
      {floaters.map(f => (
        <div
          key={f.id}
          className="tm-gift-float"
          style={{
            position: 'absolute',
            left: `${f.x}%`,
            bottom: '20%',
            '--dur': `${f.dur}s`,
            color: f.color
          }}
        >
          <GiftIcon id={f.giftId} size={f.size} />
        </div>
      ))}
    </div>
  );
}

function CameraFlipIcon({ facing }) {
  if (facing === 'user') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
        <rect x="4.5" y="7.5" width="12" height="9" rx="2.25" />
        <circle cx="10.5" cy="12" r="1.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5L20 7v3.5h-3.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 6.5h3.5m0 0V10" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
      <rect x="7.5" y="7.5" width="12" height="9" rx="2.25" />
      <circle cx="13.5" cy="12" r="1.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 13.5L4 17v-3.5h3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 17.5H5m0 0V14" />
    </svg>
  );
}

function CameraFlipButton({ facing, onClick, className = '' }) {
  const actionLabel = facing === 'user' ? 'Switch to rear camera' : 'Switch to front camera';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={actionLabel}
      title={actionLabel}
      className={className}
    >
      <CameraFlipIcon facing={facing} />
    </button>
  );
}

export default function CreateLiveContent() {
  const [mode, setMode] = useState('camera');
  const [facing, setFacing] = useState('user');
  const [title, setTitle] = useState('');
  const [liveActive, setLiveActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [postId, setPostId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [progressVal, setProgressVal] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [floaters, setFloaters] = useState([]);
  const [giftOverlays, setGiftOverlays] = useState([]);
  const [timeLeft, setTimeLeft] = useState(600);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);

  const videoRef = useRef(null);
  const localStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunkBufferRef = useRef([]);
  const pulseIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const cameraSwitchTimerRef = useRef(null);
  const seenCommentsRef = useRef(new Set());
  const chatScrollRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    injectLiveStyles();
  }, []);

  useEffect(() => {
    if (!liveActive) return;
    setTimeLeft(21600);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          stopBroadcastChannel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [liveActive]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  useEffect(() => {
    if (!liveActive || !postId) return;
    pulseIntervalRef.current = setInterval(() => {
      const socket = window.socket;
      if (socket) socket.emit('livePulse', { postId });
    }, 8000);

    return () => {
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
    };
  }, [liveActive, postId]);

  const addCommentLocally = (comment) => {
    const key = comment.id || `${comment.username}|${comment.text || ''}|${comment.giftId || ''}|${comment.created_at || ''}`;
    if (!seenCommentsRef.current.has(key)) {
      seenCommentsRef.current.add(key);
      setComments(prev => [...prev.slice(-199), comment]);
    }
  };

  const receiveGiftVisual = (gift, sender) => {
    const idx = Date.now() + Math.random();
    setGiftOverlays(prev => [...prev, { id: idx, gift, sender }]);

    const count = { 1: 4, 2: 8, 3: 16, 4: 32, 5: 60 }[gift.tier] || 4;
    const items = Array.from({ length: count }, (_, i) => ({
      id: idx + i,
      giftId: gift.id,
      color: gift.color,
      x: 15 + Math.random() * 70,
      size: 20 + gift.tier * 6,
      dur: 1.8 + Math.random() * 1.2
    }));
    setFloaters(prev => [...prev, ...items]);
    setTimeout(() => {
      setFloaters(prev => prev.filter(f => !items.find(t => t.id === f.id)));
    }, 4000);
  };

  useEffect(() => {
    const socket = window.socket;
    if (!socket || !postId) return;

    const onViewerCount = (data) => {
      if (data && String(data.postId) === String(postId)) {
        setViewerCount(Number(data.count || 0));
      }
    };

    const onLiveComment = (data) => {
      if (data && String(data.postId) === String(postId) && data.comment) {
        addCommentLocally(data.comment);
      }
    };

    const onMobcoinsGift = (data) => {
      if (!data || String(data.postId) !== String(postId)) return;
      const targetGift = giftsList.find(g => g.id === data.giftId);
      if (targetGift) {
        receiveGiftVisual(targetGift, data.fromId || 'Someone');
        addCommentLocally({
          username: data.fromId || 'Someone',
          text: '',
          giftId: data.giftId,
          gift: targetGift,
          created_at: new Date().toISOString(),
          id: `gift-${Date.now()}`
        });
      }
    };

    socket.on('viewerCountUpdate', onViewerCount);
    socket.on('liveComment', onLiveComment);
    socket.on('mobcoins-gift', onMobcoinsGift);

    return () => {
      socket.off('viewerCountUpdate', onViewerCount);
      socket.off('liveComment', onLiveComment);
      socket.off('mobcoins-gift', onMobcoinsGift);
    };
  }, [postId]);

  const startRecording = (stream, id) => {
    chunkBufferRef.current = [];
    const codec = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm';

    let bits = 1500000;
    if (navigator.connection) {
      const type = navigator.connection.effectiveType;
      if (type === '3g') bits = 500000;
      else if (type === '2g') bits = 250000;
    }

    const mr = new MediaRecorder(stream, { mimeType: codec, videoBitsPerSecond: bits });
    recorderRef.current = mr;
    mr.post_id = id;

    mr.ondataavailable = async (e) => {
      if (e?.data?.size > 0) {
        chunkBufferRef.current.push(e.data);

        try {
          const arrayBuffer = await e.data.arrayBuffer();
          await fetch(`${API_BASE_URL}/api/live-chunk-upload/${id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream'
            },
            body: arrayBuffer
          });
        } catch (err) {
          console.error('Error uploading chunk:', err);
        }
      }
    };

    mr.start(2000);
  };

  const uploadAndSaveStream = async () => {
    return new Promise((resolve) => {
      const mr = recorderRef.current;
      if (!mr) return resolve(null);
      const post_id = mr.post_id;

      mr.onstop = async () => {
        const fileBlob = new Blob(chunkBufferRef.current, { type: 'video/webm' });
        if (!fileBlob.size || !post_id) return resolve(null);

        const fd = new FormData();
        fd.append('video', fileBlob, `${post_id}.webm`);
        fd.append('postId', post_id);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/upload-live`, true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgressVal(Math.round((e.loaded / e.total) * 100));
          }
        };

        xhr.onload = () => {
          try {
            resolve(JSON.parse(xhr.responseText)?.savedUrl || null);
          } catch {
            resolve(null);
          }
        };

        xhr.onerror = () => resolve(null);
        xhr.send(fd);
      };

      try {
        if (mr.state === 'inactive') resolve(null);
        else mr.stop();
      } catch {
        resolve(null);
      }
    });
  };

  const captureLocalMedia = async (id) => {
    setErrorMsg('');
    let stream;
    try {
      if (mode === 'camera') {
        const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isMobileDevice ? { facingMode: facing } : true
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          audio: true,
          video: true
        });
      }
    } catch (err) {
      setErrorMsg('Cannot access media. Check permissions.');
      throw err;
    }

    localStreamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.srcObject = stream;
      await new Promise((res) => {
        if (!videoRef.current || videoRef.current.readyState >= 1) return res();
        videoRef.current.addEventListener('loadedmetadata', res, { once: true });
      });
      await videoRef.current.play().catch(() => { });
    }

    startRecording(stream, id);
    return stream;
  };

  const handleGoLiveClick = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg('Add a title first.');
      return;
    }
    setShowStartModal(true);
  };

  const handleConfirmStart = () => {
    setShowStartModal(false);
    beginLiveBroadcast();
  };

  const beginLiveBroadcast = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMsg('Add a title first.');
      return;
    }

    setStarting(true);
    setErrorMsg('');

    const socket = window.socket;
    if (!socket) {
      setErrorMsg('Websocket connection unavailable.');
      setStarting(false);
      return;
    }

    const payload = {
      username: localStorage.currentUser || 'Guest',
      text: cleanTitle,
      visib: 'public'
    };

    socket.emit('startLive', payload, async (res) => {
      if (!res?.ok) {
        setErrorMsg(res?.error || 'Failed to start.');
        setStarting(false);
        return;
      }

      const streamId = String(res.postId);
      setPostId(streamId);

      try {
        await captureLocalMedia(streamId);
        setLiveActive(true);
      } catch (err) {
        setErrorMsg(`Could not start stream: ${err?.message || ''}`);
        try {
          socket.emit('endLive', { postId: streamId, save: false });
        } catch { }
      }

      setStarting(false);
    });
  };

  const togglePauseOverride = () => {
    if (!localStreamRef.current) return;
    const nextVal = !paused;
    localStreamRef.current.getVideoTracks().forEach(t => {
      t.enabled = paused;
    });

    if (nextVal) {
      try { recorderRef.current?.pause(); } catch { }
      window.socket?.emit('livePaused', { postId });
    } else {
      try { recorderRef.current?.resume(); } catch { }
      window.socket?.emit('liveResumed', { postId });
    }
    setPaused(nextVal);
  };

  const toggleMuteOverride = () => {
    if (!localStreamRef.current) return;
    const nextVal = !muted;
    localStreamRef.current.getAudioTracks().forEach(t => {
      t.enabled = !nextVal;
    });
    setMuted(nextVal);
  };

  const restartRecorderForStream = (stream, id) => {
    if (cameraSwitchTimerRef.current) {
      clearTimeout(cameraSwitchTimerRef.current);
      cameraSwitchTimerRef.current = null;
    }

    const currentRecorder = recorderRef.current;
    if (!liveActive || !currentRecorder || currentRecorder.state === 'inactive') {
      startRecording(stream, id);
      return;
    }

    try {
      currentRecorder.stop();
    } catch { }

    cameraSwitchTimerRef.current = setTimeout(() => {
      if (liveActive && localStreamRef.current === stream) {
        startRecording(stream, id);
      }
    }, 220);
  };

  const flipCameraFacing = async () => {
    if (mode !== 'camera') return;

    const nextFacing = facing === 'user' ? 'environment' : 'user';
    setErrorMsg('');

    try {
      const existingStream = localStreamRef.current;
      let newVideoStream;

      try {
        newVideoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { exact: nextFacing } }
        });
      } catch {
        newVideoStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: nextFacing } }
        });
      }

      const newVideoTrack = newVideoStream.getVideoTracks()[0];
      if (!newVideoTrack) throw new Error('No video track available.');

      const audioTrack = existingStream?.getAudioTracks()?.[0] || null;
      const oldVideoTracks = existingStream?.getVideoTracks?.() || [];

      oldVideoTracks.forEach(track => {
        try { track.stop(); } catch { }
      });

      const mergedStream = new MediaStream();
      if (audioTrack) mergedStream.addTrack(audioTrack);
      mergedStream.addTrack(newVideoTrack);

      localStreamRef.current = mergedStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mergedStream;
      }

      setFacing(nextFacing);
      restartRecorderForStream(mergedStream, postId || recorderRef.current?.post_id);
    } catch (err) {
      setErrorMsg('Could not switch camera.');
    }
  };

  const postHostComment = () => {
    const cleanComment = commentInput.trim();
    if (!cleanComment || !postId) return;
    const commentPayload = {
      username: localStorage.currentUser || 'Host',
      text: cleanComment,
      created_at: new Date().toISOString(),
      id: Date.now() + Math.random()
    };
    setCommentInput('');
    addCommentLocally(commentPayload);
    window.socket?.emit('liveComment', { postId, comment: commentPayload });
  };

  const stopBroadcastChannel = async () => {
    if (!postId) return;
    setEnding(true);

    if (cameraSwitchTimerRef.current) {
      clearTimeout(cameraSwitchTimerRef.current);
      cameraSwitchTimerRef.current = null;
    }

    try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { }
    localStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;

    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch { }

    window.socket?.emit('endLive', { postId, save: false, savedUrl: null }, () => {
      setLiveActive(false);
      setViewerCount(0);
      setEnding(false);
      setComments([]);
      try { window.Lexum?.navigate('/'); } catch { }
    });
  };

  useEffect(() => () => {
    if (cameraSwitchTimerRef.current) clearTimeout(cameraSwitchTimerRef.current);
    try { localStreamRef.current?.getTracks().forEach(t => t.stop()); } catch { }
    try { if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop(); } catch { }
  }, []);

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100dvh', boxSizing: 'border-box' }}>
      {isDesktop ? (
        <div className="flex h-screen max-w-7xl mx-auto p-4 md:p-6 gap-4">
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-white">Go Live</h1>
                <p className="text-xs text-white/40">@{localStorage.currentUser || 'Guest'}</p>
              </div>
              {liveActive && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-xs text-white/50 bg-white/10 px-2.5 py-1 rounded-full">{viewerCount} watching</span>
                  <span className="text-xs text-white/70 bg-red-950/40 border border-red-500/30 px-2.5 py-1 rounded-full font-mono">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            <div className="relative flex-1 bg-black rounded-3xl overflow-hidden border border-white/10 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
              {!liveActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-white/30 text-sm">Media feed preview will render here</p>
                </div>
              )}
              {paused && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <p className="text-white text-xl font-bold">Stream Paused</p>
                </div>
              )}
              {giftOverlays.map(g => (
                <ConfettiBlast gift={g.gift} onDone={() => { }} key={`confetti-${g.id}`} />
              ))}
              <FloatersGroup floaters={floaters} />
              {giftOverlays.map(g => (
                <GiftOverlay
                  gift={g.gift}
                  sender={g.sender}
                  onDone={() => setGiftOverlays(p => p.filter(x => x.id !== g.id))}
                  key={g.id}
                />
              ))}
            </div>

            {liveActive ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePauseOverride}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${paused ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/15 text-white'}`}
                >
                  {paused ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M8 5v14l11-7z" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                  )}
                </button>

                <button
                  onClick={toggleMuteOverride}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${muted ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/15 text-white'}`}
                >
                  {muted ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  )}
                </button>

                {mode === 'camera' && (
                  <CameraFlipButton
                    facing={facing}
                    onClick={flipCameraFacing}
                    className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition-all"
                  />
                )}

                <button
                  onClick={() => setShowChat(c => !c)}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${showChat ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/15 text-white'}`}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </button>

                <div className="flex-1" />

                <button
                  onClick={stopBroadcastChannel}
                  disabled={ending}
                  className="px-6 h-11 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-lg shadow-red-600/10 active:scale-95 transition-all"
                >
                  {ending ? 'Ending...' : 'End Live'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="What is your stream about?"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 transition-colors"
                />
                <div className="flex gap-2">
                  {['camera', 'screen'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex-1 py-3 rounded-2xl text-xs font-bold transition-all ${mode === m ? 'bg-blue-600 text-white' : 'bg-white/10 text-white hover:bg-white/15'}`}
                    >
                      {m === 'camera' ? 'Camera Preview' : 'Share Screen'}
                    </button>
                  ))}
                  {mode === 'camera' && (
                    <CameraFlipButton
                      facing={facing}
                      onClick={flipCameraFacing}
                      className="w-12 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition-colors"
                    />
                  )}
                </div>
                <button
                  onClick={handleGoLiveClick}
                  disabled={starting}
                  className="w-full py-4 rounded-2xl bg-red-600 text-white text-sm font-black hover:bg-red-700 shadow-xl shadow-red-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                  {starting ? 'Starting broadcast...' : 'Go Live · Start Stream'}
                </button>
                {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
              </div>
            )}
          </div>

          {(!liveActive || showChat) && (
            <div className="w-80 border-l border-white/5 flex flex-col bg-white/[0.02] rounded-3xl overflow-hidden border border-white/10">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-black text-white uppercase tracking-wider">Live Chat</span>
                <span className="text-[10px] text-white/30">{viewerCount} viewers</span>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-xs text-white/20 text-center pt-8">No messages yet</p>
                ) : (
                  comments.map((c, i) => (
                    <div key={c.id || i} className="text-xs leading-normal">
                      <span className="font-bold text-white/80 mr-1.5">@{c.username}:</span>
                      <span className="text-white/60">{c.text}</span>
                    </div>
                  ))
                )}
                <div ref={chatScrollRef} />
              </div>
              <div className="p-3 border-t border-white/5 flex gap-2">
                <input
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && postHostComment()}
                  placeholder="Type comment..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-blue-500"
                />
                <button
                  onClick={postHostComment}
                  className="px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative h-screen flex flex-col overflow-hidden bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />

          {paused && (
            <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
              <p className="text-white text-lg font-black">STREAM PAUSED</p>
            </div>
          )}
          {giftOverlays.map(g => (
            <ConfettiBlast gift={g.gift} onDone={() => { }} key={`confetti-${g.id}`} />
          ))}
          <FloatersGroup floaters={floaters} />
          {giftOverlays.map(g => (
            <GiftOverlay
              gift={g.gift}
              sender={g.sender}
              onDone={() => setGiftOverlays(p => p.filter(x => x.id !== g.id))}
              key={g.id}
            />
          ))}

          <div className="absolute top-0 inset-x-0 pt-12 px-4 flex items-center justify-between">
            {liveActive ? (
              <Fragment>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    LIVE
                  </span>
                  <span className="text-[10px] text-white/70 bg-black/40 px-2 py-1 rounded-full">{viewerCount} watching</span>
                  <span className="text-[10px] text-white/90 bg-red-950/40 border border-red-500/20 px-2 py-1 rounded-full font-mono">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <button
                  onClick={() => setShowChat(c => !c)}
                  className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center border border-white/10"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-white" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </button>
              </Fragment>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-white text-xs font-black">@{localStorage.currentUser || 'Guest'}</span>
                <button
                  onClick={() => window.history.back()}
                  className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center border border-white/10 text-white active:scale-95 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {liveActive && showChat && (
            <div className="absolute inset-x-4 bottom-48 max-h-40 overflow-hidden flex flex-col justify-end">
              <div className="space-y-1.5 overflow-hidden">
                {comments.slice(-8).map((c, i) => (
                  <div key={c.id || i} className="text-[11px] leading-normal bg-black/35 px-2.5 py-1 rounded-xl w-max max-w-full">
                    <span className="font-bold text-white/90 mr-1.5">@{c.username}:</span>
                    <span className="text-white/70">{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="absolute bottom-0 inset-x-0 p-4 pb-8">
            {liveActive ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && postHostComment()}
                    placeholder="Say something..."
                    className="flex-1 bg-black/40 border border-white/20 rounded-full px-4 py-2.5 text-xs text-white outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={postHostComment}
                    className="px-4 bg-blue-600 text-white text-xs font-bold rounded-full active:scale-95 transition-all"
                  >
                    Send
                  </button>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={togglePauseOverride}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${paused ? 'bg-blue-600' : 'bg-white/15'}`}
                  >
                    {paused ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M8 5v14l11-7z" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                    )}
                  </button>

                  <button
                    onClick={toggleMuteOverride}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${muted ? 'bg-blue-600' : 'bg-white/15'}`}
                  >
                    {muted ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                      </svg>
                    )}
                  </button>

                  {mode === 'camera' && (
                    <CameraFlipButton
                      facing={facing}
                      onClick={flipCameraFacing}
                      className="w-11 h-11 rounded-xl bg-white/15 text-white flex items-center justify-center"
                    />
                  )}

                  <div className="flex-1" />

                  <button
                    onClick={stopBroadcastChannel}
                    disabled={ending}
                    className="px-5 h-11 rounded-xl bg-red-600 text-white text-xs font-black shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                  >
                    {ending ? 'Ending...' : 'End Live'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Title of your live stream..."
                  className="w-full bg-black/40 border border-white/20 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                />
                <div className="flex gap-2">
                  {['camera', 'screen'].map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${mode === m ? 'bg-blue-600 text-white' : 'bg-white/15 text-white'}`}
                    >
                      {m === 'camera' ? 'Camera' : 'Screen'}
                    </button>
                  ))}
                  {mode === 'camera' && (
                    <CameraFlipButton
                      facing={facing}
                      onClick={flipCameraFacing}
                      className="w-12 py-3 rounded-xl bg-white/15 text-white flex items-center justify-center"
                    />
                  )}
                </div>
                <button
                  onClick={handleGoLiveClick}
                  disabled={starting}
                  className="w-full py-3.5 rounded-xl bg-red-600 text-white text-xs font-black hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  {starting ? 'Starting...' : 'Go Live'}
                </button>
                {errorMsg && <p className="text-red-400 text-xs text-center">{errorMsg}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {showStartModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 24
          }}
        >
          <div
            style={{
              background: '#121214',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 24,
              padding: 28,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 22, height: 22 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round" />
                  <line x1="12" y1="8" x2="12" y2="8" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>Stream Guidance</h2>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Please read before going live</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, margin: '8px 0' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ color: '#ef4444', marginTop: 2, flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Max Duration: 6 Hours</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Your broadcast will automatically end after 6 hours of active streaming.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ color: '#ef4444', marginTop: 2, flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>No Saved Video Recording</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>The live stream is purely ephemeral. The video will NOT be saved to your profile or feed after recording.</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ color: '#ef4444', marginTop: 2, flexShrink: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>Permissions required</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Starting the stream requests camera and microphone access dynamically.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => setShowStartModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStart}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                }}
              >
                Start Live
              </button>
            </div>
          </div>
        </div>
      )}

      {savingProgress && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
          <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, padding: 32, maxWidth: 320, width: '100%', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 16px' }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="6" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" strokeDasharray="251.2" strokeDashoffset={(1 - progressVal / 100) * 251.2} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff' }}>
                {progressVal}%
              </div>
            </div>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Saving live recording...</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>Do not close this page</p>
          </div>
        </div>
      )}
    </div>
  );
}