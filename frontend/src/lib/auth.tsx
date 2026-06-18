'use client';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { login as apiLogin, setAuth } from './api';
import { Role, User } from './types';

interface AuthCtx {
  user: User | null;
  ready: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
const KEY = 'gamecloud.auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { token: string; user: User };
        setAuth(saved.token, saved.user);
        setUser(saved.user);
      }
    } catch {
      /* corrupt storage — ignore */
    }
    setReady(true);
  }, []);

  const signIn = async (username: string, password: string) => {
    const { token, user } = await apiLogin(username, password);
    localStorage.setItem(KEY, JSON.stringify({ token, user }));
    setAuth(token, user);
    setUser(user);
  };

  const signOut = () => {
    localStorage.removeItem(KEY);
    setAuth(null, null);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, ready, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

// role helpers used to gate nav + actions in the UI
export const canApprove = (role?: Role) => role === 'admin' || role === 'manager';
export const canViewAudit = (role?: Role) => role === 'admin' || role === 'manager';
export const canViewExec = (role?: Role) => role === 'admin' || role === 'manager';
export const isAdmin = (role?: Role) => role === 'admin';
