"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { questionApi, professorApi, subjectsApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { useRouter } from 'next/navigation';

type BoardItem = {
  id: string;
  title: string;
  subject: string;
  hasAnswer?: boolean;
  isAdopted?: boolean;
  createdAt?: string;
  professorName?: string;
};

  type Professor = import('@/types/types').Professor;

export default function BoardPage() {
  const router = useRouter();
  const [data, setData] = useState<{ items: BoardItem[] }>({ items: [] });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [subjectInput, setSubjectInput] = useState('');
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [isLoadingProf, setIsLoadingProf] = useState(false);

  useEffect(() => {
    // 인증 상태 확인
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const result = await questionApi.getList({ page: 0, size: 20 });
        if (!mounted) return;
        // 스웨거 명세에 맞춰 content 배열 사용
        setData({ items: result.content || [] });
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
  }, [router]);

  const categories = [
    { id: 'all', name: '전체' },
    { id: 'answered', name: '답변완료' },
    { id: 'unanswered', name: '미답변' },
    { id: 'adopted', name: '채택됨' },
  ];

  const filteredItems = data.items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = 
      selectedCategory === 'all' ||
      (selectedCategory === 'answered' && item.hasAnswer) ||
      (selectedCategory === 'unanswered' && !item.hasAnswer) ||
      (selectedCategory === 'adopted' && item.isAdopted);
    
    return matchesSearch && matchesCategory;
  });

  const filteredProfessors = professors;
  const selectedProfessor = professors.find((p) => p.id.toString() === selectedProfessorId) || null;

  const handleSubjectSearch = async () => {
    const keyword = subjectInput.trim();
    setSelectedProfessorId('');
    setIsLoadingProf(true);
    try {
      // 모든 과목과 교수를 가져온 후 필터링
      const allSubjects = await subjectsApi.search();
      const filteredSubjects = allSubjects.filter((s: { name: string }) => 
        s.name.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (filteredSubjects.length > 0) {
        const firstSubject = filteredSubjects[0];
        const allProfessors = await professorApi.getBySubjectId();
        // 선택된 과목에 해당하는 교수들만 필터링
        const filteredProfessors = allProfessors.filter((p: { id: number; name: string; subjectId?: number }) => p.subjectId == firstSubject.id);
        setProfessors(filteredProfessors);
      } else {
        setProfessors([]);
      }
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.message === 'Authentication required') {
        console.log('Authentication required, redirecting to login');
        window.location.href = '/login';
        return;
      }
      setProfessors([]);
    } finally {
      setIsLoadingProf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 섹션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">자주 묻는 질문</h1>
              <p className="text-gray-600">질문과 답변을 찾아보세요</p>
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

          {/* 검색바 */}
          <div className="relative">
            <input
              type="text"
              placeholder="질문을 검색해보세요"
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

        {/* 과목별 교수님 찾기 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">과목별 교수님 찾기</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <input
                type="text"
                placeholder="과목을 입력하세요 (예: 자료구조)"
                value={subjectInput}
                onChange={(e) => {
                  setSubjectInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubjectSearch();
                }}
                className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleSubjectSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                aria-label="과목 검색"
              >
                검색
              </button>
            </div>
            <select
              value={selectedProfessorId}
              onChange={(e) => setSelectedProfessorId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">{isLoadingProf ? '불러오는 중...' : '교수님을 선택하세요'}</option>
              {filteredProfessors.map((p) => (
                <option key={p.id} value={p.id}>{`${p.name}`}</option>
              ))}
            </select>
          </div>

          {selectedProfessor && (
            <div className="mt-4 rounded-md bg-gray-50 border border-gray-200 p-4">
              <div className="grid sm:grid-cols-3 gap-3 text-sm text-gray-800">
                <div>
                  <div className="text-gray-500">이름</div>
                  <div className="font-medium">{selectedProfessor.name}</div>
                </div>
                <div>
                  <div className="text-gray-500">담당 과목</div>
                  <div className="font-medium">{selectedProfessor.subjectName}</div>
                </div>
                <div>
                  <div className="text-gray-500">연락처</div>
                  <div className="font-medium">{selectedProfessor.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">이메일</div>
                  <div className="font-medium">{selectedProfessor.email || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500">연구실</div>
                  <div className="font-medium">{selectedProfessor.office || '-'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 카테고리 필터 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
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

        {/* 질문 목록 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">질문이 없습니다</h3>
              <p className="text-gray-600 mb-4">첫 번째 질문을 작성해보세요!</p>
              <Link 
                href="/ask" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                질문하기
            </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredItems.map((item: BoardItem) => (
                <li key={item.id} className="hover:bg-gray-50 transition-colors">
                  <Link href={`/board/${item.id}`} className="block p-6">
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
                        <p className="text-sm text-gray-600 mb-2">
                          {item.subject}
                        </p>
                        <div className="flex items-center text-xs text-gray-500">
                          <span>질문 #{item.id}</span>
                          {item.createdAt && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{item.createdAt}</span>
                            </>
              )}
                          {item.professorName && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{item.professorName}</span>
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
        {filteredItems.length > 0 && (
          <div className="mt-8 flex items-center justify-center">
            <nav className="flex items-center space-x-2">
              <button className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                이전
              </button>
              <button className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md">
                1
              </button>
              <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                2
              </button>
              <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                3
              </button>
              <button className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                다음
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}


