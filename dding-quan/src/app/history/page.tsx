"use client";

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { historyApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatKST } from '@/lib/datetime';


type HistoryItem = {
  postType: 'QUESTION' | 'ANSWER';
  postId: number;
  title: string;
  createdAt: string;
  originalQuestionId?: number | null;
};

const PAGE_SIZE = 10;

function HistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<{ items: HistoryItem[]; total: number; totalPages: number }>({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Swagger 상 서버 필터/검색 미지원 → 클라이언트에서만 필터/검색 유지
  const [searchTerm, setSearchTerm] = useState('');
  const typeFilter = useMemo(() => {
    const t = (searchParams.get('type') || 'ALL').toUpperCase();
    return t === 'QUESTION' || t === 'ANSWER' ? t : 'ALL';
  }, [searchParams]);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const keyword = (searchParams.get('q') || '').trim();
  const hasClientFilter = !!keyword || typeFilter !== 'ALL';
  const effectivePage = hasClientFilter ? 1 : page;

  // 검색/타입 필터가 활성화되면 항상 페이지를 1로 강제
  useEffect(() => {
    if (hasClientFilter && page !== 1) {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set('page', '1');
      router.replace(`/history?${sp.toString()}`);
    }
  }, [hasClientFilter, page, router, searchParams]);

  useEffect(() => {
    // 인증 상태 확인
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        // 서버 필터링 사용: page/size + (keyword, postType)
        const typeParam = (searchParams.get('type') || '').toUpperCase();
        const postType = typeParam === 'QUESTION' || typeParam === 'ANSWER' ? (typeParam as 'QUESTION' | 'ANSWER') : undefined;
        const result = await historyApi.getMyPosts(effectivePage - 1, PAGE_SIZE, { keyword, postType });
        if (!mounted) return;
        setData({ 
          items: (result.posts || []) as unknown as HistoryItem[], 
          total: result.totalElements || 0,
          totalPages: result.totalPages || 1,
        });
        setSearchTerm(keyword);
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      }
      finally { if (mounted) setLoading(false); }
    })();
    return () => {
      mounted = false;
    };
  }, [effectivePage, keyword, router, searchParams]);

 

  const setQuery = (next: { page?: number; q?: string; type?: string }) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (next.page !== undefined) sp.set('page', String(next.page));
    if (next.q !== undefined) {
      const v = next.q.trim();
      if (v) sp.set('q', v); else sp.delete('q');
      sp.set('page', '1');
    }
    if (next.type !== undefined) {
      const v = next.type;
      if (v && v !== 'ALL') sp.set('type', v); else sp.delete('type');
      sp.set('page', '1');
    }
    router.push(`/history?${sp.toString()}`);
  };

  const totalPages = Math.max(1, data.totalPages || 1);
  const current = Math.min(page, totalPages);
  const pageNumbers = Array.from({ length: totalPages }).map((_, i) => i + 1);
  const buildHref = (p: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('page', String(p));
    return `/history?${sp.toString()}`;
  };

  // 클라이언트 보정 필터: 서버가 적용 안될 때도 대비
  const filteredItems = useMemo(() => {
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const t = typeFilter;
    return (data.items || []).filter((it) => {
      if (t !== 'ALL' && it.postType !== t) return false;
      if (q && !(it.title || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.items, searchParams, typeFilter]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 섹션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">내 히스토리</h1>
              <p className="text-gray-600">내가 작성한 질문/답변을 확인해보세요</p>
            </div>
            <Link 
              href='/ask' 
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              새 질문하기
            </Link>
          </div>
          {/* 검색바 (클라이언트 필터) */}
          <div className="relative">
            <input
              type="text"
              placeholder="내 글 제목에서 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') setQuery({ q: searchTerm }); }}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setQuery({ q: searchTerm })}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
            >검색</button>
            <svg 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 글 타입 필터 (클라이언트 필터) */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'ALL', name: '전체' },
            { id: 'QUESTION', name: '질문' },
            { id: 'ANSWER', name: '답변' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setQuery({ type: t.id })}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                ((searchParams.get('type') || 'ALL').toUpperCase() === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50')
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* 질문 목록 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-600">불러오는 중…</div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">목록을 불러오지 못했습니다</h3>
              <p className="text-gray-600 mb-4 break-all">{error}</p>
              <button onClick={() => router.refresh()} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">다시 시도</button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">작성한 글이 없습니다</h3>
              <p className="text-gray-600 mb-4">검색/필터 조건에 맞는 결과가 없습니다.</p>
              <Link 
                href="/ask" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                첫 질문 작성하기
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredItems.map((item: HistoryItem, idx) => {
                const isAnswer = item.postType === 'ANSWER';
                const targetId = isAnswer ? (item.originalQuestionId || item.postId) : item.postId;
                return (
                <li key={`${item.postType}-${item.postId}-${idx}`} className="hover:bg-gray-50 transition-colors">
                  <Link href={`/board/${targetId}${isAnswer ? `#answer-${item.postId}` : ''}`} className="block p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${isAnswer ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                              {isAnswer ? 'A' : 'Q'}
                            </span>
                            <span className="truncate">{item.title}</span>
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>#{item.postId}</span>
                          {item.createdAt && (
                            <>
                              <span>•</span>
                              <span>{formatKST(item.createdAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2 flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isAnswer ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {isAnswer ? '내 답변' : '내 질문'}
                        </span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </li>
              )})}
            </ul>
          )}
        </div>

        {/* 페이지네이션 */}
        {filteredItems.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center">
            <nav className="flex items-center space-x-2">
              <Link
                href={buildHref(Math.max(1, current - 1))}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  current === 1
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                이전
              </Link>
              
              {pageNumbers.map((pageNum) => (
                <Link
                  key={pageNum}
                  href={buildHref(pageNum)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pageNum === current
                      ? 'text-white bg-blue-600 border border-blue-600'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </Link>
              ))}
              
              <Link
                href={buildHref(Math.min(totalPages, current + 1))}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  current === totalPages
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                다음
              </Link>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50"><div className="max-w-4xl mx-auto px-6 py-12 text-gray-600">로딩 중…</div></div>}>
      <HistoryContent />
    </Suspense>
  );
}
