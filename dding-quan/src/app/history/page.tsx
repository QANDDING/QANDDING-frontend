"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { questionApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { useRouter } from 'next/navigation';

type HistoryItem = {
  id: string;
  title: string;
  subject: string;
  content: string;
  createdAt: string;
  hasAnswer?: boolean;
  isAdopted?: boolean;
  professorName?: string;
};

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<{ items: HistoryItem[]; total: number }>({ items: [], total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [page] = useState(1);

  useEffect(() => {
    // 인증 상태 확인
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    let mounted = true;
    (async () => {
      try {
        // 스웨거 명세에 맞춰 page는 0부터 시작
        const result = await questionApi.getList({ page: page - 1, size: PAGE_SIZE });
        if (!mounted) return;
        // 스웨거 명세에 맞춰 content 배열과 totalElements 사용
        setData({ 
          items: (result.content || []) as unknown as HistoryItem[], 
          total: result.totalElements || 0 
        });
        const uniqueSubjects = Array.from(new Set((result.content || []).map((i: { subject: string }) => i.subject)));
        setSubjects(uniqueSubjects);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [page, router]);

 

  const filteredItems = data.items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || item.subject === selectedSubject;
    
    return matchesSearch && matchesSubject;
  });

  const totalPages = Math.max(1, Math.ceil((data?.total || 1) / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageNumbers = Array.from({ length: totalPages }).map((_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 섹션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">내 질문 히스토리</h1>
              <p className="text-gray-600">내가 작성한 질문들을 확인해보세요</p>
            </div>
            <Link 
              href='/ask' 
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              새 질문하기
            </Link>
          </div>

          {/* 검색바 */}
          <div className="relative">
            <input
              type="text"
              placeholder="내 질문을 검색해보세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
        {/* 과목 필터 (API 기반) */}
        {subjects.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {["all", ...subjects].map((subjectId) => (
              <button
                key={subjectId}
                onClick={() => setSelectedSubject(subjectId)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedSubject === subjectId
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {subjectId === 'all' ? '전체' : subjectId}
              </button>
            ))}
          </div>
        )}

        {/* 질문 목록 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">질문이 없습니다</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedSubject !== 'all' 
                  ? '검색 조건에 맞는 질문이 없습니다.' 
                  : '아직 작성한 질문이 없습니다.'}
              </p>
              <Link 
                href="/ask" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                첫 질문 작성하기
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredItems.map((item: HistoryItem) => (
                <li key={item.id} className="hover:bg-gray-50 transition-colors">
                  <Link href={`/history/${item.id}`} className="block p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            {item.hasAnswer && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                답변완료
                              </span>
                            )}
                            {item.isAdopted && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                채택됨
                              </span>
                            )}
                            {!item.hasAnswer && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                미답변
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {item.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="px-2 py-1 bg-gray-100 rounded-full">{item.subject}</span>
                          {('professorName' in item) && (item as { professorName?: string }).professorName && (
                            <span className="px-2 py-1 bg-gray-100 rounded-full">{(item as { professorName?: string }).professorName}</span>
                          )}
                          <span>질문 #{item.id}</span>
                          {item.createdAt && (
                            <>
                              <span>•</span>
                              <span>{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 페이지네이션 */}
        {filteredItems.length > 0 && totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center">
            <nav className="flex items-center space-x-2">
              <Link
                href={`/history?page=${Math.max(1, current - 1)}`}
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
                  href={`/history?page=${pageNum}`}
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
                href={`/history?page=${Math.min(totalPages, current + 1)}`}
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


