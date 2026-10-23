import { apiRequest } from "./client.js";

export function getAllPosts(token) {
  return apiRequest("/posts", { method: "GET", token });
}

export function getPost(token, postId) {
  return apiRequest(`/posts/${encodeURIComponent(postId)}`, {
    method: "GET",
    token,
  });
}

export function createPost(token, body, image) {
  const form = new FormData();
  form.append("body", body);
  if (image) form.append("image", image);
  return apiRequest("/posts", { method: "POST", token, body: form });
}

export function updatePost(token, postId, body, image) {
  const form = new FormData();
  form.append("body", body);
  if (image) form.append("image", image);
  return apiRequest(`/posts/${encodeURIComponent(postId)}`, {
    method: "PUT",
    token,
    body: form,
  });
}

export function deletePost(token, postId) {
  return apiRequest(`/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
    token,
  });
}
