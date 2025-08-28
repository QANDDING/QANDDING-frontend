'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { questionApi } from '@/lib/api';
import type { PaginatedResponse, QuestionListItem, QuestionListParams } from '@/types/types';
import { formatKST } from '@/lib/datetime';

export default function Home() {
  const router = useRouter();
  const [preview, setPreview] = useState<Array<{ id: string; title: string; authorNickname?: string; createdAt?: string; hasAiAnswer?: boolean; hasMemberAnswer?: boolean; isAdopted?: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 인증 상태 확인
    if (isAuthenticated()) {
      // 이미 인증된 상태라면 페이지 유지
      // 게시판 미리보기 로드
      (async () => {
        try {
          const params: QuestionListParams = { page: 0, size: 7, status: 'ALL' };
          const res: PaginatedResponse<QuestionListItem> = await questionApi.getList(params);
          const items = (res.content || []).map((q: QuestionListItem) => {
            const r = q as unknown as Record<string, unknown>;
            const normFlag = (keys: string[]) => {
              for (const k of keys) {
                const v = r[k];
                if (typeof v === 'boolean') return v;
                if (typeof v === 'number') return v > 0;
              }
              return false;
            };
            return {
              id: String(q.id),
              title: q.title,
              authorNickname: q.authorNickname || '',
              createdAt: q.createdAt,
              hasAiAnswer: normFlag(['hasAiAnswer', 'aiAnswered', 'hasAi', 'aiAnswerCount']),
              hasMemberAnswer: normFlag(['hasMemberAnswer', 'hasUserAnswer', 'userAnswered', 'memberAnswered', 'memberAnswerCount', 'userAnswerCount']),
              isAdopted: normFlag(['isAdopted', 'adopted', 'isSelected', 'hasAdopted']),
            };
          });
          setPreview(items);
        } finally {
          setLoading(false);
        }
      })();
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
        <div className='md:col-span-1 space-y-8'>
          <Link
            href='/ask'
            className='h-56 rounded-3xl bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center text-gray-700'>
            질문하기
          </Link>
          <Link
            href='/history'
            className='h-56 rounded-3xl bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center text-gray-700'>
            히스토리
          </Link>
        </div>
        <div className='rounded-3xl bg-white border flex flex-col md:col-span-1'>
          <div className='px-5 py-4 border-b flex items-center justify-between'>
            <h2 className='text-sm font-semibold text-gray-900'>게시판 미리보기</h2>
            <Link href='/board' className='text-xs text-blue-600 hover:underline'>전체 보기</Link>
          </div>
          <div>
            {loading ? (
              <ul className='divide-y'>
                {Array.from({ length: 7 }).map((_, i) => (
                  <li key={i} className='p-3 animate-pulse'>
                    <div className='h-4 bg-gray-200 rounded w-3/4 mb-2' />
                    <div className='h-3 bg-gray-100 rounded w-1/3' />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className='divide-y'>
                {preview.map((item) => (
                  <li key={item.id} className='p-3 hover:bg-gray-50'>
                    <Link href={`/board/${item.id}`} className='block'>
                      <div className='flex items-start justify-between'>
                        <div className='min-w-0 pr-2'>
                          <div className='text-sm font-medium text-gray-900 truncate'>{item.title}</div>
                          <div className='text-[11px] text-gray-500 mt-0.5'>
                            <span>{item.authorNickname || '사용자'}</span>
                            {item.createdAt && <span className='ml-2'>{formatKST(item.createdAt)}</span>}
                          </div>
                        </div>
                        <div className='flex items-center gap-1 shrink-0'>
                          {item.isAdopted && (
                            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800'>채택</span>
                          )}
                          {item.hasMemberAnswer && (
                            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800'>선배</span>
                          )}
                          {item.hasAiAnswer && (
                            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800'>AI</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
                {preview.length === 0 && (
                  <li className='p-6 text-sm text-gray-500'>표시할 게시글이 없습니다.</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
