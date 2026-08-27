import { createContext, useContext, useState } from 'react';
import api from '../lib/api';
import socket from '../lib/socket';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('sg_token');
    const u = localStorage.getItem('sg_user');
    return t && u ? JSON.parse(u) : null;
  });

  function setSession(data) {
    localStorage.setItem('sg_token', data.token);
    localStorage.setItem('sg_user', JSON.stringify(data.user));
    setUser(data.user);
    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    // Socket auth token is read from localStorage by socket.js auth callback
    socket.connect();
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    setSession(data);
    return data.user;
  }

  async function signup(payload) {
    const { data } = await api.post('/auth/signup', payload);
    setSession(data);
    return data.user;
  }

  // Patch own profile (name/phone/email+OTP code) and sync local session
  async function updateProfile(payload) {
    const { data } = await api.patch('/auth/me', payload);
    const u = data.user;
    const merged = { ...(user || {}), id: u.id, name: u.name, role: u.role, email: u.email, emailVerified: u.emailVerified };
    localStorage.setItem('sg_user', JSON.stringify(merged));
    setUser(merged);
    return u;
  }

  // Re-fetch fresh profile from server into local session
  async function refreshUser() {
    try {
      const { data } = await api.get('/auth/me');
      const u = {
        id: data.id || data._id,
        name: data.name,
        role: data.role,
        email: data.email,
        emailVerified: !!data.emailVerified,
      };
      localStorage.setItem('sg_user', JSON.stringify(u));
      setUser(u);
      return u;
    } catch (e) {
      return null;
    }
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    socket.disconnect();
  }

  return (
    <AuthCtx.Provider value={{ user, login, signup, logout, updateProfile, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthCtx);
