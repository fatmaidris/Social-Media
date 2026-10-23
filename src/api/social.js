import { apiRequest } from './client.js';

export function getUserProfile(token, userId) {
  return apiRequest(`/users/${encodeURIComponent(userId)}/profile`, { method: 'GET', token });
}

export function toggleFollow(token, userId) {
  return apiRequest(`/users/${encodeURIComponent(userId)}/follow`, { method: 'PUT', token });
}

export function getBookmarks(token) {
  return apiRequest('/users/bookmarks', { method: 'GET', token });
}

export function togglePostBookmark(token, postId) {
  return apiRequest(`/posts/${encodeURIComponent(postId)}/bookmark`, { method: 'PUT', token });
}