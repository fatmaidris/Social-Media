import { apiRequest } from "./client.js";

export function signUp(form) {
  return apiRequest("/users/signup", { method: "POST", body: form });
}

export function signIn(login, password) {
  return apiRequest("/users/signin", {
    method: "POST",
    body: { email: login, password },
  });
}

export function getMyProfile(token) {
  return apiRequest("/users/profile-data", { method: "GET", token });
}

export function uploadProfilePhoto(token, photo) {
  const form = new FormData();
  form.append("photo", photo);
  return apiRequest("/users/upload-photo", { method: "PUT", token, body: form });
}

export function changePassword(token, password, newPassword) {
  return apiRequest("/users/change-password", {
    method: "PATCH",
    token,
    body: { password, newPassword },
  });
}
