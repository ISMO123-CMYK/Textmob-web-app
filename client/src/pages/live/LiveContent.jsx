import { useState, useEffect, useRef } from 'react';
import { apiFetch, API_BASE_URL } from '../../config/api';
import GiftIcon, { giftsList, injectLiveStyles } from '../../components/ui/GiftIcon';

// Banner elements for animations (matches compiled code animations)
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

function LiveCommentMessage({ msg }) {
  return (
    <div className="tm-msg-in flex items-start gap-1.5 py-0.5">
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'rgba(255,255,255,.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 800,
          color: '#fff',
          flexShrink: 0
        }}
      >
        {(msg.username || '?')[0].toUpperCase()}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        {msg.gift ? (
          <span
            style={{
              fontSize: 12,
              color: '#fde68a',
              fontWeight: 700
            }}
          >
            {msg.username} sent a {msg.gift.name}
            {msg.gift.tier >= 4 ? ' — MASSIVE!' : msg.gift.tier >= 3 ? ' — amazing!' : '!'}
          </span>
        ) : (
          <>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'rgba(255,255,255,.9)',
                marginRight: 4
              }}
            >
              {msg.username}
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,.65)',
                wordBreak: 'break-word'
              }}
            >
              {msg.text}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function VideoSeeker({ videoRef, currentTime, duration }) {
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  const activeTime = isDragging ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (activeTime / duration) * 100 : 0;

  const getNewTime = (clientX) => {
    if (!containerRef.current || !duration) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    return percentage * duration;
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const newTime = getNewTime(clientX);
    setDragTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }

    const handlePointerMove = (moveEvent) => {
      const moveX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const nextTime = getNewTime(moveX);
      setDragTime(nextTime);
      if (videoRef.current) {
        videoRef.current.currentTime = nextTime;
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseup', handlePointerUp);
      document.removeEventListener('touchmove', handlePointerMove);
      document.removeEventListener('touchend', handlePointerUp);
    };

    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove);
    document.addEventListener('touchend', handlePointerUp);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      style={{
        width: '100%',
        height: 16,
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative'
      }}
    >
      {/* Track Background */}
      <div
        style={{
          width: '100%',
          height: isHovered || isDragging ? 6 : 4,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: 3,
          position: 'relative',
          transition: 'height 0.1s ease'
        }}
      >
        {/* Progress Fill */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progressPercent}%`,
            background: '#ff0000',
            borderRadius: 3
          }}
        />
        {/* Handle Knob */}
        {(isHovered || isDragging) && (
          <div
            style={{
              position: 'absolute',
              left: `${progressPercent}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#ff0000',
              boxShadow: '0 0 4px rgba(0,0,0,0.5)'
            }}
          />
        )}
      </div>
    </div>
  );
}

// Helper to apply WebRTC remote description with signalingState guards
async function applyRemoteDesc(pc, sdp) {
  if (pc) {
    if (['have-local-offer', 'have-local-pranswer'].includes(pc.signalingState)) {
      await pc.setRemoteDescription(sdp);
      return;
    }
    await new Promise((resolve, reject) => {
      let done = false;
      const onStateChange = async () => {
        try {
          if (['have-local-offer', 'have-local-pranswer'].includes(pc.signalingState)) {
            pc.removeEventListener('signalingstatechange', onStateChange);
            done = true;
            await pc.setRemoteDescription(sdp);
            resolve();
          }
        } catch (err) {
          pc.removeEventListener('signalingstatechange', onStateChange);
          done = true;
          reject(err);
        }
      };
      pc.addEventListener('signalingstatechange', onStateChange);
      setTimeout(() => {
        if (!done) {
          pc.removeEventListener('signalingstatechange', onStateChange);
          reject(new Error('timeout'));
        }
      }, 4500);
    }).catch(async () => {
      try {
        await pc.setRemoteDescription(sdp);
      } catch (err) {
        console.error('applyRemoteDesc fail', err);
      }
    });
  }
}

