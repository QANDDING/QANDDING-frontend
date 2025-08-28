'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { questionApi } from '@/lib/api';
import type { PaginatedResponse, QuestionListItem, QuestionListParams } from '@/types/types';
import { formatKST } from '@/lib/datetime';
import { FileQuestionMark, History, BookOpen, BotMessageSquare  } from 'lucide-react';

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

  // iframe 컴포넌트들을 메모이제이션하여 한 번만 생성
  const askIframe = useMemo(() => (
    <iframe 
      src='/ask'
      className='w-full h-full border-0 pointer-events-none'
      style={{
        transform: 'scale(0.25)',
        transformOrigin: 'top left',
        width: '400%',
        height: '400%'
      }}
      title='질문하기 페이지 미리보기'
    />
  ), []);

  const aiAnswerIframe = useMemo(() => (
    <iframe 
      src='/aianswer'
      className='w-full h-full border-0 pointer-events-none'
      style={{
        transform: 'scale(0.25)',
        transformOrigin: 'top left',
        width: '400%',
        height: '400%'
      }}
      title='AI 답변 받기 페이지 미리보기'
    />
  ), []);

  const historyIframe = useMemo(() => (
    <iframe 
      src='/history'
      className='w-full h-full border-0 pointer-events-none'
      style={{
        transform: 'scale(0.25)',
        transformOrigin: 'top left',
        width: '400%',
        height: '400%'
      }}
      title='히스토리 페이지 미리보기'
    />
  ), []);

  return (
    <main className='mx-auto max-w-5xl px-6 py-10'>
      <p className='text-sm text-gray-600 mb-6'>모르는 문제는 질문하고 선배님과 AI 답변을 받아보세요</p>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {/* 질문하기 페이지 미리보기 */}
        <div className='group rounded-2xl bg-white border hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden'>
          <div className='p-4 border-b bg-blue-50'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2 text-blue-700'>
                <FileQuestionMark size={16} />
                <span className='text-sm font-medium'>질문하기</span>
              </div>
              <Link href='/ask' className='text-xs text-blue-600 hover:underline'>
                이동 →
              </Link>
            </div>
          </div>
          <div className='relative h-48 bg-gray-50'>
            {askIframe}
            <Link 
              href='/ask'
              className='absolute inset-0 bg-transparent hover:bg-blue-50/20 transition-colors'
              aria-label='질문하기 페이지로 이동'
            />
          </div>
        </div>

        {/* 게시판 페이지 미리보기 */}
        <div className='group rounded-2xl bg-white border hover:border-green-300 hover:shadow-lg transition-all duration-200 overflow-hidden'>
          <div className='p-4 border-b bg-green-50'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2 text-green-700'>
                <BotMessageSquare  size={16} />
                <span className='text-sm font-medium'>AI 답변 받기</span>
              </div>
              <Link href='/aianswer' className='text-xs text-green-600 hover:underline'>
                이동 →
              </Link>
            </div>
          </div>
          <div className='relative h-48 bg-gray-50'>
            {aiAnswerIframe}
            <Link 
              href='/aianswer'
              className='absolute inset-0 bg-transparent hover:bg-green-50/20 transition-colors'
              aria-label='AI 답변 받기 페이지로 이동'
            />
          </div>
        </div>

        {/* 히스토리 페이지 미리보기 */}
        <div className='group rounded-2xl bg-white border hover:border-purple-300 hover:shadow-lg transition-all duration-200 overflow-hidden'>
          <div className='p-4 border-b bg-purple-50'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2 text-purple-700'>
                <History size={16} />
                <span className='text-sm font-medium'>히스토리</span>
              </div>
              <Link href='/history' className='text-xs text-purple-600 hover:underline'>
                이동 →
              </Link>
            </div>
          </div>
          <div className='relative h-48 bg-gray-50'>
            {historyIframe}
            <Link 
              href='/history'
              className='absolute inset-0 bg-transparent hover:bg-purple-50/20 transition-colors'
              aria-label='히스토리 페이지로 이동'
            />
          </div>
        </div>
      </div>

      {/* 게시판 미리보기 섹션 */}
      <div className='mt-12'>
        <div className='rounded-2xl bg-white border'>
          <div className='px-6 py-4 border-b flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
              <BookOpen size={20} />
              최근 질문들
            </h2>
            <Link href='/board' className='text-sm text-blue-600 hover:underline flex items-center gap-1'>
              전체 보기 →
            </Link>
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
