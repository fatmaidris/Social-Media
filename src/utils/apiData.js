import { responseData } from "../api/client.js";

const ID_KEYS = ["_id", "id", "postId", "commentId"];
const OWNER_KEYS =
  /^(user|author|owner|creator|createdby|postedby|commentedby|commenter|commentowner|commentauthor|commentcreator|commentby)(id|_id|username|email)?$/i;
const PROFILE_WRAPPERS = /^(data|user|profile|account|member)$/i;
const PROFILE_FIELDS =
  /^(name|username|email|dateofbirth|gender|photo|profilephoto|profileimage|avatar|bio)$/i;

export function getProfileRecord(response) {
  const root = responseData(response) ?? response;
  if (!root || typeof root !== "object" || Array.isArray(root)) return null;

  const candidates = [];
  const seen = new Set();
  function visit(record, depth) {
    if (
      !record ||
      typeof record !== "object" ||
      Array.isArray(record) ||
      seen.has(record)
    )
      return;
    seen.add(record);
    const score = Object.keys(record).reduce(
      (total, key) => total + (PROFILE_FIELDS.test(key) ? 2 : 0),
      0,
    );
    candidates.push({ record, score, depth });
    for (const [key, value] of Object.entries(record)) {
      if (PROFILE_WRAPPERS.test(key) && value && typeof value === "object")
        visit(value, depth + 1);
    }
  }

  visit(root, 0);
  if (!candidates.length) return null;
  candidates.sort(
    (left, right) => left.depth - right.depth || left.score - right.score,
  );
  const profile = Object.assign({}, ...candidates.map(({ record }) => record));
  for (const key of Object.keys(profile)) {
    if (PROFILE_WRAPPERS.test(key)) delete profile[key];
  }
  return profile;
}

export function getRecordId(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return "";
  for (const [key, value] of Object.entries(record)) {
    if (
      ID_KEYS.some(
        (candidate) => candidate.toLowerCase() === key.toLowerCase(),
      ) &&
      (typeof value === "string" || typeof value === "number")
    ) {
      return String(value);
    }
  }
  return "";
}

export function getUserId(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return '';
  for (const key of ['_id', 'id', 'userId', 'user_id']) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') return String(value);
  }
  return '';
}

export function getFollowingState(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  for (const key of ["isFollowing", "is_following", "following"]) {
    if (typeof record[key] === "boolean") return record[key];
  }
  return null;
}

export function getBookmarkState(response) {
  const data = responseData(response);
  const ids = new Set();
  let count = 0;

  function visit(value, parentKey = '') {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      if (/^(bookmarks|posts|items)$/i.test(parentKey)) count = Math.max(count, value.length);
      for (const item of value) visit(item, parentKey);
      return;
    }

    const postId = value.postId ?? value.post_id;
    if (typeof postId === 'string' || typeof postId === 'number') ids.add(String(postId));
    if ('body' in value) {
      const id = getRecordId(value);
      if (id) ids.add(id);
    }
    if (value.post && typeof value.post === 'object') {
      const id = getRecordId(value.post);
      if (id) ids.add(id);
    }

    for (const [key, child] of Object.entries(value)) {
      if (/^(data|bookmarks|posts|items|post)$/i.test(key)) visit(child, key);
    }
  }

  visit(data);
  return { ids: [...ids], count: Math.max(count, ids.size) };
}

function findArrays(value, found = []) {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    found.push(value);
    for (const item of value) findArrays(item, found);
    return found;
  }
  for (const child of Object.values(value)) findArrays(child, found);
  return found;
}

export function getRecords(response, kind) {
  const data = responseData(response);
  if (Array.isArray(data))
    return data.filter((item) => item && typeof item === "object");
  const collections = findArrays(data);
  const contentKey = kind === "comment" ? "content" : "body";
  const matching = collections.find((items) =>
    items.some(
      (item) => item && typeof item === "object" && contentKey in item,
    ),
  );
  return (matching || []).filter((item) => item && typeof item === "object");
}

