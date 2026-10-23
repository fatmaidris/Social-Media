import { useCallback, useEffect, useRef, useState } from 'react';
import { createPost, deletePost, getAllPosts, updatePost } from '../api/posts.js';
import PostCard from '../components/PostCard.jsx';
import PostForm from '../components/PostForm.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/PageStates.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getRecord, getRecordId, getRecords, getText } from '../utils/apiData.js';
import { getUserErrorMessage } from '../api/client.js';

export default function HomePage() {
  const { token, profile, bookmarkIds, bookmarksLoading, bookmarksError, toggleBookmark } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [busyPostId, setBusyPostId] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [notice, setNotice] = useState('');
  const [resetKey, setResetKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [bookmarkBusyId, setBookmarkBusyId] = useState('');
  const [bookmarkActionError, setBookmarkActionError] = useState('');
  const submitLock = useRef(false);
  const noticeTimer = useRef(null);

  function announce(message) {
    window.clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3500);
  }

  const loadPosts = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setLoadError('');
    try {
      const result = await getAllPosts(token);
      const updatedPosts = getRecords(result, 'post');
      setPosts(updatedPosts);
      return updatedPosts;
    } catch (error) {
      setLoadError(getUserErrorMessage(error, 'post-list'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPosts(true);
    return () => window.clearTimeout(noticeTimer.current);
  }, [loadPosts]);

  async function submitPost(body, image) {
    if (submitLock.current) return;
    submitLock.current = true;
    setPending(true);
    setFormError('');
    setNotice('');
    try {
      if (editingPost) {
        await updatePost(token, getRecordId(editingPost), body, image);
        setEditingPost(null);
        announce('Your post has been updated.');
      } else {
        const result = await createPost(token, body, image);
        const createdPost = getRecord(result, 'post');
        setResetKey((current) => current + 1);
        const updatedPosts = await loadPosts();
        if (createdPost && getRecordId(createdPost) && getText(createdPost, 'body')) {
          setPosts((current) => current.some((post) => getRecordId(post) === getRecordId(createdPost))
            ? current
            : [createdPost, ...(updatedPosts ?? current)]);
        }
        announce('Post shared successfully.');
      }
      if (editingPost) await loadPosts();
    } catch (error) {
      setFormError(getUserErrorMessage(error, editingPost ? 'post-update' : 'post-create'));
    } finally {
      submitLock.current = false;
      setPending(false);
    }
  }

  function requestPostDelete(post) {
    if (!getRecordId(post)) return;
    setDeleteError('');
    setDeleteTarget(post);
  }

  function cancelPostDelete() {
    if (busyPostId) return;
    setDeleteTarget(null);
    setDeleteError('');
  }

  async function confirmPostDelete() {
    const id = getRecordId(deleteTarget);
    if (!id || busyPostId) return;
    setBusyPostId(id);
    setDeleteError('');
    try {
      await deletePost(token, id);
      setPosts((current) => current.filter((post) => getRecordId(post) !== id));
      setDeleteTarget(null);
      announce('Your post has been deleted.');
      await loadPosts();
    } catch (error) {
      setDeleteError(getUserErrorMessage(error, 'post-delete'));
    } finally {
      setBusyPostId('');
    }
  }

  async function handleBookmark(post) {
    const id = getRecordId(post);
    if (!id || bookmarkBusyId) return;
    const wasBookmarked = bookmarkIds.includes(id);
    setBookmarkBusyId(id);
    setBookmarkActionError('');
    try {
      await toggleBookmark(id);
      announce(wasBookmarked ? 'Bookmark removed.' : 'Post bookmarked.');
    } catch (error) {
      setBookmarkActionError(getUserErrorMessage(error, 'bookmark'));
    } finally {
      setBookmarkBusyId('');
    }
  }

  return (
    <div className="page-content feed-page">
      <header className="page-heading"><div><p className="eyebrow">ROUTE COMMUNITY</p><h1>Your home feed</h1><p className="page-subtitle">Ideas, progress, and useful things from the community.</p></div><span className="feed-count">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</span></header>

      <PostForm
        key={editingPost ? 'editing' : `new-${resetKey}`}
        initialBody={editingPost?.body ?? ''}
        resetKey={resetKey}
        pending={pending}
        error={formError}
        submitLabel={editingPost ? 'Save changes' : 'Share post'}
        onCancel={editingPost ? () => { setEditingPost(null); setFormError(''); } : undefined}
        onSubmit={submitPost}
      />
      {notice && <p className="success-notice toast-notice" role="status">{notice}</p>}
      {bookmarkActionError && <p className="form-error" role="alert">{bookmarkActionError}</p>}
      {bookmarksError && <p className="form-error" role="alert">{bookmarksError}</p>}

      <section className="feed-list" aria-label="All posts">
        {loading && posts.length === 0 ? <LoadingState label="Loading posts" /> : null}
        {loadError && <ErrorState message={loadError} onRetry={() => loadPosts(posts.length === 0)} />}
        {!loading && !loadError && posts.length === 0 ? <EmptyState title="No posts yet" message="Start the conversation with the first post." /> : null}
        {posts.map((post, index) => <PostCard key={post._id ?? post.id ?? `post-${index}`} post={post} profile={profile} busy={busyPostId === (post._id ?? post.id)} bookmarked={bookmarkIds.includes(getRecordId(post))} bookmarkBusy={bookmarkBusyId === getRecordId(post)} onToggleBookmark={!bookmarksLoading && !bookmarksError ? handleBookmark : undefined} onEdit={setEditingPost} onDelete={requestPostDelete} />)}
      </section>
      <ConfirmationModal
        open={Boolean(deleteTarget)}
        title="Delete this post?"
        description="This post will be removed from your feed. This action cannot be undone."
        pending={Boolean(busyPostId)}
        error={deleteError}
        onCancel={cancelPostDelete}
        onConfirm={confirmPostDelete}
      />
    </div>
  );
}