import React, { useState } from 'react';
import App from './App';
import SignIn from './pages/SignIn';

export default function Root() {
  const [user, setUser] = useState(() => {
    // Try to restore from localStorage
    const saved = localStorage.getItem('tic_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleSignIn = (userObj) => {
    setUser(userObj);
    localStorage.setItem('tic_user', JSON.stringify(userObj));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('tic_user');
  };

  if (!user) {
    return <SignIn onSignIn={handleSignIn} />;
  }
  // Pass logout to App via context
  return <App user={user} onLogout={handleLogout} />;
}
