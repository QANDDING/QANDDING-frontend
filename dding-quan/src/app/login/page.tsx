"use client";

import Link from 'next/link';
import { useEffect } from 'react';
import { userApi, startGoogleLogin } from '../../lib/api';
import { saveAuthUser, isAuthenticated, isAuthenticatedWithServer, redirectToMain } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const checkExistingAuth = async () => {
      console.log('로그인 페이지 로드됨');
      
      // 로컬 토큰이 없으면 바로 로그인 대기
      if (!isAuthenticated()) {
        console.log('저장된 토큰이 없어 로그인이 필요합니다.');
        return;
      }

      try {
        console.log('기존 세션 서버 검증 중...');
        const serverAuth = await isAuthenticatedWithServer();
        
        if (serverAuth) {
          console.log('기존 세션 유효 확인됨, 메인 페이지로 이동');
          redirectToMain();
        } else {
          console.log('기존 세션 만료됨, 로그인 필요');
          // isAuthenticatedWithServer에서 이미 토큰 정리됨
        }
      } catch (error) {
        console.log('기존 세션 확인 중 에러:', error);
        // 에러 발생 시에는 로그인 대기 상태 유지
      }
    };

    checkExistingAuth();
  }, [router]);

  return (
    <main className='min-h-screen flex items-center justify-center bg-gray-50 px-6'>
      <div className='w-full max-w-sm rounded-xl bg-white border p-6 space-y-6'>
        <div className='text-center space-y-1'>
          <h1 className='text-xl font-semibold'>로그인</h1>
          <p className='text-sm text-gray-500'>Google 계정으로 로그인하세요</p>
        </div>
        <button
          type='button'
          onClick={() => {
            startGoogleLogin();
          }}
          className='flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-white border hover:bg-gray-50 text-gray-800'
        >
          <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' className='w-5 h-5'>
            <path fill='#FFC107' d='M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.529,6.053,29.005,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z'/>
            <path fill='#FF3D00' d='M6.306,14.691l6.571,4.819C14.655,16.108,18.961,14,24,14c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657 C33.529,6.053,29.005,4,24,4C16.318,4,9.656,8.337,6.306,14.691z'/>
            <path fill='#4CAF50' d='M24,44c4.943,0,9.409-1.896,12.777-4.993l-5.894-5.001C29.813,35.091,27.062,36,24,36 c-5.202,0-9.619-3.317-11.281-7.946l-6.536,5.036C9.53,39.556,16.227,44,24,44z'/>
            <path fill='#1976D2' d='M43.611,20.083H42V20H24v8h11.303c-0.793,2.238-2.231,4.166-4.103,5.589 c0.001-0.001,0.002-0.001,0.003-0.002l5.894,5.001C36.896,39.243,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z'/>
          </svg>
          <span>Google로 로그인</span>
        </button>
        
        {/* 디버깅용 임시 버튼 */}
        <button
          type='button'
          onClick={() => {
            const BASE_URL = process.env.NEXT_PUBLIC_API_SERVER_URL;
            const loginUrl = `${BASE_URL}/login/oauth2/code/google`;
            console.log('직접 URL 테스트 시작');
            alert(`리다이렉트 URL 테스트를 시작합니다.\n\n브라우저 콘솔을 확인하세요.`);
            window.open(loginUrl, '_blank');
          }}
          className='w-full px-4 py-2 text-sm bg-gray-100 border rounded-md hover:bg-gray-200 text-gray-600'
        >
          🔧 디버그: URL 직접 테스트
        </button>
        <div className='pt-2 text-center'>
          <Link href='/' className='text-sm text-blue-600 hover:underline'>
            로그인되었나요? 메인으로 이동
          </Link>
        </div>
      </div>
    </main>
  );
}
