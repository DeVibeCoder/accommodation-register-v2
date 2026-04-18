import React, { useEffect, useState } from 'react';
import App from './App';
import SignIn from './pages/SignIn';
import { getSessionUser, signInWithApi, signOutFromApi, subscribeToAuthChanges } from './services/authService';

export default function Root() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    const fallbackTimer = window.setTimeout(() => {
      if (!ignore) setLoading(false);
    }, 4000);

    (async () => {
      try {
        const sessionUser = await getSessionUser();
        if (!ignore) {
          setUser(sessionUser);
        }
      } catch (error) {
        console.error('[Auth] Initial session check failed:', error?.message || error);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    })();

    const subscription = subscribeToAuthChanges((nextUser) => {
      if (!ignore) {
        setUser(nextUser);
        setLoading(false);
      }
    });

    return () => {
      ignore = true;
      window.clearTimeout(fallbackTimer);
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignIn = async ({ email, password }) => {
    const result = await signInWithApi(email, password);
    if (result.user) {
      setUser(result.user);
    }
    return result;
  };

  const handleLogout = async () => {
    await signOutFromApi();
    setUser(null);
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f7fa', color: '#1e315f', fontWeight: 800 }}>Loading...</div>;
  }

  if (!user) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  return <App user={user} setUser={setUser} onLogout={handleLogout} />;
}
