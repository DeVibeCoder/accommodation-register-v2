import { supabase } from './supabaseClient';

async function fetchProfileByUserId(userId, emailFallback = '') {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role, active')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[Supabase Auth] Failed to load user profile:', error.message);
    return {
      id: userId,
      email: emailFallback,
      role: 'Viewer',
      active: true,
    };
  }

  if (!data) {
    console.warn('[Supabase Auth] No profile row found. Defaulting role to Viewer.');
    return {
      id: userId,
      email: emailFallback,
      role: 'Viewer',
      active: true,
    };
  }

  return {
    id: data.id,
    email: data.email || emailFallback,
    role: data.role || 'Viewer',
    active: data.active !== false,
  };
}

export async function signInWithSupabase(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { user: null, error: error.message };
  }

  const profile = await fetchProfileByUserId(data.user?.id, data.user?.email || email);

  if (profile && profile.active === false) {
    await supabase.auth.signOut();
    return { user: null, error: 'This user account is inactive.' };
  }

  return { user: profile, error: null };
}

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('[Supabase Auth] Failed to restore session:', error.message);
    return null;
  }

  const sessionUser = data?.session?.user;
  if (!sessionUser) return null;

  const profile = await fetchProfileByUserId(sessionUser.id, sessionUser.email || '');

  if (profile && profile.active === false) {
    await supabase.auth.signOut();
    return null;
  }

  return profile;
}

export function subscribeToAuthChanges(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      callback(null);
      return;
    }

    const profile = await fetchProfileByUserId(session.user.id, session.user.email || '');
    callback(profile?.active === false ? null : profile);
  });

  return subscription;
}

export async function signOutFromSupabase() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[Supabase Auth] Failed to sign out:', error.message);
  }
  return { error: error?.message || null };
}

export async function updateProfileRole(userId, email, role) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ email, role })
    .eq('id', userId)
    .select('id, email, role, active')
    .maybeSingle();

  if (error) {
    console.error('[Supabase Auth] Failed to update role:', error.message);
    return { user: null, error: error.message };
  }

  return {
    user: {
      id: data.id,
      email: data.email,
      role: data.role,
      active: data.active !== false,
    },
    error: null,
  };
}
