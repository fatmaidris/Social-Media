import { apiRequest } from "./client.js";

export function getComments(token, postId, page = 1, limit = 50) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiRequest(`/posts/${encodeURIComponent(postId)}/comments?${query}`, {
    method: "GET",
    token,
  });
}

export function createComment(token, postId, content, image) {
  const form = new FormData();
  form.append("content", content);
  if (image) form.append("image", image);
  return apiRequest(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    token,
    body: form,
  });
}

export function updateComment(token, postId, commentId, content, image) {
  const form = new FormData();
  form.append("content", content);
  if (image) form.append("image", image);
  return apiRequest(
    `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "PUT",
      token,
      body: form,
    },
  );
}

export function deleteComment(token, postId, commentId) {
  return apiRequest(
    `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
      token,
    },
  );
}
