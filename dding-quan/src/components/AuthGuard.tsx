'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, checkAuthAndRedirect } from '@/lib/auth';

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
      // 인증 상태 확인
      const authStatus = checkAuthAndRedirect();
      
      if (authStatus === 'authenticated') {
        setIsAuth(true);
      } else {
        // 인증되지 않은 경우 로그인 페이지로 이동
        router.push('/login');
      }
      
      setIsLoading(false);
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