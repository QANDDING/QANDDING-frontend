"use client";

import Link from 'next/link';
import { useEffect } from 'react';
import { userApi, startGoogleLogin } from '../../lib/api';
import { saveAuthUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // 로그인된 세션이 이미 있으면 메인으로 이동
    (async () => {
      try {
        const me = await userApi.getProfile();
        if (me && me.id) {
          saveAuthUser(me);
          // 로그인 성공 시 바로 메인 페이지로 이동
          router.replace('/');
        }
      } catch {}
    })();
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
        <div className='pt-2 text-center'>
          <Link href='/' className='text-sm text-blue-600 hover:underline'>
            로그인되었나요? 메인으로 이동
          </Link>
        </div>
      </div>
    </main>
  );
}
