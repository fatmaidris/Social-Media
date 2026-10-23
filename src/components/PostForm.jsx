import { useEffect, useState } from 'react';

export default function PostForm({ initialBody = '', pending = false, error = '', submitLabel = 'Share post', resetKey = 0, onCancel, onSubmit }) {
  const [body, setBody] = useState(initialBody);
  const [image, setImage] = useState(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setBody(initialBody);
    setImage(null);
    setLocalError('');
  }, [initialBody, resetKey]);

  async function submit(event) {
    event.preventDefault();
    setLocalError('');
    if (!body.trim()) {
      setLocalError('Write something before sharing.');
      return;
    }
    if (image && !image.type.startsWith('image/')) {
      setLocalError('Choose an image file.');
      return;
    }
    await onSubmit(body.trim(), image);
  }

  return (
    <form className="composer" onSubmit={submit}>
      <label className="composer-label" htmlFor="post-body">{initialBody ? 'Edit your post' : 'What’s on your mind?'}</label>
      <textarea id="post-body" value={body} onChange={(event) => setBody(event.target.value)} rows="4" maxLength="5000" placeholder="Share a thought with the community…" required />
      <div className="composer-actions">
        <label className="file-button">Add image<input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] || null)} /></label>
        <span className="character-count">{body.length}/5000</span>
        {onCancel && <button className="button-secondary" type="button" onClick={onCancel}>Cancel</button>}
        <button className="button-primary compact" type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</button>
      </div>
      {image && <p className="selected-file">Selected: {image.name}</p>}
      {(localError || error) && <p className="form-error" role="alert">{localError || error}</p>}
    </form>
  );
}