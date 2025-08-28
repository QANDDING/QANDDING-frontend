"use client";
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { formatKST } from '@/lib/datetime';
import { questionApi, professorApi, subjectsApi, answerApi } from '@/lib/api';
import type { QuestionListItem, PaginatedResponse, QuestionListParams } from '@/types/types';
import { isAuthenticated } from '@/lib/auth';
import { useRouter } from 'next/navigation';

type BoardItem = {
  id: string;
  title: string;
  subjectName: string;
  authorNickname?: string;
  professorName?: string;
  createdAt?: string;
  hasAiAnswer?: boolean;
  hasMemberAnswer?: boolean;
  isAdopted?: boolean;
};

type Professor = import('@/types/types').Professor;

export default function BoardHistoryPage() {
  const router = useRouter();
  const [data, setData] = useState<{ items: BoardItem[] }>({ items: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [subjectInput, setSubjectInput] = useState('');
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [isLoadingProf, setIsLoadingProf] = useState(false);
  const [subjectResults, setSubjectResults] = useState<Array<{ id: number; name: string }>>([]);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [isLoadingSubject, setIsLoadingSubject] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const subjectBoxRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isFirst, setIsFirst] = useState(true);
  const [isLast, setIsLast] = useState(true);
  const size = 10;
  const [searchDraft, setSearchDraft] = useState('');
  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const [countLoading, setCountLoading] = useState<Record<string, boolean>>({});

  // 질문 목록 데이터 로드
  useEffect(() => {
    // 인증 상태 확인
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const params: QuestionListParams = { page, size };
        if (typeof selectedSubjectId === 'number') params.subjectId = selectedSubjectId;
        if (selectedProfessorId) params.professorId = Number(selectedProfessorId);
        if (searchTerm) params.keyword = searchTerm;
        const statusMap: Record<string, string> = {
          all: 'ALL',
          answered: 'ANSWERED',
          unanswered: 'UNANSWERED',
          adopted: 'ADOPTED',
        };
        params.status = (statusMap[selectedCategory] as QuestionListParams['status']) || 'ALL';
        const result: PaginatedResponse<QuestionListItem> = await questionApi.getList(params);
        if (!mounted) return;
        const items: BoardItem[] = (result.content || []).map((q: QuestionListItem) => {
          const r = q as unknown as Record<string, unknown>;
          const normFlag = (keys: string[]) => {
            for (const k of keys) {
              const v = r[k];
              if (typeof v === 'boolean') return v;
              if (typeof v === 'number') return v > 0;
            }
            return false;
          };
          const hasMember = normFlag([
            'hasMemberAnswer', 'hasUserAnswer', 'userAnswered', 'memberAnswered',
            'memberAnswerCount', 'userAnswerCount',
          ]);
          const hasAi = normFlag(['hasAiAnswer', 'aiAnswered', 'hasAi', 'aiAnswerCount']);
          const isAdopted = normFlag(['isAdopted', 'adopted', 'isSelected', 'hasAdopted']);
          return {
            id: String(q.id),
            title: q.title,
            subjectName: q.subjectName || '',
            authorNickname: q.authorNickname || '',
            professorName: q.professorName || '',
            createdAt: q.createdAt,
            hasAiAnswer: hasAi,
            hasMemberAnswer: hasMember,
            isAdopted: isAdopted,
          };
        });
        setData({ items });
        setTotalPages(result.totalPages ?? 0);
        setIsFirst(result.first ?? true);
        setIsLast(result.last ?? true);
      } catch (e) {
        console.error(e);
        if (e instanceof Error && e.message === 'Authentication required') {
          console.log('Authentication required, redirecting to login');
          window.location.href = '/login';
          return;
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, selectedSubjectId, selectedProfessorId, page, selectedCategory, searchTerm]);

  const categories = [
    { id: 'all', name: '전체' },
    { id: 'answered', name: '답변완료' },
    { id: 'unanswered', name: '미답변' },
    { id: 'adopted', name: '채택됨' },
  ];

  const filteredItems = data.items.filter((item) => {
    if (selectedCategory === 'answered') {
      return !!(item.hasMemberAnswer || item.hasAiAnswer);
    }
    if (selectedCategory === 'unanswered') {
      return !item.hasMemberAnswer;
    }
    if (selectedCategory === 'adopted') {
      return !!item.isAdopted;
    }
    return true; // 전체
  });

  const filteredProfessors = professors;

  // 과목 자동완성: 입력 디바운스 검색
  useEffect(() => {
    const q = subjectInput.trim();
    setHighlightedIndex(-1);
    if (q.length < 1) {
      setSubjectResults([]);
      setShowSubjectDropdown(false);
      setSelectedSubjectId(null);
      setSelectedProfessorId('');
      setProfessors([]);
      setPage(0);
      return;
    }
    setShowSubjectDropdown(true);
    setIsLoadingSubject(true);
    const t = setTimeout(async () => {
      try {
        const results = await subjectsApi.search(q);
        setSubjectResults((results || []).slice(0, 20));
      } catch (e) {
        console.error(e);
        setSubjectResults([]);
      } finally {
        setIsLoadingSubject(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [subjectInput]);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!subjectBoxRef.current) return;
      if (!subjectBoxRef.current.contains(e.target as Node)) {
        setShowSubjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // 보이는 목록의 사용자 답변 수 로드
  useEffect(() => {
    const ids = filteredItems.map((i) => i.id);
    ids.forEach((id) => {
      if (answerCounts[id] !== undefined || countLoading[id]) return;
      setCountLoading((prev) => ({ ...prev, [id]: true }));
      answerApi
        .getCombined(Number(id), 0, 1)
        .then((res: { users?: { totalElements?: number } }) => {
          const total = res.users?.totalElements ?? 0;
          setAnswerCounts((prev) => ({ ...prev, [id]: Number(total) || 0 }));
        })
        .catch(() => {
          setAnswerCounts((prev) => ({ ...prev, [id]: 0 }));
        })
        .finally(() => {
          setCountLoading((prev) => ({ ...prev, [id]: false }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems]);

  const handleSelectSubject = async (subject: { id: number; name: string }) => {
    setSubjectInput(subject.name);
    setSelectedSubjectId(subject.id);
    setShowSubjectDropdown(false);
    setSelectedProfessorId('');
    setIsLoadingProf(true);
    try {
      const profs = await professorApi.getBySubjectId(subject.id);
      setProfessors(profs || []);
    } catch (e) {
      console.error(e);
      setProfessors([]);
    } finally {
      setIsLoadingProf(false);
    }
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 섹션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 pt-3 pb-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">게시판 히스토리</h1>
              <p className="text-gray-600">모든 질문들의 기록을 확인해보세요.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link 
                href='/ask' 
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                질문하기
              </Link>
            </div>
          </div>

          {/* 질문 검색하기 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">질문 검색하기</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="relative" ref={subjectBoxRef}>
                <input
                  type="text"
                  placeholder="과목을 입력하세요 (예: 자료구조)"
                  value={subjectInput}
                  onChange={(e) => {
                    setSubjectInput(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (!showSubjectDropdown && e.key !== 'Escape') setShowSubjectDropdown(true);
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedIndex((i) => Math.min(i + 1, subjectResults.length - 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedIndex((i) => Math.max(i - 1, 0));
                    } else if (e.key === 'Enter') {
                      if (highlightedIndex >= 0 && highlightedIndex < subjectResults.length) {
                        const s = subjectResults[highlightedIndex];
                        handleSelectSubject(s);
                      }
                    } else if (e.key === 'Escape') {
                      setShowSubjectDropdown(false);
                    }
                  }}
                  className="w-full px-4 py-3 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {showSubjectDropdown && (
                  <div className="absolute left-0 right-0 mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {isLoadingSubject && (
                      <div className="px-3 py-2 text-sm text-gray-500">검색 중...</div>
                    )}
                    {!isLoadingSubject && (
                      subjectResults.length > 0 ? (
                        <ul className="py-1">
                          {subjectResults.map((s, idx) => (
                            <li
                              key={s.id}
                              className={`px-3 py-2 text-sm text-gray-900 cursor-pointer hover:bg-gray-50 ${idx === highlightedIndex ? 'bg-gray-100' : ''}`}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              onMouseLeave={() => setHighlightedIndex(-1)}
                              onClick={() => handleSelectSubject(s)}
                            >
                              {s.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">검색 결과가 없습니다</div>
                      )
                    )}
                  </div>
                )}
              </div>
              <select
                value={selectedProfessorId}
                onChange={(e) => { setSelectedProfessorId(e.target.value); setPage(0); }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">{isLoadingProf ? '불러오는 중...' : '교수님을 선택하세요'}</option>
                {filteredProfessors.map((p) => (
                  <option key={p.id} value={p.id}>{`${p.name}`}</option>
                ))}
              </select>

              {/* 키워드 검색 입력 + 버튼 */}
              <div className="relative md:col-span-2">
                <input
                  type="text"
                  placeholder="키워드 입력"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setSearchTerm(searchDraft.trim()); setPage(0); } }}
                  className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => { setSearchTerm(searchDraft.trim()); setPage(0); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                >
                  검색하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-6 pt-2 pb-6">
        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => { setSelectedCategory(category.id); setPage(0); }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* 질문 목록 - 게시판에서 가져온 핵심 렌더링 부분 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedCategory === 'answered'
                  ? '답변 완료 질문이 없습니다'
                  : selectedCategory === 'unanswered'
                  ? '미답변 질문이 없습니다'
                  : selectedCategory === 'adopted'
                  ? '채택된 질문이 없습니다'
                  : '질문이 없습니다'}
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedCategory === 'answered'
                  ? '필터를 변경하거나 다른 키워드를 검색해보세요.'
                  : selectedCategory === 'unanswered'
                  ? '새 질문을 작성해보세요!'
                  : selectedCategory === 'adopted'
                  ? '필터를 변경하거나 다른 카테고리를 선택해보세요.'
                  : '첫 번째 질문을 작성해보세요!'}
              </p>
              {selectedCategory === 'all' && (
                <Link 
                  href="/ask" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  질문하기
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredItems.map((item: BoardItem) => (
                <li key={item.id} className="hover:bg-gray-50 transition-colors">
                  <Link href={`/board/${item.id}`} className="block p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {item.title}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.isAdopted && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">채택완료</span>
                            )}
                            {item.hasMemberAnswer && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">선배 답변 완료</span>
                            )}
                            {item.hasAiAnswer && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">AI 답변 완료</span>
                            )}
                            {!item.isAdopted && !item.hasMemberAnswer && !item.hasAiAnswer && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">미답변</span>
                            )}
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                              답변 {answerCounts[item.id] ?? (countLoading[item.id] ? '…' : 0)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {item.authorNickname || ''}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {item.subjectName}
                            {item.professorName && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{item.professorName}</span>
                              </>
                            )}
                          </span>
                          {item.createdAt && (
                            <span>{formatKST(item.createdAt)}</span>
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
        {filteredItems.length > 0 && (
          <div className="mt-8 flex items-center justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => !isFirst && setPage((p) => Math.max(p - 1, 0))}
                disabled={isFirst}
                className={`px-3 py-2 text-sm font-medium border rounded-md ${isFirst ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'}`}
              >
                이전
              </button>

              {(() => {
                const pages: number[] = [];
                const max = Math.max(totalPages, 1);
                let start = Math.max(0, page - 1);
                let end = Math.min(max - 1, page + 1);
                if (page === 0) end = Math.min(max - 1, 2);
                if (page === max - 1) start = Math.max(0, max - 3);
                for (let i = start; i <= end; i++) pages.push(i);
                return pages.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-2 text-sm font-medium border rounded-md ${p === page ? 'text-white bg-blue-600 border-blue-600' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'}`}
                  >
                    {p + 1}
                  </button>
                ));
              })()}

              <button
                onClick={() => !isLast && setPage((p) => p + 1)}
                disabled={isLast}
                className={`px-3 py-2 text-sm font-medium border rounded-md ${isLast ? 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed' : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'}`}
              >
                다음
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
