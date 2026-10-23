import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createComment, deleteComment, getComments, updateComment } from '../api/comments.js';
import { deletePost, getPost } from '../api/posts.js';
import { ErrorState, EmptyState, LoadingState } from '../components/PageStates.jsx';
import ConfirmationModal from '../components/ConfirmationModal.jsx';
import PostCard from '../components/PostCard.jsx';
import UserAvatar from '../components/UserAvatar.jsx';
import { getUserErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getDisplayName, getImageUrl, getRecord, getRecordId, getRecords, getText, isOwnedBy } from '../utils/apiData.js';

async function getAllPostComments(token, postId) {
  const all = [];
  const seen = new Set();
  const limit = 10;
  for (let page = 1; ; page += 1) {
    const response = await getComments(token, postId, page, limit);
    const pageComments = getRecords(response, 'comment');
    let added = 0;
    for (const comment of pageComments) {
      const signature = getRecordId(comment) || JSON.stringify(comment);
      if (!seen.has(signature)) {
        seen.add(signature);
        all.push(comment);
        added += 1;
      }
    }
    if (pageComments.length < limit || added === 0) break;
  }
  return all;
}

export default function PostDetailsPage() {
  const { postId } = useParams();
  const { token, profile, bookmarkIds, bookmarksLoading, bookmarksError, toggleBookmark } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState(null);
  const [editing, setEditing] = useState(null);
  const [pending, setPending] = useState(false);
  const [busyCommentId, setBusyCommentId] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [bookmarkActionError, setBookmarkActionError] = useState('');
  const commentFormRef = useRef(null);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [postResponse, nextComments] = await Promise.all([
        getPost(token, postId),
        getAllPostComments(token, postId),
      ]);
      const nextPost = getRecord(postResponse, 'post');
      if (!nextPost) throw new Error('missing-post');
      setPost(nextPost);
      setComments(nextComments);
    } catch (error) {
      setLoadError(error.message === 'missing-post'
        ? 'This post could not be found. Return to the feed and choose another post.'
        : getUserErrorMessage(error, 'post-details'));
    } finally {
      setLoading(false);
    }
  }, [token, postId]);

  useEffect(() => { loadDetails(); }, [loadDetails]);

  async function refreshComments() {
    setComments(await getAllPostComments(token, postId));
  }

  async function submitComment(event) {
    event.preventDefault();
    setActionError('');
    setNotice('');
    if (!commentText.trim()) {
      setActionError('Write a comment before submitting.');
      return;
    }
    if (commentImage && !commentImage.type.startsWith('image/')) {
      setActionError('Choose an image file.');
      return;
    }
    setPending(true);
    try {
      await createComment(token, postId, commentText.trim(), commentImage);
      setCommentText('');
      setCommentImage(null);
      commentFormRef.current?.reset();
      setNotice('Comment added successfully.');
      try { await refreshComments(); } catch (error) { setActionError(getUserErrorMessage(error, 'comment-list')); }
    } catch (error) {
      setActionError(getUserErrorMessage(error, 'comment-create'));
    } finally {
      setPending(false);
    }
  }

  async function saveComment(commentId) {
    const entry = editing;
    if (!entry?.content.trim()) {
      setActionError('Comment text cannot be empty.');
      return;
    }
    if (entry.image && !entry.image.type.startsWith('image/')) {
      setActionError('Choose an image file.');
      return;
    }
    setPending(true);
    setActionError('');
    try {
      const result = await updateComment(token, postId, commentId, entry.content.trim(), entry.image);
      const serverComment = getRecord(result, 'comment');
      setComments((current) => current.map((comment) => {
        if (getRecordId(comment) !== commentId) return comment;
        const updated = { ...comment, ...(serverComment || {}), content: entry.content.trim() };
        if (entry.image && !serverComment) delete updated.image;
        return updated;
      }));
      setEditing(null);
      setNotice('Comment updated successfully.');
      try { await refreshComments(); } catch (error) { setActionError(getUserErrorMessage(error, 'comment-list')); }
    } catch (error) {
      setActionError(getUserErrorMessage(error, 'comment-update'));
    } finally {
      setPending(false);
    }
  }

  function requestCommentDelete(comment) {
    if (!getRecordId(comment)) return;
    setDeleteError('');
    setDeleteTarget({ type: 'comment', record: comment });
  }

  async function confirmCommentDelete(comment) {
    const id = getRecordId(comment);
    if (!id || busyCommentId) return;
    setBusyCommentId(id);
    setDeleteError('');
    try {
      await deleteComment(token, postId, id);
      setComments((current) => current.filter((item) => getRecordId(item) !== id));
      setDeleteTarget(null);
      setNotice('Comment deleted successfully.');
      try { await refreshComments(); } catch (error) { setActionError(getUserErrorMessage(error, 'comment-list')); }
    } catch (error) {
      setDeleteError(getUserErrorMessage(error, 'comment-delete'));
    } finally {
      setBusyCommentId('');
    }
  }

  function requestPostDelete() {
    if (!getRecordId(post)) return;
    setDeleteError('');
    setDeleteTarget({ type: 'post', record: post });
  }

  async function confirmPostDelete() {
    const id = getRecordId(deleteTarget?.record);
    if (!id || pending) return;
    setPending(true);
    setDeleteError('');
    try {
      await deletePost(token, id);
      setDeleteTarget(null);
      navigate('/', { replace: true });
    } catch (error) {
      setDeleteError(getUserErrorMessage(error, 'post-delete'));
    } finally {
      setPending(false);
    }
  }

  async function handleBookmark(postRecord) {
    const id = getRecordId(postRecord);
    if (!id || bookmarkBusy || bookmarksLoading || bookmarksError) return;
    const wasBookmarked = bookmarkIds.includes(id);
    setBookmarkBusy(true);
    setBookmarkActionError('');
    try {
      await toggleBookmark(id);
      setNotice(wasBookmarked ? 'Bookmark removed.' : 'Post bookmarked.');
    } catch (error) {
      setBookmarkActionError(getUserErrorMessage(error, 'bookmark'));
    } finally {
      setBookmarkBusy(false);
    }
  }

  if (loading) return <div className="page-content"><LoadingState label="Loading post and comments" /></div>;
  if (loadError) return <div className="page-content"><ErrorState message={loadError} onRetry={loadDetails} /><Link className="back-link" to="/">← Back to feed</Link></div>;

  return (
    <div className="page-content details-page">
      <Link className="back-link" to="/">← Back to feed</Link>
      <header className="page-heading"><div><p className="eyebrow">COMMUNITY POST</p><h1>Post and comments</h1></div></header>
      {post && <PostCard post={post} profile={profile} busy={pending} bookmarked={bookmarkIds.includes(getRecordId(post))} bookmarkBusy={bookmarkBusy} onToggleBookmark={!bookmarksLoading && !bookmarksError ? handleBookmark : undefined} onDelete={requestPostDelete} />}
      <section className="comments-section">
        <div className="section-heading"><div><p className="eyebrow">CONVERSATION</p><h2>Comments</h2></div><span className="feed-count">{comments.length}</span></div>
        {notice && <p className="success-notice" role="status">{notice}</p>}
        {(bookmarkActionError || bookmarksError) && <p className="form-error" role="alert">{bookmarkActionError || bookmarksError}</p>}
        {actionError && <p className="form-error" role="alert">{actionError}</p>}
        {comments.length === 0 ? <EmptyState title="No comments yet" message="Be the first to join this conversation." /> : comments.map((comment, index) => {
          const id = getRecordId(comment);
          const author = comment?.author ?? comment?.user ?? comment?.createdBy ?? comment?.commentedBy ?? comment;
          const image = getImageUrl(comment);
          const canManage = Boolean(id && isOwnedBy(comment, profile));
          const isEditing = editing?.id === id;
          return (
            <article className="comment-card" key={id || `comment-${index}`}>
              <UserAvatar person={author} className="comment-avatar" />
              <div className="comment-content">
                <div className="comment-meta"><strong>{getDisplayName(author)}</strong>{canManage && !isEditing && <span className="comment-actions"><button className="text-button" type="button" disabled={pending || Boolean(busyCommentId)} onClick={() => setEditing({ id, content: getText(comment, 'content'), image: null })}>Edit</button><button className="text-button danger" type="button" disabled={busyCommentId === id || pending} onClick={() => requestCommentDelete(comment)}>{busyCommentId === id ? 'Deleting…' : 'Delete'}</button></span>}</div>
                {isEditing ? <div className="inline-edit"><textarea value={editing.content} onChange={(event) => setEditing({ ...editing, content: event.target.value })} rows="3" /><label className="file-button">Replace image<input type="file" accept="image/*" onChange={(event) => setEditing({ ...editing, image: event.target.files?.[0] || null })} /></label><div><button className="button-primary compact" type="button" disabled={pending} onClick={() => saveComment(id)}>{pending ? 'Saving…' : 'Save'}</button><button className="button-secondary" type="button" disabled={pending} onClick={() => setEditing(null)}>Cancel</button></div></div> : <p>{getText(comment, 'content') || 'Comment content is unavailable.'}</p>}
                {!isEditing && image && <img className="comment-image" src={image} alt="Attached to this comment" loading="lazy" />}
              </div>
            </article>
          );
        })}
        <form ref={commentFormRef} className="comment-form" onSubmit={submitComment}>
          <label htmlFor="comment-content">Add a comment</label>
          <textarea id="comment-content" rows="3" value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength="2000" required placeholder="Write a thoughtful reply…" />
          <div className="composer-actions"><label className="file-button">Add image<input type="file" accept="image/*" onChange={(event) => setCommentImage(event.target.files?.[0] || null)} /></label>{commentImage && <span className="selected-file">{commentImage.name}</span>}<button className="button-primary compact" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Comment'}</button></div>
        </form>
      </section>
      <ConfirmationModal
        open={Boolean(deleteTarget)}
        title={deleteTarget?.type === 'comment' ? 'Delete this comment?' : 'Delete this post?'}
        description={deleteTarget?.type === 'comment'
          ? 'This comment will be removed from the conversation. This action cannot be undone.'
          : 'This post and its conversation will be removed. This action cannot be undone.'}
        pending={deleteTarget?.type === 'comment' ? Boolean(busyCommentId) : pending}
        error={deleteError}
        onCancel={() => { if (!pending && !busyCommentId) { setDeleteTarget(null); setDeleteError(''); } }}
        onConfirm={() => deleteTarget?.type === 'comment'
          ? confirmCommentDelete(deleteTarget.record)
          : confirmPostDelete()}
      />
    </div>
  );
}