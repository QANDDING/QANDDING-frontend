'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, isAuthenticatedWithServer, handleTokenExpired } from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1단계: 로컬 인증 상태 확인
        if (!isAuthenticated()) {
          console.log('로컬 인증 정보 없음 - 로그인 페이지로 이동');
          setIsAuth(false);
          router.push('/login');
          return;
        }

        // 2단계: 서버에서 토큰 유효성 검증
        console.log('서버에서 토큰 유효성 검증 중...');
        const serverAuth = await isAuthenticatedWithServer();
        
        if (serverAuth) {
          console.log('서버 인증 확인 완료');
          setIsAuth(true);
        } else {
          console.log('서버에서 토큰 무효 확인됨 - 로그인 페이지로 이동');
          setIsAuth(false);
          // isAuthenticatedWithServer에서 이미 토큰 정리 및 리다이렉트 처리됨
        }
      } catch (error) {
        console.error('인증 확인 중 에러:', error);
        // 에러 발생 시 토큰 정리 및 로그인 페이지로 이동
        handleTokenExpired();
        setIsAuth(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // 로딩 중일 때 fallback 표시
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 인증된 경우에만 children 렌더링
  if (isAuth) {
    return <>{children}</>;
  }

  // 인증되지 않은 경우 null 반환 (로그인 페이지로 리다이렉트됨)
  return null;
}

// 간단한 인증 확인 훅
export function useAuth() {
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const auth = isAuthenticated();
      setIsAuth(auth);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  return { isAuth, isLoading };
} 