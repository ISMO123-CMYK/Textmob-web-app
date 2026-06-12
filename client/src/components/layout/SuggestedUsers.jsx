import { useState, useEffect } from 'react';
import { apiFetch } from '../../config/api';
import FollowButton from '../ui/FollowButton';
import useProfileCache from '../../utils/useProfileCache';
import { VerifiedBadge } from '../ui/VerifiedBadge';

function SuggestedUserItem({ username, fullname, profile_pic, mutuals }) {
  const profile = useProfileCache(username);
  return (
    <div
      className="flex items-center gap-2 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer px-2 -mx-2"
      onClick={() => window.Lexum?.navigate(`/@${username}`)}
    >
      <img
        src={profile.profile_pic || profile_pic || 'https://res.cloudinary.com/dzvm9xe1i/image/upload/v1754309761/profile-pictures/gyyonhn4akhjp4awey0t.png'}
        alt={username}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{profile.fullname || fullname}</p>
          {profile.verified === true && <VerifiedBadge className="w-3 h-3" />}
        </div>
        <p className="text-xs text-gray-400 truncate">@{username}</p>
        {mutuals > 0 && (
          <p className="text-[11px] text-gray-400">
            {mutuals} mutual{mutuals > 1 ? 's' : ''}
          </p>
        )}
      </div>
      <div onClick={e => e.stopPropagation()}>
        <FollowButton
          targetUsername={username}
          currentUsername={localStorage.getItem('currentUser')}
        />
      </div>
    </div>
  );
}

export default function SuggestedUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser || currentUser === 'undefined') {
      setLoading(false);
      return;
    }

    apiFetch(`/get-suggestions-feed?username=${encodeURIComponent(currentUser)}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load suggestions');
        return res.json();
      })
      .then(data => {
        if (active) {
          setUsers(Array.isArray(data) ? data : []);
        }
      })
      .catch(err => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-4 space-y-3">
        <div className="h-2.5 bg-gray-100 rounded-full w-1/2 animate-pulse" />
        {[0, 1, 2].map(idx => (
          <div className="flex items-center gap-2" key={idx}>
            <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-100 rounded-full w-2/3 animate-pulse" />
              <div className="h-2.5 bg-gray-100 rounded-full w-1/2 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="px-4 py-3 text-xs text-red-500">{error}</div>;
  }

  if (users.length === 0) {
    return <div className="px-4 py-3 text-xs text-gray-400">No suggestions right now.</div>;
  }

  return (
    <div className="px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">People you may know</p>
      <div className="space-y-1">
        {users.map((user, idx) => (
          <SuggestedUserItem {...user} key={user.username || idx} />
        ))}
      </div>
    </div>
  );
}