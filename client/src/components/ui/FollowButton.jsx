import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import { cn } from '../../utils/classNames';

export default function FollowButton({ targetUsername, currentUsername, onUpdate }) {
  const [status, setStatus] = useState('loading');
  const [profileType, setProfileType] = useState('individual');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!targetUsername || !currentUsername) return;
    let active = true;
    setStatus('loading');
    
    apiFetch(`/follow-status?from=${encodeURIComponent(currentUsername)}&to=${encodeURIComponent(targetUsername)}`)
      .then(res => res.json())
      .then(data => {
        if (active) {
          setStatus(data.status || 'not_friended');
          setProfileType((data.profileType || 'individual').toLowerCase());
        }
      })
      .catch(() => {
        if (active) setStatus('not_friended');
      });

    return () => {
      active = false;
    };
  }, [targetUsername, currentUsername]);

  async function handleAction() {
    if (submitting || status === 'loading') return;
    setSubmitting(true);
    try {
      const isOrg = profileType !== 'individual';
      const endpoint = isOrg ? '/follow' : '/friend';
      
      let action;
      if (isOrg) {
        action = status === 'following' ? 'unfollow' : 'follow';
      } else {
        action = status === 'friended' ? 'unfriend' : 'friend';
      }

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: targetUsername,
          currentUsername: currentUsername,
          action: action
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }
      setStatus(data.status);
      onUpdate?.(data.status);
    } catch (err) {
      console.error('FollowButton action error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  const label = status === 'loading' ? '…' : 
                status === 'friended' ? 'Friends' : 
                status === 'following' ? 'Following' : 
                status === 'not_following' ? 'Follow' : 'Add Friend';

  return (
    <button
      onClick={handleAction}
      disabled={submitting || status === 'loading'}
      className={cn(
        'text-xs font-bold px-3 py-1.5 rounded-full transition-colors active:scale-95 select-none',
        submitting || status === 'loading'
          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-wait'
          : status === 'friended' || status === 'following'
            ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
            : 'bg-blue-600 text-white hover:bg-blue-700'
      )}
    >
      {submitting ? 'Wait...' : label}
    </button>
  );
}
