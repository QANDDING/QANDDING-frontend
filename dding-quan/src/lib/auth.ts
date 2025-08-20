import { User } from '../types/types';

const AUTH_USER_KEY = 'dq_auth_user_v1';
const AUTH_TIME_KEY = 'dq_auth_time_v1';
const ACCESS_TOKEN_KEY = 'ACCESS_TOKEN';

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
  s.removeItem(ACCESS_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getAuthUser() !== null && getAccessToken() !== null;
}

// 토큰 관련 함수들
export function saveAccessToken(token: string): void {
  const s = safeStorage();
  if (!s) return;
  s.setItem(ACCESS_TOKEN_KEY, token);
}

export function getAccessToken(): string | null {
  const s = safeStorage();
  if (!s) return null;
  return s.getItem(ACCESS_TOKEN_KEY);
}

export function removeAccessToken(): void {
  const s = safeStorage();
  if (!s) return;
  s.removeItem(ACCESS_TOKEN_KEY);
}

// 구글 로그인 후 토큰 처리
export function handleGoogleLoginSuccess(token: string, user: User): void {
  saveAccessToken(token);
  saveAuthUser(user);
}

// URL 파라미터에서 토큰과 사용자 정보 추출하여 저장
export function handleGoogleLoginCallback(): boolean {
  if (typeof window === 'undefined') return false;
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const userData = urlParams.get('user');
  
  if (token && userData) {
    try {
      const user = JSON.parse(decodeURIComponent(userData));
      handleGoogleLoginSuccess(token, user);
      
      // URL 파라미터 정리
      window.history.replaceState({}, document.title, window.location.pathname);
      
      return true;
    } catch (error) {
      console.error('사용자 정보 파싱 실패:', error);
      return false;
    }
  }
  
  return false;
}

// 인증 상태 확인 및 페이지 이동 처리
export function checkAuthAndRedirect(): 'authenticated' | 'unauthenticated' {
  if (isAuthenticated()) {
    return 'authenticated';
  } else {
    // 토큰이 없으면 로그인 페이지로 이동
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return 'unauthenticated';
  }
}

// 보호된 라우트에서 사용할 함수
export function requireAuth(): boolean {
  if (!isAuthenticated()) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return false;
  }
  return true;
}

// 로그인 성공 후 메인 페이지로 이동
export function redirectToMain(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}

// 로그아웃 처리
export function logout(): void {
  clearAuth();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

