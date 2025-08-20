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
  s.removeItem('REFRESH_TOKEN');
}

export function isAuthenticated(): boolean {
  return getAuthUser() !== null && getAccessToken() !== null;
}

// 토큰 관련 함수들
export function saveAccessToken(token: string): void {
  const s = safeStorage();
  if (!s) {
    console.error('로컬 스토리지를 사용할 수 없습니다');
    return;
  }
  console.log('토큰 저장 중:', token.substring(0, 10) + '...');
  s.setItem(ACCESS_TOKEN_KEY, token);
  console.log('토큰 저장 완료');
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
export function handleGoogleLoginSuccess(token: string, user: User, refreshToken?: string): void {
  saveAccessToken(token);
  if (refreshToken) {
    // 리프레시 토큰도 저장
    const s = safeStorage();
    if (s) {
      s.setItem('REFRESH_TOKEN', refreshToken);
      console.log('리프레시 토큰 저장 완료');
    }
  }
  saveAuthUser(user);
}

// URL 파라미터에서 토큰과 사용자 정보 추출하여 저장
export function handleGoogleLoginCallback(): boolean {
  if (typeof window === 'undefined') return false;
  
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const accessToken = urlParams.get('accessToken');
  const refreshToken = urlParams.get('refreshToken');
  const needsProfile = urlParams.get('needsProfile');
  
  console.log('구글 로그인 콜백 처리:', { 
    success, 
    accessToken: accessToken ? '토큰 있음' : '토큰 없음', 
    refreshToken: refreshToken ? '리프레시 토큰 있음' : '리프레시 토큰 없음',
    needsProfile
  });
  
  if (success === 'true' && accessToken) {
    try {
      // JWT 토큰에서 사용자 정보 추출
      const tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
      console.log('토큰 페이로드:', tokenPayload);
      
      // 사용자 정보 구성
      const user = {
        id: tokenPayload.userId?.toString() || tokenPayload.sub,
        email: tokenPayload.email,
        name: tokenPayload.name || tokenPayload.email?.split('@')[0] || '사용자',
        role: tokenPayload.role || 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('구성된 사용자 정보:', user);
      
      // 토큰과 사용자 정보 저장
      handleGoogleLoginSuccess(accessToken, user, refreshToken || undefined);
      console.log('토큰 및 사용자 정보 저장 완료');
      
      // URL 파라미터 정리
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // 프로필 설정이 필요한 경우 온보딩 페이지로 이동
      if (needsProfile === 'true') {
        console.log('프로필 설정 필요, 온보딩 페이지로 이동');
        if (typeof window !== 'undefined') {
          window.location.href = '/onboarding';
          return true;
        }
      }
      
      return true;
    } catch (error) {
      console.error('토큰 처리 실패:', error);
      return false;
    }
  }
  
  console.log('로그인 성공하지 않았거나 토큰이 없음');
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
    window.location.href = 'login';
  }
}

