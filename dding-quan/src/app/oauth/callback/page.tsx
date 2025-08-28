'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleGoogleLoginCallback } from '@/lib/auth';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('로그인 처리 중...');

  useEffect(() => {
    console.log('OAuth 콜백 페이지 로드됨');

    // 약간의 지연을 두고 콜백 처리 (URL 파라미터가 완전히 로드되도록)
    const timer = setTimeout(() => {
      try {
        console.log('구글 로그인 콜백 처리 시작');

        // 먼저 JWT 토큰 저장 (needsProfile과 관계없이)
        const accessToken = new URLSearchParams(window.location.search).get('accessToken');
        const refreshToken = new URLSearchParams(window.location.search).get('refreshToken');

        if (accessToken) {
          // 토큰 저장
          localStorage.setItem('ACCESS_TOKEN', accessToken);
          if (refreshToken) {
            localStorage.setItem('REFRESH_TOKEN', refreshToken);
          }
          console.log('JWT 토큰 저장 완료');
        }

        // needsProfile 파라미터 체크
        const needsProfile = new URLSearchParams(window.location.search).get('needsProfile') === 'true';

        if (needsProfile) {
          console.log('프로필 완성이 필요함, 온보딩 페이지로 이동');
          setStatus('success');
          setMessage('프로필 정보를 완성해주세요.');

          setTimeout(() => {
            router.replace('/onboarding');
          }, 1500);
          return;
        }

        // needsProfile=false인 경우 success=true로 설정하여 handleGoogleLoginCallback이 정상 작동하도록 함
        if (needsProfile === false) {
          const url = new URL(window.location.href);
          url.searchParams.set('success', 'true');
          window.history.replaceState({}, '', url.toString());
        }

        const success = handleGoogleLoginCallback();

        if (success) {
          console.log('로그인 성공, 메인 페이지로 이동');
          setStatus('success');
          setMessage('로그인 성공! 메인 페이지로 이동합니다...');

          // 성공 시 메인 페이지로 이동
          setTimeout(() => {
            router.replace('/');
          }, 1500);
        } else {
          console.log('로그인 실패');
          setStatus('error');
          setMessage('로그인에 실패했습니다. 다시 시도해주세요.');

          // 실패 시 로그인 페이지로 이동
          setTimeout(() => {
            router.replace('/login');
          }, 3000);
        }
      } catch (error) {
        console.error('콜백 처리 중 에러:', error);
        setStatus('error');
        setMessage('로그인 처리 중 오류가 발생했습니다.');

        setTimeout(() => {
          router.replace('/login');
        }, 3000);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center'>
        <div className='mb-6'>
          {status === 'processing' && <div className='animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4'></div>}

          {status === 'success' && (
            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg className='w-8 h-8 text-green-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
              </svg>
            </div>
          )}

          {status === 'error' && (
            <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <svg className='w-8 h-8 text-red-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </div>
          )}
        </div>

        <h2 className='text-xl font-semibold text-gray-800 mb-2'>
          {status === 'processing' && '로그인 처리 중'}
          {status === 'success' && '로그인 성공!'}
          {status === 'error' && '로그인 실패'}
        </h2>

        <p className='text-gray-600'>{message}</p>

        {status === 'error' && (
          <button onClick={() => router.push('/login')} className='mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors'>
            로그인 페이지로 돌아가기
          </button>
        )}
      </div>
    </div>
  );
}
