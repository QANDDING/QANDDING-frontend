'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 인증 상태 확인
    if (isAuthenticated()) {
      // 이미 인증된 상태라면 페이지 유지
      return;
    } else {
      // 토큰이 없으면 로그인 페이지로 이동
      router.push('/login');
    }
  }, [router]);
  return (
    <main className='mx-auto max-w-5xl px-6 py-10'>
      <p className='text-sm text-gray-600 mb-6'>궁금한 건 무엇이든 질문해보세요!</p>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <Link
          href='/ask'
          className='h-56 rounded-3xl bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center text-gray-700'>
          질문하기
        </Link>
        <Link
          href='/board'
          className='h-56 rounded-3xl bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center text-gray-700'>
          게시판
        </Link>
        <Link
          href='/history'
          className='h-80 rounded-3xl bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center text-gray-700 md:col-span-1'>
          히스토리
        </Link>
        <div className='h-80 rounded-3xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400'>
          준비중
        </div>
      </div>
    </main>
  );
}
