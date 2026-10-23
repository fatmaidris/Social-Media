import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { getDisplayName, getImageUrl, getRecordId, getText, getUserId, isOwnedBy } from '../utils/apiData.js';
import UserAvatar from './UserAvatar.jsx';

function formatDate(record) {
  const value = record?.createdAt ?? record?.created_at ?? record?.date;
  if (typeof value !== 'string') return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export default function PostCard({ post, profile, busy = false, bookmarked = false, bookmarkBusy = false, onToggleBookmark, onEdit, onDelete }) {
  const id = getRecordId(post);
  const body = getText(post, 'body');
  const author = post?.author ?? post?.user ?? post?.createdBy ?? post?.postedBy ?? post;
  const authorId = getUserId(author);
  const canOpenAuthor = Boolean(authorId && !isOwnedBy({ author }, profile));
  const image = getImageUrl(post);
  const canManage = Boolean(id && profile && isOwnedBy(post, profile));

  return (
    <article className="post-card">
      <header className="post-header">
        <UserAvatar person={author} className="post-author-mark" />
        <div className="post-author-copy">{getDisplayName(author) && (canOpenAuthor ? <Link to={`/users/${encodeURIComponent(authorId)}`}>{getDisplayName(author)}</Link> : <strong>{getDisplayName(author)}</strong>)}<span>{formatDate(post)}</span></div>
        {canManage && (onEdit || onDelete) && <div className="post-management">{onEdit && <button type="button" className="text-button" onClick={() => onEdit(post)} disabled={busy}>Edit</button>}{onDelete && <button type="button" className="text-button danger" onClick={() => onDelete(post)} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>}</div>}
      </header>
      {body ? <p className="post-body">{body}</p> : <p className="muted-copy">Post content is unavailable.</p>}
      {image && <img className="post-image" src={image} alt="Attached to this post" loading="lazy" />}
      <footer className="post-footer">
        {onToggleBookmark && <button className="bookmark-toggle" type="button" onClick={() => onToggleBookmark(post)} disabled={bookmarkBusy} aria-pressed={bookmarked} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark post'}><Bookmark size={17} strokeWidth={1.8} fill={bookmarked ? 'currentColor' : 'none'} aria-hidden="true" /><span>{bookmarkBusy ? 'Saving…' : bookmarked ? 'Saved' : 'Save'}</span></button>}
        {id ? <Link className="post-open-link" to={`/posts/${encodeURIComponent(id)}`}>View post and comments <span aria-hidden="true">↗</span></Link> : <span className="muted-copy">Post details are unavailable because the response did not include an ID.</span>}
      </footer>
    </article>
  );
}