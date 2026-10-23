const API_BASE = "https://route-posts.routemisr.com";

export class ApiError extends Error {
  constructor(message, status = 0, response = null, path = "") {
    super(message);
    this.path = path;
    this.name = "ApiError";
    this.status = status;
    this.response = response;
  }
}

function getErrorMessage(data, fallback) {
  if (typeof data?.message === "string" && data.message.trim())
    return data.message;
  if (typeof data?.errors === "string" && data.errors.trim())
    return data.errors;
  if (Array.isArray(data?.errors)) return data.errors.filter(Boolean).join(" ");
  return fallback;
}

function logApiFailure(path, method, body, status, response) {
  if (!import.meta.env?.DEV) return;
  const keys = body instanceof FormData
    ? [...body.keys()]
    : body && typeof body === "object"
      ? Object.keys(body)
      : [];
  const requestFields = keys.filter((key) => !/(password|token|secret)/i.test(key));
  const isPasswordChange = path === "/users/change-password";
  const allowedFields = new Set(["name", "username", "email", "dateOfBirth", "gender"]);
  if (isPasswordChange) {
    allowedFields.add("password");
    allowedFields.add("newPassword");
  }
  const detail = responseText(response);
  const validationFields = [...detail.matchAll(/["']([a-z][a-z0-9_]*)["']/gi)]
    .map((match) => match[1])
    .filter((field) => [...allowedFields].some((allowed) => allowed.toLowerCase() === field.toLowerCase()));

  console.warn("Route Social request failed", {
    method: method || "GET",
    path,
    status,
    requestFields,
    validationFields: [...new Set(validationFields)],
    ...(isPasswordChange && body && typeof body === "object"
      ? { passwordFieldPresence: { password: Boolean(body.password), newPassword: Boolean(body.newPassword) } }
      : {}),
  });
}

function responseText(response) {
  const messages = [response?.message, response?.errors];
  return messages.flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function fieldReason(detail, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return detail.match(new RegExp(`["']${escaped}["']\\s+([^,]+)`, "i"))?.[1]?.trim() ?? "";
}

function getPasswordChangeValidationMessage(detail) {
  const currentPasswordIssue = fieldReason(detail, "password");
  const newPasswordIssue = fieldReason(detail, "newPassword");

  if (/(incorrect|invalid|wrong|does not match)/.test(currentPasswordIssue)) {
    return "Your current password is incorrect.";
  }
  if (/(required|empty)/.test(currentPasswordIssue)) {
    return "Enter your current password.";
  }
  if (/(pattern|length|minimum|at least|too short)/.test(newPasswordIssue)) {
    return "Choose a new password that meets the password requirements.";
  }
  if (/(same|different|match)/.test(newPasswordIssue)) {
    return "Choose a new password that differs from your current one.";
  }
  if (/(required|empty)/.test(newPasswordIssue)) {
    return "Enter a new password.";
  }
  return "Check your current and new password, then try again.";
}

function getSignupValidationMessage(detail) {
  const issues = [];
  const fieldReason = (field) => {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return detail.match(new RegExp(`[\"']${escaped}[\"']\\s+([^,]+)`, "i"))?.[1]?.trim() ?? "";
  };
  const mentions = (field) => Boolean(fieldReason(field));

  const nameIssue = fieldReason("name");
  const usernameIssue = fieldReason("username");
  const emailIssue = fieldReason("email");
  const dateIssue = fieldReason("dateOfBirth");
  const genderIssue = fieldReason("gender");
  const passwordIssue = fieldReason("password");
  const confirmationIssue = fieldReason("rePassword");

  if (nameIssue) {
    issues.push(/(required|empty)/.test(nameIssue) ? "Enter your full name." : "Check your full name and try again.");
  }
  if (usernameIssue) {
    issues.push(/(already|exists|taken)/.test(usernameIssue)
      ? "That username is already in use. Try a different one."
      : "Check your username and try again.");
  }
  if (emailIssue) {
    if (/(required|empty)/.test(emailIssue)) issues.push("Enter your email address.");
    else if (/(valid|format|invalid)/.test(emailIssue)) issues.push("Enter a valid email address.");
    else issues.push("Check your email address and try again.");
  }
  if (dateIssue) {
    issues.push(/(required|empty)/.test(dateIssue) ? "Enter your date of birth." : "Enter a valid date of birth.");
  }
  if (genderIssue) issues.push("Select a supported gender option.");
  if (confirmationIssue && /(match|equal|same)/.test(confirmationIssue)) {
    issues.push("Your passwords must match.");
  } else if (passwordIssue || confirmationIssue) {
    if (/(required pattern|fails to match|pattern)/.test(passwordIssue)) {
      issues.push("Use at least 8 characters with an uppercase letter, lowercase letter, number, and special character (#?!@$%^&*-).");
    } else if (/(length|minimum|at least|too short)/.test(passwordIssue)) {
      const minimum = passwordIssue.match(/(?:at least|minimum(?: length)? of?)\s*(\d+)/);
      issues.push(minimum ? `Choose a password with at least ${minimum[1]} characters.` : "Choose a longer password and try again.");
    } else if (/(required|empty)/.test(passwordIssue) || /(required|empty)/.test(confirmationIssue)) {
      issues.push("Enter your password and confirmation.");
    } else {
      issues.push("Check your password and confirmation.");
    }
  }

  if (issues.length) return [...new Set(issues)].join(" ");
  return "Some signup information was not accepted. Review your entries and try again.";
}

export function getUserErrorMessage(error, action = "general") {
  if (error?.name !== "ApiError") return "Something went wrong. Please try again.";
  const status = Number(error?.status) || 0;
  const detail = responseText(error?.response);

  if (action === "password-change") {
    if (/current password/.test(detail) && /(incorrect|invalid|wrong|not correct)/.test(detail)) {
      return "Your current password is incorrect.";
    }
    if (/current password/.test(detail) && /(required|missing)/.test(detail)) {
      return "Enter your current password and try again.";
    }
    if (status === 401 || status === 403) return "Your session may have expired. Sign in again and retry.";
    if (status === 400 || status === 422) return getPasswordChangeValidationMessage(detail);
  }

  if (action === "login" && (status === 401 || status === 403)) {
    return "Email or password is incorrect. Check your details and try again.";
  }
  if (action === "signup" && status === 409) {
    return "That email or username is already in use. Try signing in instead.";
  }
  if (action === "signup" && (status === 400 || status === 422)) {
    if (/(email|username)/.test(detail) && /(already|exists|taken)/.test(detail)) {
      return "That email or username is already in use. Try signing in instead.";
    }
    return getSignupValidationMessage(detail);
  }
  if ((status === 401 || status === 403) && action !== "signup") {
    return "Your session may have expired. Sign in again and retry.";
  }
  if (status === 404) return "This item is no longer available. Refresh and try again.";
  if (status === 409) return "This change conflicts with the current information. Refresh and try again.";
  if (status === 429) return "Please wait a moment before trying again.";
  if (status >= 500) return "The service is temporarily unavailable. Please try again.";
  if (status === 0) return "Connection problem. Check your internet connection and try again.";
  if (status === 400 || status === 422 || (status >= 200 && status < 300 && error.response?.success === false)) {
    return "Some information needs attention. Check your entries and try again.";
  }
  return "Something went wrong. Please try again.";
}

export async function apiRequest(
  path,
  { token, body, headers = {}, ...options } = {},
) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  if (body !== undefined && !(body instanceof FormData))
    requestHeaders.set("Content-Type", "application/json");

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: requestHeaders,
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
  } catch {
    logApiFailure(path, options.method, body, 0, null);
    throw new ApiError("Network request failed.", 0, null, path);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      logApiFailure(path, options.method, body, response.status, null);
      throw new ApiError("Response was not valid JSON.", response.status, null, path);
    }
  }
  if (!response.ok || data?.success === false) {
    logApiFailure(path, options.method, body, response.status, data);
    throw new ApiError(getErrorMessage(data, "Request failed."), response.status, data, path);
  }
  return data;
}

export function responseData(response) {
  return response?.data;
}
