'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { handleGoogleLoginCallback, redirectToMain } from '@/lib/auth';

export default function OAuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    console.log('=== OAuth 콜백 페이지 로드됨 ===');
    console.log('현재 URL:', window.location.href);
    
    // URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    console.log('URL 파라미터들:', {
      success: urlParams.get('success'),
      needsProfile: urlParams.get('needsProfile'),
      accessToken: urlParams.get('accessToken') ? '있음' : '없음',
      refreshToken: urlParams.get('refreshToken') ? '있음' : '없음',
      error: urlParams.get('error'),
      errorType: urlParams.get('errorType')
    });
    
    // 구글 로그인 콜백 처리
    console.log('콜백 처리 시작...');
    const callbackResult = handleGoogleLoginCallback();
    console.log('콜백 처리 결과:', callbackResult);
    
    if (callbackResult) {
      console.log('OAuth 콜백 처리 성공, 메인 페이지로 이동');
      // 성공 시 메인 페이지로 이동
      setTimeout(() => {
        redirectToMain();
      }, 1000); // 1초 후 이동 (로그 확인 시간)
    } else {
      console.log('OAuth 콜백 처리 실패 또는 에러, 로그인 페이지로 이동');
      // 실패 시 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login');
      }, 2000); // 2초 후 이동 (에러 확인 시간)
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Processing login...</p>
        <p className="text-sm text-gray-400 mt-2">Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
} 