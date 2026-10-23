import { useCallback, useEffect, useRef, useState } from 'react';
import { getAllPosts } from '../api/posts.js';
import { getUserErrorMessage } from '../api/client.js';
import PostCard from '../components/PostCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatProfileFieldLabel, getDisplayName, getProfileDisplayFields, getRecords, isOwnedBy } from '../utils/apiData.js';

export default function ProfilePage() {
  const { token, profile, refreshProfile, bookmarkIds, bookmarkCount, bookmarksLoading, bookmarksError, toggleBookmark, uploadProfilePhoto } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [photoPending, setPhotoPending] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoNotice, setPhotoNotice] = useState('');
  const [bookmarkBusyId, setBookmarkBusyId] = useState('');
  const [bookmarkActionError, setBookmarkActionError] = useState('');
  const photoInput = useRef(null);

  const loadProfilePosts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [postsResponse, currentProfile] = await Promise.all([getAllPosts(token), refreshProfile(token)]);
      setPosts(getRecords(postsResponse, 'post').filter((post) => isOwnedBy(post, currentProfile)));
    } catch (loadError) {
      setError(getUserErrorMessage(loadError, 'profile'));
    } finally {
      setLoading(false);
    }
  }, [token, refreshProfile]);

  useEffect(() => { loadProfilePosts(); }, [loadProfilePosts]);

  useEffect(() => {
    if (!photo) {
      setPreviewUrl('');
      return undefined;
    }
    const nextUrl = URL.createObjectURL(photo);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [photo]);

  async function refreshPage() {
    setRefreshing(true);
    await loadProfilePosts();
    setRefreshing(false);
  }

  async function savePhoto() {
    if (!photo || !photo.type.startsWith('image/')) {
      setPhotoError('Choose an image file first.');
      return;
    }
    setPhotoPending(true);
    setPhotoError('');
    setPhotoNotice('');
    try {
      await uploadProfilePhoto(photo);
      setPhoto(null);
      if (photoInput.current) photoInput.current.value = '';
      setPhotoNotice('Profile photo updated successfully.');
    } catch (uploadError) {
      setPhotoError(getUserErrorMessage(uploadError, 'photo-upload'));
    } finally {
      setPhotoPending(false);
    }
  }

  async function handleBookmark(post) {
    const postId = String(post?._id ?? post?.id ?? post?.postId ?? '');
    if (!postId || bookmarkBusyId || bookmarksLoading || bookmarksError) return;
    setBookmarkBusyId(postId);
    setBookmarkActionError('');
    try {
      await toggleBookmark(postId);
    } catch (bookmarkError) {
      setBookmarkActionError(getUserErrorMessage(bookmarkError, 'bookmark'));
    } finally {
      setBookmarkBusyId('');
    }
  }

  const displayName = getDisplayName(profile);
  const fields = getProfileDisplayFields(profile);
  const previewProfile = previewUrl ? { ...profile, image: previewUrl } : profile;

  return (
    <div className="page-content profile-page">
      <header className="page-heading"><div><p className="eyebrow">YOUR SPACE</p><h1>Profile</h1></div><button className="button-secondary" type="button" onClick={refreshPage} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button></header>
      <section className="profile-banner">
        <UserAvatar person={previewProfile} className="profile-avatar" imageAlt="Profile" />
        <div>{displayName && <><p className="eyebrow">YOUR ACCOUNT</p><h2>{displayName}</h2></>}</div>
      </section>
      <section className="profile-photo-tools" aria-label="Profile photo">
        <label className="file-button">Choose profile photo<input ref={photoInput} type="file" accept="image/*" onChange={(event) => { setPhoto(event.target.files?.[0] || null); setPhotoError(''); setPhotoNotice(''); }} /></label>
        {photo && <><span className="selected-file">Preview: {photo.name}</span><button className="button-primary compact" type="button" onClick={savePhoto} disabled={photoPending}>{photoPending ? 'Uploading…' : 'Save photo'}</button></>}
        {photoError && <p className="form-error" role="alert">{photoError}</p>}
        {photoNotice && <p className="success-notice" role="status">{photoNotice}</p>}
      </section>
      <section className="profile-data" aria-label="Profile information">
        {fields.map(([key, value]) => <div className="profile-field" key={key}><span>{formatProfileFieldLabel(key)}</span><strong>{String(value)}</strong></div>)}
        <div className="profile-field"><span>Bookmarks</span><strong>{bookmarksLoading ? 'Loading…' : bookmarksError ? 'Unavailable' : String(bookmarkCount)}</strong></div>
        {bookmarksError && <p className="form-error" role="alert">{bookmarksError}</p>}
      </section>
      <section className="profile-posts"><div className="section-heading"><div><p className="eyebrow">YOUR WRITING</p><h2>Your posts</h2></div><span className="feed-count">{posts.length}</span></div>
        {bookmarkActionError && <p className="form-error" role="alert">{bookmarkActionError}</p>}
        {loading ? <LoadingState label="Loading your posts" /> : error ? <ErrorState message={error} onRetry={loadProfilePosts} /> : posts.length ? posts.map((post, index) => <PostCard key={post._id ?? post.id ?? `profile-${index}`} post={post} profile={profile} bookmarked={bookmarkIds.includes(String(post._id ?? post.id ?? post.postId ?? ''))} bookmarkBusy={bookmarkBusyId === String(post._id ?? post.id ?? post.postId ?? '')} onToggleBookmark={!bookmarksLoading && !bookmarksError ? handleBookmark : undefined} />) : <EmptyState title="No posts yet" message="Your posts will appear here when you share them." />}
      </section>
    </div>
  );
}