export default function LiveContent() {
  const postId = window.location.pathname.split('/live/')[1] || '';

  const [joined, setJoined] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [inputText, setInputText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [showGiftDrawer, setShowGiftDrawer] = useState(false);
  const [confettis, setConfettis] = useState([]);
  const [giftOverlays, setGiftOverlays] = useState([]);
  const [floaters, setFloaters] = useState([]);
  const [giftErrorMessage, setGiftErrorMessage] = useState('');
  const [giftSending, setGiftSending] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [audioMuted, setAudioMuted] = useState(true);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isLandscapeStream, setIsLandscapeStream] = useState(false);

  const handleTimeUpdate = (e) => {
    const vid = e.target;
    setVideoTime(vid.currentTime);

    // Dynamically track the camera feed orientation
    if (vid.videoWidth && vid.videoHeight) {
      setIsLandscapeStream(vid.videoWidth > vid.videoHeight);
    }

    if (vid.buffered && vid.buffered.length > 0) {
      const bEnd = vid.buffered.end(vid.buffered.length - 1);
      if (!vid.duration || !isFinite(vid.duration)) {
        setVideoDuration(bEnd);
      }

      // Multi-tier latency catch-up for audio/video sync:
      // - >2.5s behind: hard seek to live edge (fixes hearing audio before video)
      // - 1-2.5s behind: speed up playback gradually to close the gap
      // - caught up: ensure normal playback rate
      const lag = bEnd - vid.currentTime;
      if (!isPaused) {
        if (lag > 2.5) {
          vid.currentTime = Math.max(0, bEnd - 0.3);
          vid.playbackRate = 1.0;
        } else if (lag > 1.0) {
          vid.playbackRate = 1.06;
        } else if (vid.playbackRate !== 1.0) {
          vid.playbackRate = 1.0;
        }
      }
    }
  };

  const handleDurationChange = (e) => {
    const vid = e.target;
    if (vid.duration && isFinite(vid.duration)) {
      setVideoDuration(vid.duration);
    }
  };

  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const chatScrollRef = useRef(null);
  const streamEndedReceivedRef = useRef(false);
  const recoveryAttemptsRef = useRef(0);

  // --- Stability: auto-recovery for stalls and stream errors ---
  const handleVideoStalled = () => {
    const vid = videoRef.current;
    if (!vid || isPaused || streamEndedReceivedRef.current) return;
    // Nudge playback to the buffer edge and retry play
    if (vid.buffered && vid.buffered.length > 0) {
      const bEnd = vid.buffered.end(vid.buffered.length - 1);
      if (bEnd - vid.currentTime > 0.5) {
        vid.currentTime = Math.max(0, bEnd - 0.3);
      }
    }
    vid.play().catch(() => { });
  };

  // ✅ CHANGED: recovery reconnect does NOT use ?live=1 so it reloads
  // from a safe point rather than skipping ahead again on reconnect
  const handleVideoError = () => {
    if (streamEndedReceivedRef.current) return;
    if (recoveryAttemptsRef.current >= 5) {
      setErrorMessage('Stream connection lost. Please rejoin.');
      return;
    }
    recoveryAttemptsRef.current++;
    setTimeout(() => {
      const vid = videoRef.current;
      if (!vid) return;
      vid.src = `${API_BASE_URL}/api/live-stream/${postId}?t=${Date.now()}`;
      vid.load();
      vid.play().catch(() => { });
    }, 1000 * recoveryAttemptsRef.current);
  };

  const handleVideoEnded = () => {
    if (streamEndedReceivedRef.current) {
      teardownPeerConnection();
      try {
        window.Lexum?.navigate(`/`);
      } catch { }
    }
  };

  const hasJoinedRef = useRef(false);
  const seenCommentsSet = useRef(new Set());

  // Handle styles injection
  useEffect(() => {
    injectLiveStyles();
  }, []);

  // Listen to screen size changes
  useEffect(() => {
    const checkViewport = () => setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Fullscreen changes
  useEffect(() => {
    const handleFs = () => setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement);
    document.addEventListener('fullscreenchange', handleFs);
    document.addEventListener('webkitfullscreenchange', handleFs);
    return () => {
      document.removeEventListener('fullscreenchange', handleFs);
      document.removeEventListener('webkitfullscreenchange', handleFs);
    };
  }, []);

  // Auto scroll chat
  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const addCommentLocally = (comment) => {
    const key = comment.id || `${comment.username}|${comment.text || ''}|${comment.giftId || ''}|${comment.created_at || ''}`;
    if (!seenCommentsSet.current.has(key)) {
      seenCommentsSet.current.add(key);
      setComments(prev => [...prev.slice(-199), comment]);
    }
  };

  const receiveGiftVisual = (gift, sender) => {
    const idx = Date.now() + Math.random();
    setGiftOverlays(prev => [...prev, { id: idx, gift, sender }]);
    setConfettis(prev => [...prev, { id: idx, gift }]);

    const multiplier = { 1: 4, 2: 8, 3: 16, 4: 32, 5: 60 }[gift.tier] || 4;
    const items = Array.from({ length: multiplier }, (_, r) => ({
      id: idx + r,
      giftId: gift.id,
      color: gift.color,
      size: 24 + gift.tier * 8,
      x: 10 + Math.random() * 80,
      dur: 2 + Math.random() * 1.5
    }));
    setFloaters(prev => [...prev, ...items]);
    setTimeout(() => {
      setFloaters(prev => prev.filter(f => !items.find(t => t.id === f.id)));
    }, 4000);
  };

  // Socket IO & WebRTC Listeners
  useEffect(() => {
    const socket = window.socket;
    if (!socket || !postId) return;

    function onViewerCount({ postId: pId, count }) {
      if (pId?.toString() === postId.toString()) {
        setViewerCount(Number(count || 0));
      }
    }

    function onLiveEnded({ postId: pId }) {
      if (pId?.toString() === postId.toString()) {
        streamEndedReceivedRef.current = true;

        const vid = videoRef.current;
        if (!vid || vid.paused || vid.ended || !vid.buffered || vid.buffered.length === 0) {
          teardownPeerConnection();
          try {
            window.Lexum?.navigate(`/`);
          } catch { }
          return;
        }

        setTimeout(() => {
          if (streamEndedReceivedRef.current) {
            teardownPeerConnection();
            try {
              window.Lexum?.navigate(`/`);
            } catch { }
          }
        }, 8000);
      }
    }

    function onLiveComment(data) {
      if (data?.postId?.toString() === postId.toString() && data.comment) {
        addCommentLocally(data.comment);
      }
    }

    function onMobcoinsGift(data) {
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
          id: `gift-${Date.now()}${Math.random()}`
        });
      }
    }

    function onLivePaused(data) {
      if (data?.postId?.toString() === postId.toString()) {
        setIsPaused(true);
        videoRef.current?.pause();
      }
    }

    function onLiveResumed(data) {
      if (data?.postId?.toString() === postId.toString()) {
        setIsPaused(false);
        videoRef.current?.play().catch(() => { });
      }
    }

    socket.on('viewerCountUpdate', onViewerCount);
    socket.on('liveEnded', onLiveEnded);
    socket.on('liveComment', onLiveComment);
    socket.on('mobcoins-gift', onMobcoinsGift);
    socket.on('livePaused', onLivePaused);
    socket.on('liveResumed', onLiveResumed);

    return () => {
      socket.off('viewerCountUpdate', onViewerCount);
      socket.off('liveEnded', onLiveEnded);
      socket.off('liveComment', onLiveComment);
      socket.off('mobcoins-gift', onMobcoinsGift);
      socket.off('livePaused', onLivePaused);
      socket.off('liveResumed', onLiveResumed);
    };
  }, [postId, audioMuted]);

  // Initial stream details load
  useEffect(() => {
    if (!postId) return;
    const socket = window.socket;
    if (socket) {
      socket.emit('getLiveUrl', postId, (res) => {
        if (res?.count != null) {
          setViewerCount(Number(res.count));
        }
      });
    }

    apiFetch(`/get-post?id=${encodeURIComponent(postId)}`)
      .then(res => res.ok ? res.json() : null)
      .then(d => {
        const strName = d?.post?.username || d?.username || '';
        if (strName) {
          localStorage.setItem('liveSt', strName);
        }
      })
      .catch(() => { });
  }, [postId]);

  // Auto trigger join on mount
  useEffect(() => {
    if (isMobile && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      setTimeout(joinStreamChannel, 250);
    }
  }, [isMobile]);

  // Leave stream and stop video when unmounting or changing streams
  useEffect(() => {
    return () => {
      leaveStreamChannel();
    };
  }, [postId]);

  const teardownPeerConnection = () => {
    setJoined(false);
    try {
      peerRef.current?.close();
      peerRef.current = null;
    } catch { }
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch { }
      videoRef.current.src = "";
      videoRef.current.srcObject = null;
      try { videoRef.current.load(); } catch { }
    }
  };

  // ✅ CHANGED: added ?live=1 so the server only sends the last ~30s
  // of buffered chunks instead of the full stream history,
  // saving mobile data and drastically reducing load time for late joiners
  const joinStreamChannel = () => {
    setErrorMessage('');
    const socket = window.socket;
    if (!socket) return;
    socket.emit('joinLive', { postId }, (res) => {
      if (res?.ok) {
        if (res.count != null) {
          setViewerCount(Number(res.count));
        }

        const baseUrl = API_BASE_URL;
        if (videoRef.current) {
          const vid = videoRef.current;

          // ✅ CHANGED: ?live=1 tells the server to skip stream history
          // and only send the last ~30s of chunks — new joiners start
          // at the live edge immediately instead of downloading everything
          vid.src = `${baseUrl}/api/live-stream/${postId}?live=1`;
          vid.muted = audioMuted;

          // Seek to the live edge once enough data has loaded
          let seekAttempts = 0;
          const seekToLive = () => {
            let targetTime = 0;
            if (vid.duration && isFinite(vid.duration) && vid.duration > 1) {
              targetTime = Math.max(0, vid.duration - 0.5);
            } else if (vid.buffered && vid.buffered.length > 0) {
              const lastIndex = vid.buffered.length - 1;
              targetTime = Math.max(0, vid.buffered.end(lastIndex) - 0.5);
            }

            if (targetTime > 0 && Math.abs(vid.currentTime - targetTime) > 2) {
              vid.currentTime = targetTime;
            }
            seekAttempts++;
            if (seekAttempts > 30 || (targetTime > 0 && vid.currentTime > targetTime - 3)) {
              clearInterval(seekInterval);
            }
          };
          const seekInterval = setInterval(seekToLive, 500);

          vid.addEventListener('loadeddata', () => {
            if (vid.duration && isFinite(vid.duration) && vid.duration > 1) {
              vid.currentTime = Math.max(0, vid.duration - 0.5);
            } else if (vid.buffered && vid.buffered.length > 0) {
              vid.currentTime = Math.max(0, vid.buffered.end(vid.buffered.length - 1) - 0.5);
            }
          }, { once: true });

          vid.play().catch(err => {
            console.warn("Playback initialization failed:", err);
          });
        }
        recoveryAttemptsRef.current = 0;
        setJoined(true);
      } else {
        setErrorMessage(res?.error || 'Failed to join.');
      }
    });
  };

  const leaveStreamChannel = () => {
    const socket = window.socket;
    if (socket) {
      socket.emit('leaveLive', { postId }, () => { });
    }
    teardownPeerConnection();
  };

  const toggleMute = () => {
    const nextVal = !audioMuted;
    setAudioMuted(nextVal);
    if (videoRef.current) {
      videoRef.current.muted = nextVal;
      if (!nextVal) {
        videoRef.current.play().catch(() => { });
      }
    }
  };

  const togglePauseOverride = () => {
    const nextVal = !isPaused;
    setIsPaused(nextVal);
    if (videoRef.current) {
      if (nextVal) videoRef.current.pause();
      else videoRef.current.play().catch(() => { });
    }
  };

  const toggleFullscreen = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      try {
        await (v.requestFullscreen?.() || v.webkitEnterFullscreen?.());
      } catch { }
    } else {
      try {
        await (document.exitFullscreen?.() || document.webkitCancelFullScreen?.());
      } catch { }
    }
  };

  const handlePostComment = () => {
    const text = inputText.trim();
    if (!text) return;
    const comment = {
      username: localStorage.currentUser || 'Guest',
      text,
      created_at: new Date().toISOString(),
      id: Date.now() + Math.random()
    };
    setInputText('');
    addCommentLocally(comment);
    const socket = window.socket;
    if (socket) {
      socket.emit('liveComment', { postId, comment });
    }
  };

  const handleSendGift = async (gift) => {
    if (giftSending) return;
    setGiftSending(true);
    setGiftErrorMessage('');

    const fromId = localStorage.currentUser;
    const toId = localStorage.getItem('liveSt') || '';

    if (!fromId || !toId) {
      setGiftErrorMessage('Cannot identify streamer.');
      setGiftSending(false);
      return;
    }

    try {
      const res = await apiFetch(`/t/send-mobcoins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromId,
          toIds: [toId],
          amount: gift.cost
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setGiftErrorMessage(data?.error || 'Not enough Mobcoins.');
        setGiftSending(false);
        return;
      }

      const socket = window.socket;
      if (socket) {
        socket.emit('mobcoins-gift', {
          fromId,
          toIds: [toId],
          amount: gift.cost,
          giftId: gift.id,
          postId
        });
      }

      receiveGiftVisual(gift, fromId);
      addCommentLocally({
        username: fromId,
        text: '',
        giftId: gift.id,
        gift,
        created_at: new Date().toISOString(),
        id: `gift-my-${Date.now()}`
      });
      setGiftErrorMessage('');
      setShowGiftDrawer(false);
    } catch {
      setGiftErrorMessage('Network error.');
    } finally {
      setGiftSending(false);
    }
  };

  const renderIconBtnStyle = (active) => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: active ? '#2563eb' : 'rgba(255,255,255,.15)',
    color: '#fff',
    flexShrink: 0
  });

  const liveLink = postId ? window.location.origin + '/live/' + postId : '';

  const copyText = async function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    window.prompt('Copy this link', text);
    return Promise.resolve();
  };

  const copyLiveLink = async function () {
    if (!liveLink) return;
    try {
      await copyText(liveLink);
      window.alert('Live link copied.');
    } catch (err) {
      window.prompt('Copy this link', liveLink);
    }
  };

  const shareLiveLink = async function () {
    if (!liveLink) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Textmob Live',
          text: 'Watch this live stream',
          url: liveLink
        });
        return;
      }
      await copyLiveLink();
    } catch (err) {
      try {
        await copyLiveLink();
      } catch (e) { }
    }
  };

  const LiveLinkButtons = function () {
    if (!liveLink) return null;
    return (
      <>
        <button
          onClick={shareLiveLink}
          title="Share live link"
          aria-label="Share live link"
          style={renderIconBtnStyle(false)}
        >
          <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'none', stroke: '#fff', strokeWidth: 2 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l6-6m0 0H9m6 0v6" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13.5V19a1 1 0 001 1h12a1 1 0 001-1v-5.5" />
          </svg>
        </button>
        <button
          onClick={copyLiveLink}
          title="Copy live link"
          aria-label="Copy live link"
          style={renderIconBtnStyle(false)}
        >
          <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'none', stroke: '#fff', strokeWidth: 2 }}>
            <rect x="9" y="9" width="10" height="10" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 15H6a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v1" />
          </svg>
        </button>
      </>
    );
  };

  return (
    <div
      style={{
        background: '#000',
        height: '100dvh',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row'
      }}
    >
      {isMobile ? (
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={audioMuted}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onEnded={handleVideoEnded}
            onError={handleVideoError}
            onStalled={handleVideoStalled}
            onWaiting={handleVideoStalled}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: isLandscapeStream ? 'contain' : 'cover',
              background: '#000'
            }}
          />
          {/* Top Gradients */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 130,
              background: 'linear-gradient(to bottom, rgba(0,0,0,.65), transparent)',
              pointerEvents: 'none'
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '55%',
              background: 'linear-gradient(to top, rgba(0,0,0,.85), transparent)',
              pointerEvents: 'none'
            }}
          />

          {isPaused && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}
            >
              <p style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>Paused</p>
            </div>
          )}

          <FloatersGroup floaters={floaters} />
          {confettis.map(c => (
            <ConfettiBlast
              gift={c.gift}
              onDone={() => setConfettis(prev => prev.filter(t => t.id !== c.id))}
              key={c.id}
            />
          ))}
          {giftOverlays.map(g => (
            <GiftOverlay
              gift={g.gift}
              sender={g.sender}
              onDone={() => setGiftOverlays(prev => prev.filter(t => t.id !== g.id))}
              key={g.id}
            />
          ))}

          {/* Top info row */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '48px 16px 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: 999
                }}
              >
                <span
                  className="tm-live-dot"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#fff'
                  }}
                />
                LIVE
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,.7)',
                  background: 'rgba(0,0,0,.4)',
                  padding: '3px 8px',
                  borderRadius: 999
                }}
              >
                {viewerCount}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowChat(prev => !prev)}
                style={renderIconBtnStyle(showChat)}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{ width: 16, height: 16, fill: 'none', stroke: '#fff', strokeWidth: 2 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97 4.48 4.48 0 006.388 18.945c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                  />
                </svg>
              </button>

              <LiveLinkButtons />

              {joined ? (
                <button
                  onClick={leaveStreamChannel}
                  style={{ ...renderIconBtnStyle(false), background: 'rgba(220,38,38,.7)' }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    style={{ width: 16, height: 16, fill: 'none', stroke: '#fff', strokeWidth: 2.5 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={joinStreamChannel}
                  style={{ ...renderIconBtnStyle(false), background: '#2563eb', padding: '0 12px', width: 'auto' }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Join</span>
                </button>
              )}
            </div>
          </div>

          {/* Scrolled overlay comments */}
          {showChat && (
            <div
              style={{
                position: 'absolute',
                left: 12,
                right: 56,
                maxHeight: 160,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                bottom: showGiftDrawer ? 340 : 170
              }}
            >
              {comments.slice(-10).map((c, idx) => (
                <LiveCommentMessage msg={c} key={c.id || idx} />
              ))}
            </div>
          )}

          {/* Send gift popover pane */}
          {showGiftDrawer && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 160,
                padding: '0 12px',
                zIndex: 20
              }}
            >
              <div
                className="tm-glass"
                style={{ borderRadius: 20, padding: 12, border: '1px solid rgba(255,255,255,.1)' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px'
                    }}
                  >
                    Send a Gift
                  </p>
                  <button
                    onClick={() => { setShowGiftDrawer(false); setGiftErrorMessage(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.5)' }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      style={{ width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2.5 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {giftsList.map(g => (
                    <button
                      key={g.id}
                      onClick={() => handleSendGift(g)}
                      disabled={giftSending}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '8px 4px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,.08)',
                        border: 'none',
                        cursor: 'pointer',
                        opacity: giftSending ? 0.5 : 1,
                        transition: 'background .15s'
                      }}
                    >
                      <div style={{ color: g.color }}>
                        <GiftIcon id={g.id} size={26} />
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.7)', textAlign: 'center', lineHeight: 1.2 }}>
                        {g.name}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#fde68a' }}>{g.cost}</span>
                    </button>
                  ))}
                </div>
                {giftErrorMessage && (
                  <p style={{ fontSize: 11, color: '#f87171', textAlign: 'center', marginTop: 8 }}>
                    {giftErrorMessage}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Lower interactive UI panel */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 12px 32px' }}>
            {joined && videoDuration > 0 && (
              <div
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  padding: '6px 10px',
                  borderRadius: 8,
                  marginBottom: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
              >
                <VideoSeeker videoRef={videoRef} currentTime={videoTime} duration={videoDuration} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#fff' }}>
                  <span>{formatTime(videoTime)} / {formatTime(videoDuration)}</span>
                  <span style={{ fontSize: 9, color: '#ff4444', fontWeight: 800 }}>LIVE</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,.1)',
                  border: '1px solid rgba(255,255,255,.18)',
                  borderRadius: 24,
                  padding: '0 16px',
                  gap: 8
                }}
              >
                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                  placeholder="Say something…"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 13,
                    color: '#fff',
                    padding: '10px 0'
                  }}
                />
                {inputText.trim() && (
                  <button
                    onClick={handlePostComment}
                    style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                  >
                    Post
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowGiftDrawer(prev => !prev)}
                style={{ ...renderIconBtnStyle(showGiftDrawer), width: 44, height: 44, borderRadius: 14 }}
              >
                <GiftIcon id="crown" size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={toggleMute} title={audioMuted ? 'Unmute' : 'Mute'} style={renderIconBtnStyle(audioMuted)}>
                {audioMuted ? (
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 2 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 2 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                )}
              </button>
              <button onClick={togglePauseOverride} title={isPaused ? 'Resume' : 'Pause'} style={renderIconBtnStyle(isPaused)}>
                {isPaused ? (
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: '#fff' }}>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: '#fff' }}>
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                )}
              </button>
              <button onClick={toggleFullscreen} title="Fullscreen" style={renderIconBtnStyle(isFullscreen)}>
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 2 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 2 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                )}
              </button>
              {errorMessage && (
                <p style={{ flex: 1, fontSize: 11, color: '#f87171', textAlign: 'center', alignSelf: 'center' }}>
                  {errorMessage}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Dual Column View */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 16, minWidth: 0 }}>
            {/* Header controls row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '5px 12px',
                  borderRadius: 999
                }}
              >
                <span className="tm-live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />
                LIVE · {viewerCount} watching
              </span>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={toggleMute} title={audioMuted ? 'Unmute' : 'Mute'} style={renderIconBtnStyle(audioMuted)}>
                  {audioMuted ? (
                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 2 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 2 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  )}
                </button>
                <button onClick={togglePauseOverride} title={isPaused ? 'Resume' : 'Pause'} style={renderIconBtnStyle(isPaused)}>
                  {isPaused ? (
                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: '#fff' }}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: '#fff' }}>
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                    }
                  }}
                  title="Rewind 10s"
                  style={renderIconBtnStyle(false)}
                >
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 2 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                  </svg>
                </button>
                <button onClick={toggleFullscreen} title="Fullscreen" style={renderIconBtnStyle(isFullscreen)}>
                  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 2 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                </button>
                {joined ? (
                  <button
                    onClick={leaveStreamChannel}
                    style={{ ...renderIconBtnStyle(false), background: 'rgba(220,38,38,.7)' }}
                  >
                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: 'none', stroke: '#fff', strokeWidth: 2.5 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={joinStreamChannel}
                    style={{ ...renderIconBtnStyle(false), background: '#2563eb', width: 'auto', padding: '0 16px' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Join Stream</span>
                  </button>
                )}
              </div>
            </div>

            {/* Main Video Box */}
            <div style={{ position: 'relative', flex: 1, background: '#000', borderRadius: 16, overflow: 'hidden' }}>
              <video
                controls
                ref={videoRef}
                autoPlay
                playsInline
                muted={audioMuted}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={handleDurationChange}
                onEnded={handleVideoEnded}
                onError={handleVideoError}
                onStalled={handleVideoStalled}
                onWaiting={handleVideoStalled}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />

              {!joined && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,.7)',
                    gap: 12
                  }}
                >
                  <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 14 }}>Tap join to watch the live stream</p>
                  <button
                    onClick={joinStreamChannel}
                    style={{ padding: '12px 28px', background: '#2563eb', color: '#fff', borderRadius: 14, fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer' }}
                  >
                    Join Stream
                  </button>
                </div>
              )}

              {isPaused && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}
                >
                  <p style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>Paused</p>
                </div>
              )}

              <FloatersGroup floaters={floaters} />
              {confettis.map(c => (
                <ConfettiBlast
                  gift={c.gift}
                  onDone={() => setConfettis(prev => prev.filter(t => t.id !== c.id))}
                  key={c.id}
                />
              ))}
              {giftOverlays.map(g => (
                <GiftOverlay
                  gift={g.gift}
                  sender={g.sender}
                  onDone={() => setGiftOverlays(prev => prev.filter(t => t.id !== g.id))}
                  key={g.id}
                />
              ))}
            </div>
            {errorMessage && <p style={{ fontSize: 12, color: '#f87171' }}>{errorMessage}</p>}
          </div>

          {/* Desktop Right Column: Chat & Gifts */}
          <div style={{ width: 320, borderLeft: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Live Chat</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)' }}>{viewerCount} watching</span>
            </div>

            <div className="flex-1 overflow-y-auto tm-noscroll px-3 py-2" style={{ flex: 1 }}>
              {comments.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', textAlign: 'center', paddingTop: 20 }}>
                  No messages yet
                </p>
              ) : (
                comments.map((c, idx) => <LiveCommentMessage msg={c} key={c.id || idx} />)
              )}
              <div ref={chatScrollRef} />
            </div>

            {/* Desktop Gifts tray */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '10px 12px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 8 }}>
                Send a Gift
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 8 }}>
                {giftsList.map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleSendGift(g)}
                    disabled={giftSending}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 3,
                      padding: '7px 4px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,.06)',
                      border: 'none',
                      cursor: 'pointer',
                      opacity: giftSending ? 0.5 : 1
                    }}
                  >
                    <div style={{ color: g.color }}>
                      <GiftIcon id={g.id} size={22} />
                    </div>
                    <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.6)', textAlign: 'center', lineHeight: 1.1 }}>
                      {g.name}
                    </span>
                    <span style={{ fontSize: 8, fontWeight: 900, color: '#fde68a' }}>{g.cost}</span>
                  </button>
                ))}
              </div>
              {giftErrorMessage && (
                <p style={{ fontSize: 11, color: '#f87171', marginBottom: 6 }}>{giftErrorMessage}</p>
              )}
            </div>

            <div style={{ padding: '8px 12px 16px', display: 'flex', gap: 8 }}>
              <input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                placeholder="Say something…"
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,.08)',
                  border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 12,
                  padding: '9px 12px',
                  fontSize: 13,
                  color: '#fff',
                  outline: 'none'
                }}
              />
              <button
                onClick={handlePostComment}
                style={{ padding: '9px 14px', background: '#2563eb', color: '#fff', borderRadius: 12, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}