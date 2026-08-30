import { createContext, useContext, useState } from 'react';
import api from '../lib/api';
import socket, { reconnectSocket } from '../lib/socket';

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
    reconnectSocket();
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

  // Patch own profile (name/phone/avatar/bio/etc.) and sync local session
  async function updateProfile(payload) {
    const { data } = await api.patch('/auth/me', payload);
    const u = data.user;
    const merged = {
      ...(user || {}),
      id: u.id || u._id,
      name: u.name,
      role: u.role,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl || '',
      bio: u.bio || '',
      designation: u.designation || '',
      location: u.location || '',
      timezone: u.timezone || 'Asia/Kolkata (IST)',
      language: u.language || 'English',
      contactPreference: u.contactPreference || 'Email',
      emailVerified: u.emailVerified,
    };
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
        phone: data.phone,
        avatarUrl: data.avatarUrl || '',
        bio: data.bio || '',
        designation: data.designation || '',
        location: data.location || '',
        timezone: data.timezone || 'Asia/Kolkata (IST)',
        language: data.language || 'English',
        contactPreference: data.contactPreference || 'Email',
        emailVerified: !!data.emailVerified,
      };
      localStorage.setItem('sg_user', JSON.stringify(u));
      setUser(u);
      return u;
    } catch (e) {
      return null;
    }
  }

  async function googleLogin(payload) {
    const { data } = await api.post('/auth/google', payload);
    setSession(data);
    return data.user;
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    socket.disconnect();
  }

  return (
    <AuthCtx.Provider value={{ user, login, signup, googleLogin, logout, updateProfile, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthCtx);
