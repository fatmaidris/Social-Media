import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { changePassword as requestPasswordChange, getMyProfile, signIn, signUp, uploadProfilePhoto as requestPhotoUpload } from '../api/auth.js';
import { getBookmarks, togglePostBookmark } from '../api/social.js';
import { getUserErrorMessage, responseData } from '../api/client.js';
import { getBookmarkState, getProfileRecord } from '../utils/apiData.js';

const TOKEN_KEY = 'route-social-token';
const AuthContext = createContext(null);

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken);
  const [profile, setProfile] = useState(null);
  const [checkingSession, setCheckingSession] = useState(Boolean(readToken()));
  const [bookmarkState, setBookmarkState] = useState({ ids: [], count: 0 });
  const [bookmarksLoading, setBookmarksLoading] = useState(Boolean(readToken()));
  const [bookmarksError, setBookmarksError] = useState('');

  useEffect(() => {
    let active = true;
    if (!token) {
      setProfile(null);
      setCheckingSession(false);
      return () => { active = false; };
    }

    setCheckingSession(true);
    getMyProfile(token)
      .then((result) => {
        if (active) setProfile(getProfileRecord(result));
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401 || error.status === 403) {
          localStorage.removeItem(TOKEN_KEY);
          setToken('');
          setProfile(null);
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => { active = false; };
  }, [token]);

  const refreshBookmarks = useCallback(async (activeToken = token) => {
    if (!activeToken) {
      setBookmarkState({ ids: [], count: 0 });
      setBookmarksError('');
      setBookmarksLoading(false);
      return { ids: [], count: 0 };
    }
    setBookmarksLoading(true);
    setBookmarksError('');
    try {
      const response = await getBookmarks(activeToken);
      const nextState = getBookmarkState(response);
      setBookmarkState(nextState);
      return nextState;
    } catch (error) {
      setBookmarksError(getUserErrorMessage(error, 'bookmarks'));
      return null;
    } finally {
      setBookmarksLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshBookmarks(token);
  }, [token, refreshBookmarks]);

  function saveToken(nextToken) {
    if (typeof nextToken !== 'string' || !nextToken.trim()) {
      throw new Error('The API response did not include the documented data.token value.');
    }
    localStorage.setItem(TOKEN_KEY, nextToken);
    setCheckingSession(true);
    setToken(nextToken);
  }

  const refreshProfile = useCallback(async (activeToken = token) => {
    const result = await getMyProfile(activeToken);
    const nextProfile = getProfileRecord(result);
    setProfile(nextProfile);
    return nextProfile;
  }, [token]);

  async function authenticate(request) {
    const result = await request;
    const data = responseData(result);
    saveToken(data?.token);
    return result;
  }

  async function login(loginValue, password) {
    return authenticate(signIn(loginValue, password));
  }

  async function register(form) {
    return authenticate(signUp(form));
  }

  async function updatePassword(currentPassword, newPassword) {
    const result = await requestPasswordChange(token, currentPassword, newPassword);
    const nextToken = responseData(result)?.token;
    if (typeof nextToken === 'string' && nextToken.trim()) saveToken(nextToken);
    return result;
  }

  async function uploadProfilePhoto(photo) {
    const result = await requestPhotoUpload(token, photo);
    await refreshProfile(token);
    return result;
  }

  async function toggleBookmark(postId) {
    const id = String(postId);
    const wasBookmarked = bookmarkState.ids.includes(id);
    await togglePostBookmark(token, id);
    setBookmarkState((current) => ({
      ids: wasBookmarked ? current.ids.filter((savedId) => savedId !== id) : [...current.ids, id],
      count: Math.max(0, current.count + (wasBookmarked ? -1 : 1)),
    }));
    await refreshBookmarks(token);
    return !wasBookmarked;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setProfile(null);
  }

  const value = {
    token,
    profile,
    isAuthenticated: Boolean(token),
    checkingSession,
    login,
    register,
    logout,
    refreshProfile,
    updatePassword,
    uploadProfilePhoto,
    bookmarkIds: bookmarkState.ids,
    bookmarkCount: bookmarkState.count,
    bookmarksLoading,
    bookmarksError,
    refreshBookmarks,
    toggleBookmark,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}