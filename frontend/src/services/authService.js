import { apiRequest } from './apiClient';

const AUTH_STORAGE_KEY = 'tic_auth_user';
const AUTH_EVENT = 'tic-auth-change';

function normalizeUser(user = null, emailFallback = '') {
  const candidate = user && typeof user === 'object' && 'user' in user ? user.user : user;

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const resolvedId = candidate.id || candidate.userId || candidate._id || (emailFallback || null);
  const resolvedEmail = candidate.email || emailFallback || '';

  if (!resolvedId && !resolvedEmail) {
    return null;
  }

  return {
    id: resolvedId || resolvedEmail,
    email: resolvedEmail,
    role: candidate.role || 'Viewer',
    active: candidate.active !== false,
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

    const user = normalizeUser(data, email);

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
    const user = normalizeUser(data);

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
  const allowedRoles = ['Viewer', 'Accommodation', 'Admin'];
  const nextRole = allowedRoles.includes(role) ? role : 'Viewer';

  try {
    const targetId = userId || currentUser?.id || 'me';
    let data;

    try {
      data = await apiRequest('/api/users', {
        method: 'POST',
        body: { userId: targetId, email, role: nextRole },
      });
    } catch {
      try {
        data = await apiRequest(`/api/users/${encodeURIComponent(targetId)}/role`, {
          method: 'POST',
          body: { email, role: nextRole },
        });
      } catch {
        data = await apiRequest(`/api/users/${encodeURIComponent(targetId)}/role`, {
          method: 'PUT',
          body: { email, role: nextRole },
        });
      }
    }

    const user = normalizeUser(data?.user, email);

    if (!user || user.role !== nextRole) {
      return { user: null, error: 'Role change was not confirmed by the server.' };
    }

    if (currentUser?.id === targetId) {
      persistUser(user);
    }

    return { user, error: null };
  } catch (error) {
    return { user: null, error: error?.message || 'Unable to update role.' };
  }
}

export async function fetchUsersForRoleManagement() {
  try {
    const data = await apiRequest(`/api/users?ts=${Date.now()}`);
    return Array.isArray(data?.users) ? data.users : [];
  } catch (error) {
    throw new Error(error?.message || 'Unable to load users.');
  }
}

export async function sendPasswordResetForUser(userId, email) {
  try {
    await apiRequest(`/api/users/${encodeURIComponent(userId)}/reset-password`, {
      method: 'POST',
      body: { email },
    });

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error?.message || 'Unable to send password reset email.' };
  }
}

export async function deleteManagedUser(userId) {
  try {
    await apiRequest(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error?.message || 'Unable to delete user.' };
  }
}
