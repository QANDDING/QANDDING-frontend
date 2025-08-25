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
  if (!s) {
    console.error('로컬 스토리지를 사용할 수 없어 사용자 정보를 저장할 수 없습니다');
    return;
  }
  
  try {
    // 개발 환경에서만 사용자 정보 저장 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log('사용자 정보 저장 중:', { id: user.id, name: user.name });
    }
    s.setItem(AUTH_USER_KEY, JSON.stringify(user));
    s.setItem(AUTH_TIME_KEY, String(Date.now()));
    
    // 저장 확인
    const savedUser = s.getItem(AUTH_USER_KEY);
    const savedTime = s.getItem(AUTH_TIME_KEY);
    
    if (savedUser && savedTime) {
      console.log('사용자 정보 저장 완료 및 검증 성공');
    } else {
      console.error('사용자 정보 저장 실패');
    }
  } catch (error) {
    console.error('사용자 정보 저장 중 에러:', error);
  }
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
  console.log('인증 정보가 모두 정리되었습니다.');
}

// 토큰 만료 시 자동 로그아웃 및 로그인 페이지 리다이렉트
export function handleTokenExpired(): void {
  console.log('토큰이 만료되었습니다. 로그아웃 처리 중...');
  clearAuth();
  
  if (typeof window !== 'undefined') {
    // 현재 페이지가 로그인 페이지가 아닌 경우에만 리다이렉트
    if (!window.location.pathname.includes('/login')) {
      alert('세션이 만료되었습니다. 다시 로그인해주세요.');
      window.location.href = '/login';
    }
  }
}

export function isAuthenticated(): boolean {
  return getAuthUser() !== null && getAccessToken() !== null;
}

// 리프레시 토큰으로 액세스 토큰 갱신
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('REFRESH_TOKEN');
  if (!refreshToken) {
    console.log('리프레시 토큰이 없습니다.');
    return false;
  }

  try {
    console.log('리프레시 토큰으로 액세스 토큰 갱신 시도...');
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_SERVER_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      // 새로운 액세스 토큰 저장
      if (data.accessToken) {
        saveAccessToken(data.accessToken);
        console.log('액세스 토큰 갱신 성공');
        
        // 새로운 리프레시 토큰이 있으면 업데이트
        if (data.refreshToken) {
          localStorage.setItem('REFRESH_TOKEN', data.refreshToken);
          console.log('리프레시 토큰도 업데이트됨');
        }
        
        return true;
      }
    } else {
      console.log('리프레시 토큰도 만료됨');
      handleTokenExpired();
      return false;
    }
  } catch (error) {
    console.error('토큰 갱신 중 에러:', error);
    return false;
  }
  
  return false;
}

// 서버에서 토큰 유효성을 실제로 검증하고 필요시 자동 갱신
export async function isAuthenticatedWithServer(): Promise<boolean> {
  const localAuth = isAuthenticated();
  if (!localAuth) {
    return false;
  }

  try {
    // 먼저 현재 토큰으로 인증 확인
    const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_API_SERVER_URL}/api/auth/check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });

    // 토큰이 유효하면 바로 true 반환
    if (checkResponse.ok) {
      return true;
    }

    // 401 에러인 경우 리프레시 토큰으로 갱신 시도
    if (checkResponse.status === 401) {
      console.log('액세스 토큰 만료, 리프레시 토큰으로 갱신 시도...');
      
      const refreshSuccess = await refreshAccessToken();
      if (refreshSuccess) {
        console.log('토큰 갱신 성공, 인증 상태 유지');
        return true;
      } else {
        console.log('토큰 갱신 실패, 로그아웃 처리');
        handleTokenExpired();
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error('서버 인증 확인 중 에러:', error);
    // 네트워크 에러 등의 경우 로컬 토큰이 있으면 일단 인증된 것으로 처리
    return localAuth;
  }
}

