"use client";

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { questionApi, professorApi, subjectsApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

function AskPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialQuestion, setInitialQuestion] = useState<string>('');
  const [stage, setStage] = useState<'quick' | 'detail'>('detail');
  const [subject, setSubject] = useState('');
  const [professors, setProfessors] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [loadingProf, setLoadingProf] = useState(false);

  // 사용하지 않는 빠른 제출 로직 제거 (상세 폼만 사용)

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  // AI 관련 로딩 상태 제거 (버튼 숨김)
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  // 과거 검색 버튼용 상태 제거 (자동완성으로 대체)
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  // 보드와 동일한 과목 자동완성 상태
  const [subjectInput, setSubjectInput] = useState('');
  const [subjectResults, setSubjectResults] = useState<Array<{ id: number; name: string }>>([]);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [isLoadingSubject, setIsLoadingSubject] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const subjectBoxRef = useRef<HTMLDivElement | null>(null);

  async function handleDetailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const files: File[] = selectedFiles.slice();

    const payload = {
      title: String(formData.get('title') || '').trim(),
      content: String(formData.get('content') || '').trim(),
      // 과목/교수는 선택 옵션. 선택하지 않으면 undefined로 전송
      subjectId: selectedSubjectId || undefined,
      professorId: selectedProfessorId ? parseInt(selectedProfessorId) : undefined,
      files: files.length > 0 ? files : undefined,
    };
    // 사용자 요구사항: 과목/교수/제목/내용 필수 입력
    if (!payload.title || !payload.content || !selectedSubjectId || !selectedProfessorId) {
      alert('제목, 내용, 과목, 교수님을 모두 선택/입력해주세요.');
      return;
    }
    try {
      setSubmitting(true);
      if (files.length > 0) {
        setUploadProgress(Array(files.length).fill(0));
      }
      const created = await questionApi.create(payload, {
        onProgress: ({ index, percent }) => {
          setUploadProgress((prev) => {
            const next = prev.slice();
            if (index >= 0) next[index] = percent;
            return next;
          });
        },
      });
      alert('질문이 등록되었습니다.');
      router.push(`/board/${created.id}`);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'Authentication required') {
        alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        window.location.href = '/login';
        return;
      }
      alert(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    // 인증 상태 확인
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // URL 파라미터에서 AI가 생성한 내용이 있다면 설정
    const title = searchParams.get('title');
    const content = searchParams.get('content');
    const subjectParam = searchParams.get('subject');
    const fromAi = searchParams.get('fromAi');
    
    if (title && titleInputRef.current) {
      titleInputRef.current.value = title;
    }
    if (content && contentTextareaRef.current) {
      contentTextareaRef.current.value = content;
    }
    if (subjectParam) {
      setSubjectInput(subjectParam);
    }
    if (fromAi === 'true') {
      setStage('detail');
    }
  }, [searchParams, router]);

  // 교수 검색 버튼 제거: 과목 선택 시 자동 로딩

  // 버튼 기반 검색/변경 핸들러 제거 (자동완성/선택 로직으로 대체)


  // 교수 목록 로드 (과목 선택 시)
  async function loadProfessorsBySubject(subjectId: number) {
    setLoadingProf(true);
    try {
      const list = await professorApi.getBySubjectId(subjectId);
      setProfessors(list.map((p: { id: number; name: string }) => ({ id: String(p.id), name: p.name })));
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.message === 'Authentication required') {
        alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        window.location.href = '/login';
        return;
      }
      setProfessors([]);
    } finally {
      setLoadingProf(false);
    }
  }

  // 보드와 동일한 과목 자동완성 (디바운스)
  useEffect(() => {
    const q = subjectInput.trim();
    setHighlightedIndex(-1);
    if (q.length < 1) {
      setSubjectResults([]);
      setShowSubjectDropdown(false);
      setSelectedSubjectId(null);
      setSelectedProfessorId('');
      setProfessors([]);
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

  // 바깥 클릭시 드롭다운 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!subjectBoxRef.current) return;
      if (!subjectBoxRef.current.contains(e.target as Node)) setShowSubjectDropdown(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  async function handleSelectSubject(s: { id: number; name: string }) {
    setSubjectInput(s.name);
    setSelectedSubjectId(s.id);
    setShowSubjectDropdown(false);
    setSelectedProfessorId('');
    await loadProfessorsBySubject(s.id);
  }

  return (
    <main className='mx-auto max-w-4xl px-6 py-10'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-xl font-semibold'>질문하기</h1>
        
      
      </div>

      {/* 빠른 입력 섹션 제거: 보드와 동일 UX를 위해 상세 폼만 사용 */}

      {/* 상세 폼 섹션 (확장 애니메이션) */}
      <div
        className={`transition-all duration-500 ease-out transform-gpu overflow-hidden ${
          stage === 'detail' ? 'max-h-[2000px] opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95'
        }`}
      >
        <form onSubmit={handleDetailSubmit} className='space-y-4'>
          <div>
            <label className='block text-sm text-gray-600 mb-1'>제목</label>
            <input
              name='title'
              ref={titleInputRef}
              className='w-full rounded-md border px-3 py-2 text-sm outline-none'
              placeholder='제목을 입력하세요'
            />
          </div>
          {/* 과목/교수 선택: 보드와 동일하게 한 줄 구성 */}
          <div className='mb-2 text-sm text-gray-600 font-medium'>과목과 교수를 선택해주세요.</div>
          <div className='grid gap-2 md:grid-cols-2'>
            <div className='relative' ref={subjectBoxRef}>
              <input
                type='text'
                placeholder='과목을 입력하세요 (예: 자료구조)'
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => {
                  if (!showSubjectDropdown && e.key !== 'Escape') setShowSubjectDropdown(true);
                  if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex((i) => Math.min(i + 1, subjectResults.length - 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex((i) => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter') { if (highlightedIndex >= 0 && highlightedIndex < subjectResults.length) handleSelectSubject(subjectResults[highlightedIndex]); }
                  else if (e.key === 'Escape') setShowSubjectDropdown(false);
                }}
                className='w-full px-4 py-3 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
              {showSubjectDropdown && (
                <div className='absolute left-0 right-0 mt-1 z-20 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto'>
                  {isLoadingSubject && (<div className='px-3 py-2 text-sm text-gray-500'>검색 중...</div>)}
                  {!isLoadingSubject && (
                    subjectResults.length > 0 ? (
                      <ul className='py-1'>
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
                      <div className='px-3 py-2 text-sm text-gray-500'>검색 결과가 없습니다</div>
                    )
                  )}
                </div>
              )}
            </div>
            <select
              value={selectedProfessorId}
              onChange={(e) => setSelectedProfessorId(e.target.value)}
              className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white'
              disabled={!selectedSubjectId || loadingProf || professors.length === 0}
            >
              <option value=''>
                {!selectedSubjectId ? '먼저 과목을 선택해주세요' : (loadingProf ? '불러오는 중...' : (professors.length === 0 ? '해당 과목의 교수가 없습니다' : '교수님을 선택하세요'))}
              </option>
              {professors.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className='block text-sm text-gray-600 mb-1'>문제/질문 내용</label>
            <textarea
              name='content'
              defaultValue={initialQuestion}
              ref={contentTextareaRef}
              className='w-full h-40 resize-y rounded-md border px-3 py-2 text-sm outline-none'
              placeholder='질문 내용을 자세히 적어주세요'
            />
          </div>
          <div className='flex items-start justify-between flex-col md:flex-row gap-3 md:gap-0'>
            <div className='w-full md:w-auto'>
              <div
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files || []).filter(f => /^(image\/.*|application\/pdf)$/.test(f.type));
                  if (files.length && !submitting) setSelectedFiles(prev => {
                    const cur = prev || [];
                    const remaining = Math.max(0, 10 - cur.length);
                    const nextToAdd = files.slice(0, remaining);
                    if (files.length > remaining) alert('최대 10개까지 첨부할 수 있습니다.');
                    return [...cur, ...nextToAdd];
                  });
                }}
                className='rounded-md border border-dashed p-4 text-sm text-gray-600 bg-gray-50'
              >
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    파일 첨부 (이미지 또는 PDF)
                    <div className='text-xs text-gray-500'>여러 개 선택 가능. 드래그앤드롭 지원.</div>
                  </div>
                  <label className='px-3 py-1.5 rounded-md border text-sm cursor-pointer bg-white'>
                    파일 선택
                    <input
                      type='file'
                      multiple
                      accept='image/*,application/pdf'
                      className='hidden'
                      onChange={(e) => {
                        const list = Array.from(e.target.files || []);
                        if (list.length && !submitting) setSelectedFiles(prev => {
                          const cur = prev || [];
                          const remaining = Math.max(0, 10 - cur.length);
                          const nextToAdd = list.slice(0, remaining);
                          if (list.length > remaining) alert('최대 10개까지 첨부할 수 있습니다.');
                          return [...cur, ...nextToAdd];
                        });
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
                {selectedFiles.length > 0 && (
                  <ul className='mt-3 space-y-1 max-h-28 overflow-auto'>
                    {selectedFiles.map((f, idx) => (
                      <li key={idx} className='flex items-center justify-between text-xs text-gray-700'>
                        <span className='truncate'>{f.name}</span>
                        {typeof uploadProgress[idx] === 'number' && submitting && (
                          <div className='ml-3 w-40 h-2 bg-gray-200 rounded-full overflow-hidden'>
                            <div
                              className='h-2 bg-blue-600'
                              style={{ width: `${Math.min(100, Math.max(0, uploadProgress[idx] || 0))}%` }}
                            />
                          </div>
                        )}
                        <button
                          type='button'
                          disabled={submitting}
                          onClick={() => !submitting && setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                          className='ml-2 text-red-600 hover:underline'
                        >
                          제거
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className='flex gap-2 md:items-center'>
              <button type='submit' disabled={submitting} className='px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50'>
                {submitting ? '등록 중…' : '질문하기'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AskPageContent />
    </Suspense>
  );
}
