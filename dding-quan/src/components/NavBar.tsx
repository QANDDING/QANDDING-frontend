'use client';

import Link from "next/link";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logout, refreshAccessToken, getAccessToken, getAuthUser } from '@/lib/auth';

export default function NavBar() {
  const router = useRouter();
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'valid' | 'expired' | 'none'>('checking');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 토큰 상태 확인
  useEffect(() => {
    const checkTokenStatus = () => {
      const token = getAccessToken();
      const user = getAuthUser();
      
      if (!token || !user) {
        setTokenStatus('none');
        return;
      }

      try {
        // JWT 토큰 만료 시간 확인
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp < currentTime) {
            setTokenStatus('expired');
          } else {
            setTokenStatus('valid');
          }
        } else {
          setTokenStatus('valid'); // JWT가 아닌 경우 일단 유효한 것으로 처리
        }
      } catch (error) {
        console.error('토큰 파싱 에러:', error);
        setTokenStatus('valid');
      }
    };

    checkTokenStatus();
    // 1분마다 토큰 상태 재확인
    const interval = setInterval(checkTokenStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      console.log('수동 토큰 갱신 시도...');
      const success = await refreshAccessToken();
      
      if (success) {
        setTokenStatus('valid');
        alert('토큰 갱신 성공! 🎉');
      } else {
        setTokenStatus('expired');
        alert('토큰 갱신 실패. 다시 로그인해주세요.');
        handleLogout();
      }
    } catch (error) {
      console.error('토큰 갱신 에러:', error);
      alert('토큰 갱신 중 에러가 발생했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTokenStatusInfo = () => {
    switch (tokenStatus) {
      case 'valid': 
        return { color: 'text-green-600', text: '✓', title: '토큰 유효' };
      case 'expired': 
        return { color: 'text-red-600', text: '⚠', title: '토큰 만료' };
      case 'none': 
        return { color: 'text-gray-400', text: '✗', title: '토큰 없음' };
      default: 
        return { color: 'text-yellow-600', text: '⏳', title: '확인 중' };
    }
  };

  const statusInfo = getTokenStatusInfo();

  return (
    <header className="w-full flex items-center justify-between px-6 py-4">
      {/* 로고 */}
      <div className="text-xl font-bold text-gray-900">
        띵콴
      </div>
      
      {/* 네비게이션 메뉴 */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
        >
          home
        </Link>
        <Link
          href="/ask"
          className="rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
        >
          질문
        </Link>
        <Link
          href="/board"
          className="rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
        >
          게시판
        </Link>
        <Link
          href="/history"
          className="rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
        >
          히스토리
        </Link>
        
        {/* 토큰 상태 및 갱신 버튼 */}
        {tokenStatus !== 'none' && (
          <div className="flex items-center gap-2 ml-2">
            <span 
              className={`text-sm ${statusInfo.color}`}
              title={statusInfo.title}
            >
              {statusInfo.text}
            </span>
            
            {(tokenStatus === 'expired' || tokenStatus === 'valid') && (
              <button
                onClick={handleRefreshToken}
                disabled={isRefreshing}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  isRefreshing 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : tokenStatus === 'expired'
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
                title={isRefreshing ? '갱신 중...' : '토큰 갱신'}
              >
                {isRefreshing ? '⏳' : '🔄'}
              </button>
            )}
          </div>
        )}
        
        {/* 로그아웃 버튼 */}
        <button
          onClick={handleLogout}
          className="rounded-full bg-red-100 text-red-700 px-4 py-1 text-sm font-medium hover:bg-red-200"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}