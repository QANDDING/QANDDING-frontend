import { User } from '../types/types';

const AUTH_USER_KEY = 'dq_auth_user_v1';
const AUTH_TIME_KEY = 'dq_auth_time_v1';

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveAuthUser(user: User): void {
  const s = safeStorage();
  if (!s) return;
  s.setItem(AUTH_USER_KEY, JSON.stringify(user));
  s.setItem(AUTH_TIME_KEY, String(Date.now()));
}

export function getAuthUser(): User | null {
  const s = safeStorage();
  if (!s) return null;
  const raw = s.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  const s = safeStorage();
  if (!s) return;
  s.removeItem(AUTH_USER_KEY);
  s.removeItem(AUTH_TIME_KEY);
}

export function isAuthenticated(): boolean {
  return getAuthUser() !== null;
}

