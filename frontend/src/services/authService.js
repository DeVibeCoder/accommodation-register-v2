import { apiRequest } from './apiClient';

const AUTH_STORAGE_KEY = 'tic_auth_user';
const AUTH_EVENT = 'tic-auth-change';

function normalizeUser(user = {}, emailFallback = '') {
  if (!user) return null;

  return {
    id: user.id || user.userId || user._id || emailFallback || 'local-user',
    email: user.email || emailFallback || '',
    role: user.role || 'Viewer',
    active: user.active !== false,
  };
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistUser(user) {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // ignore storage issues
  }

  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: user || null }));
}

export async function signInWithApi(email, password) {
  if (!email || !password) {
    return { user: null, error: 'Email and password are required.' };
  }

  try {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    const user = normalizeUser(data?.user ?? data, email);

    if (!user) {
      persistUser(null);
      return { user: null, error: 'Invalid email or password.' };
    }

    if (user.active === false) {
      persistUser(null);
      return { user: null, error: 'This user account is inactive.' };
    }

    persistUser(user);
    return { user, error: null };
  } catch (error) {
    persistUser(null);
    return { user: null, error: error?.message || 'Login failed.' };
  }
}

export async function getSessionUser() {
  try {
    const data = await apiRequest('/api/auth/session');
    const user = normalizeUser(data?.user ?? data);

    if (user && user.active !== false) {
      persistUser(user);
      return user;
    }
  } catch {
    // ignore and clear stale local session
  }

  persistUser(null);
  return null;
}

export function subscribeToAuthChanges(callback) {
  const handleAuthEvent = (event) => {
    callback(event.detail ?? readStoredUser());
  };

  const handleStorage = (event) => {
    if (event.key === AUTH_STORAGE_KEY) {
      callback(readStoredUser());
    }
  };

  window.addEventListener(AUTH_EVENT, handleAuthEvent);
  window.addEventListener('storage', handleStorage);

  return {
    unsubscribe() {
      window.removeEventListener(AUTH_EVENT, handleAuthEvent);
      window.removeEventListener('storage', handleStorage);
    },
  };
}

export async function signOutFromApi() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch {
    // ignore logout endpoint failures and clear local session anyway
  }

  persistUser(null);
  return { error: null };
}

export async function updateProfileRole(userId, email, role) {
  const currentUser = readStoredUser();

  try {
    const targetId = userId || currentUser?.id || 'me';
    const data = await apiRequest(`/api/users/${encodeURIComponent(targetId)}/role`, {
      method: 'PUT',
      body: { email, role },
    });

    const user = normalizeUser(data?.user ?? { ...currentUser, id: targetId, email, role }, email);
    persistUser(user);
    return { user, error: null };
  } catch (error) {
    return { user: null, error: error?.message || 'Unable to update role.' };
  }
}