export function getRecord(response, kind) {
  const data = responseData(response);
  if (Array.isArray(data))
    return data.find((item) => item && typeof item === "object") || null;
  if (!data || typeof data !== "object") return null;
  const key = kind === "comment" ? "content" : "body";
  if (key in data || getRecordId(data)) return data;
  const arrays = findArrays(data);
  for (const items of arrays) {
    const match = items.find(
      (item) =>
        item && typeof item === "object" && (key in item || getRecordId(item)),
    );
    if (match) return match;
  }
  for (const value of Object.values(data)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      (key in value || getRecordId(value))
    )
      return value;
  }
  return null;
}

function addIdentity(values, kind, value) {
  if (typeof value !== "string" && typeof value !== "number") return;
  const normalized = String(value).trim().toLowerCase();
  if (normalized) values.add(`${kind}:${normalized}`);
}

function collectIdentityValues(
  value,
  values = new Set(),
  seen = new Set(),
  allowedWrappers = PROFILE_WRAPPERS,
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    seen.has(value)
  )
    return values;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (/^(_?id|userid|user_id)$/i.test(key)) addIdentity(values, "id", child);
    if (/^user_?name$/i.test(key)) addIdentity(values, "username", child);
    if (/^email$/i.test(key)) addIdentity(values, "email", child);
    if (allowedWrappers.test(key) && child && typeof child === "object") {
      collectIdentityValues(child, values, seen, allowedWrappers);
    }
  }
  return values;
}

function ownerIdentityValues(key, value) {
  if (value && typeof value === "object") {
    return collectIdentityValues(
      value,
      new Set(),
      new Set(),
      /^(data|user|profile|account|author|owner|creator|createdby|postedby|commentedby|commenter|commentauthor|commentcreator|commentby)$/i,
    );
  }
  const values = new Set();
  if (/email$/i.test(key)) addIdentity(values, "email", value);
  else if (/username$/i.test(key)) addIdentity(values, "username", value);
  else {
    addIdentity(values, "id", value);
    addIdentity(values, "username", value);
    addIdentity(values, "email", value);
  }
  return values;
}

export function isOwnedBy(record, profile) {
  const profileIds = collectIdentityValues(profile);
  if (!profileIds.size || !record || typeof record !== "object") return false;
  const pending = [{ value: record, depth: 0 }];
  const seen = new Set();
  while (pending.length) {
    const { value: item, depth } = pending.pop();
    if (!item || typeof item !== "object" || seen.has(item)) continue;
    seen.add(item);
    for (const [key, value] of Object.entries(item)) {
      if (OWNER_KEYS.test(key)) {
        const ownerIds = ownerIdentityValues(key, value);
        if ([...ownerIds].some((identity) => profileIds.has(identity)))
          return true;
      }
      if (
        depth < 2 &&
        /^(data|post|comment|record)$/i.test(key) &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        pending.push({ value, depth: depth + 1 });
      }
    }
  }
  return false;
}

export function getText(record, key) {
  const value = record?.[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

export function getDisplayName(record) {
  if (typeof record === "string") return record.trim();
  const combinedName = [record?.firstName, record?.lastName]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ");
  const value = [record?.name, record?.username, record?.userName, combinedName]
    .find((candidate) => typeof candidate === "string" && candidate.trim());
  return value?.trim() ?? "";
}

export function getImageUrl(record) {
  const image =
    record?.image ??
    record?.photo ??
    record?.profilePhoto ??
    record?.profileImage ??
    record?.profilePicture ??
    record?.avatar;
  if (typeof image === "string") return image;
  if (image && typeof image === "object") {
    const url = image.url ?? image.secure_url ?? image.src;
    return typeof url === "string" ? url : "";
  }
  return "";
}

export function getSafeProfileFields(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile))
    return [];
  return Object.entries(profile).filter(
    ([key, value]) =>
      !/(password|token|secret)/i.test(key) &&
      !/^(__v|_?id|user_?id)$/i.test(key) &&
      !/^cover$/i.test(key) &&
      ["string", "number", "boolean"].includes(typeof value),
  );
}

export function getProfileDisplayFields(profile) {
  return getSafeProfileFields(profile).filter(([key]) => {
    const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    return !/(image|photo|avatar|^name$)/i.test(key) && normalized !== 'bookmarkcount' && normalized !== 'bookmarkscount';
  });
}

export function formatProfileFieldLabel(key) {
  const label = String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+count$/i, "")
    .trim();
  return label ? label[0].toUpperCase() + label.slice(1) : "";
}
