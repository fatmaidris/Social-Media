import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getUserProfile, toggleFollow } from '../api/social.js';
import { getUserErrorMessage } from '../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatProfileFieldLabel, getDisplayName, getFollowingState, getProfileRecord, getSafeProfileFields, getUserId, isOwnedBy } from '../utils/apiData.js';

export default function UserProfilePage() {
  const { userId } = useParams();
  const { token, profile: currentProfile, refreshProfile } = useAuth();
  const [user, setUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getUserProfile(token, userId);
      const userRecord = getProfileRecord(response);
      if (!userRecord) {
        setError('This profile could not be found. Return to the feed and try another profile.');
        setUser(null);
        setIsFollowing(null);
        return;
      }
      setUser(userRecord);
      setIsFollowing(getFollowingState(userRecord));
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, 'user-profile'));
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => { loadUser(); }, [loadUser]);

  async function handleFollowToggle() {
    if (!user || isFollowing === null || pending) return;
    setPending(true);
    setError('');
    setNotice('');
    try {
      await toggleFollow(token, userId);
      const nextState = !isFollowing;
      setIsFollowing(nextState);
      setNotice(nextState ? `You are now following ${getDisplayName(user)}.` : `You unfollowed ${getDisplayName(user)}.`);
      const [targetRefresh, ownRefresh] = await Promise.allSettled([
        getUserProfile(token, userId),
        refreshProfile(token),
      ]);
      if (targetRefresh.status === 'fulfilled') {
        const updatedUser = getProfileRecord(targetRefresh.value);
        if (updatedUser) {
          setUser(updatedUser);
          const serverState = getFollowingState(updatedUser);
          if (serverState !== null) setIsFollowing(serverState);
        }
      } else {
        setError(getUserErrorMessage(targetRefresh.reason, 'user-profile'));
      }
      if (ownRefresh.status === 'rejected') {
        setError(getUserErrorMessage(ownRefresh.reason, 'profile'));
      }
    } catch (requestError) {
      setError(getUserErrorMessage(requestError, 'follow'));
    } finally {
      setPending(false);
    }
  }

  const targetUserId = getUserId(user);
  const currentUserId = getUserId(currentProfile);
  const isSelf = Boolean(user && ((targetUserId && currentUserId && targetUserId === currentUserId) || isOwnedBy({ author: user }, currentProfile)));
  const fields = getSafeProfileFields(user).filter(([key]) => !/(image|photo|avatar|^name$|password|token)/i.test(key));

  if (loading) return <div className="page-content"><LoadingState label="Loading profile" /></div>;
  if (error && !user) return <div className="page-content"><ErrorState message={error} onRetry={loadUser} /><Link className="back-link" to="/">← Back to feed</Link></div>;

  return (
    <div className="page-content profile-page">
      <Link className="back-link" to="/">← Back to feed</Link>
      <header className="page-heading"><div><p className="eyebrow">ROUTE COMMUNITY</p><h1>Member profile</h1></div>
        {!isSelf && isFollowing !== null && <button className={isFollowing ? 'button-secondary' : 'button-primary compact'} type="button" onClick={handleFollowToggle} disabled={pending}>{pending ? 'Updating…' : isFollowing ? 'Unfollow' : 'Follow'}</button>}
      </header>
      <section className="profile-banner">
        <UserAvatar person={user} className="profile-avatar" imageAlt="Profile" />
        <div>{getDisplayName(user) && <><p className="eyebrow">ROUTE COMMUNITY MEMBER</p><h2>{getDisplayName(user)}</h2></>}</div>
      </section>
      {!isSelf && isFollowing === null && <p className="muted-copy follow-state-note">Follow status is not available for this profile.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="success-notice" role="status">{notice}</p>}
      <section className="profile-data" aria-label="Profile information">
        {fields.length ? fields.map(([key, value]) => <div className="profile-field" key={key}><span>{formatProfileFieldLabel(key)}</span><strong>{String(value)}</strong></div>) : <EmptyState title="No profile details" message="This member has not shared additional profile details." />}
      </section>
    </div>
  );
}