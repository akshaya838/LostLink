import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth as authApi, tokenStore } from './api.js';
import { Spinner } from './components/ui.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // On first load, turn a saved token back into a user
  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return; }
    authApi
      .me()
      .then(setUser)
      .catch(() => tokenStore.set(null))
      .finally(() => setReady(true));
  }, []);

  // Fired by the API layer when a token has expired
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('lostlink:logout', onLogout);
    return () => window.removeEventListener('lostlink:logout', onLogout);
  }, []);

  const signIn = useCallback(({ token, user: u }) => {
    tokenStore.set(token);
    setUser(u);
    return u;
  }, []);

  const value = {
    user,
    ready,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    login: async (email, password) => signIn(await authApi.login(email, password)),
    register: async (body) => signIn(await authApi.register(body)),
    logout: () => { tokenStore.set(null); setUser(null); },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

// Wraps a page that needs a login (and optionally a specific role)
export function RequireAuth({ role, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Spinner />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?as=${role === 'admin' ? 'admin' : 'student'}&next=${next}`} replace />;
  }
  if (role && user.role !== role) {
    return (
      <div className="empty">
        <h2>{role === 'admin' ? 'This page is for the admin desk' : 'This page is for students'}</h2>
        <p>You're logged in as {user.name}. Log out and sign in with the right account to continue.</p>
      </div>
    );
  }
  return children;
}