// 토큰 관련 함수들
export function saveAccessToken(token: string): void {
  const s = safeStorage();
  if (!s) {
    console.error('로컬 스토리지를 사용할 수 없습니다');
    return;
  }
  // 개발 환경에서만 토큰 저장 로그 출력
  if (process.env.NODE_ENV === 'development') {
    console.log('토큰 저장 중...');
  }
  try {
    s.setItem(ACCESS_TOKEN_KEY, token);
    // 저장 확인
    const savedToken = s.getItem(ACCESS_TOKEN_KEY);
    if (savedToken === token) {
      console.log('토큰 저장 완료 및 검증 성공');
    } else {
      console.error('토큰 저장 실패: 저장된 토큰이 다름');
    }
  } catch (error) {
    console.error('토큰 저장 중 에러:', error);
  }
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
  console.log('구글 로그인 성공 처리 시작');
  
  // 액세스 토큰 저장
  saveAccessToken(token);
  
  // 리프레시 토큰 저장
  if (refreshToken) {
    const s = safeStorage();
    if (s) {
      try {
        console.log('리프레시 토큰 저장 중...');
        s.setItem('REFRESH_TOKEN', refreshToken);
        const savedRefreshToken = s.getItem('REFRESH_TOKEN');
        if (savedRefreshToken === refreshToken) {
          console.log('리프레시 토큰 저장 완료');
        } else {
          console.error('리프레시 토큰 저장 실패');
        }
      } catch (error) {
        console.error('리프레시 토큰 저장 중 에러:', error);
      }
    } else {
      console.error('로컬 스토리지를 사용할 수 없어 리프레시 토큰을 저장할 수 없습니다');
    }
  } else {
    console.log('리프레시 토큰이 없습니다');
  }
  
  // 사용자 정보 저장
  saveAuthUser(user);
  
  console.log('구글 로그인 성공 처리 완료');
}

// URL 파라미터에서 토큰과 사용자 정보 추출하여 저장
export function handleGoogleLoginCallback(): boolean {
  if (typeof window === 'undefined') return false;
  
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const accessToken = urlParams.get('accessToken');
  const refreshToken = urlParams.get('refreshToken');
  const needsProfile = urlParams.get('needsProfile');
  const error = urlParams.get('error');
  const errorType = urlParams.get('errorType');
  
  console.log('구글 로그인 콜백 처리:', { 
    success, 
    accessToken: accessToken ? '토큰 있음' : '토큰 없음', 
    refreshToken: refreshToken ? '리프레시 토큰 있음' : '리프레시 토큰 없음',
    needsProfile,
    error,
    errorType
  });
  
  // 로그인 실패 처리
  if (success === 'false') {
    console.error('OAuth2 로그인 실패:', { error, errorType });
    
    // URL 파라미터 정리
    window.history.replaceState({}, '', window.location.pathname);
    
    // 사용자에게 에러 메시지 표시
    let errorMessage = 'Login failed. Please try again.';
    if (error) {
      // 한글 에러 메시지를 영어로 변환
      if (error.includes('OAuth2 요청이 잘못되었습니다')) {
        errorMessage = 'OAuth2 request is invalid. Please try again.';
      } else if (error.includes('인증')) {
        errorMessage = 'Authentication failed. Please try again.';
      } else {
        errorMessage = `Login error: ${error}`;
      }
    }
    
    alert(errorMessage);
    return false;
  }
  
  // 로그인 성공 처리
  if (success === 'true' && accessToken) {
    try {
      console.log('JWT 토큰 파싱 시작...');
      // 개발 환경에서만 토큰 정보 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log('액세스 토큰 수신됨');
      }
      
      // JWT 토큰 구조 확인
      const tokenParts = accessToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error(`Invalid JWT format: expected 3 parts, got ${tokenParts.length}`);
      }
      
      // JWT 토큰에서 사용자 정보 추출
      const tokenPayload = JSON.parse(atob(tokenParts[1]));
      // 개발 환경에서만 토큰 페이로드 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log('토큰 페이로드 파싱 완료');
      }
      
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
      
      // URL 파라미터 정리 (한글이 포함될 수 있는 document.title 대신 빈 문자열 사용)
      window.history.replaceState({}, '', window.location.pathname);
      
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
      
      // URL 파라미터 정리
      window.history.replaceState({}, '', window.location.pathname);
      
      alert('Token processing failed. Please try logging in again.');
      return false;
    }
  }
  
  console.log('로그인 상태를 확인할 수 없음');
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
      // ASCII 문자만 포함된 안전한 URL로 리다이렉트
      window.location.href = '/login';
    }
    return false;
  }
  return true;
}

// 로그인 성공 후 메인 페이지로 이동
export function redirectToMain(): void {
  if (typeof window !== 'undefined') {
    // ASCII 문자만 포함된 안전한 URL로 리다이렉트
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

