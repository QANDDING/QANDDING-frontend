"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { questionApi, professorApi, aiApi, subjectsApi } from '@/lib/api';

export default function AskPage() {
  const [initialQuestion, setInitialQuestion] = useState<string>('');
  const [stage, setStage] = useState<'quick' | 'detail'>('quick');
  const [subject, setSubject] = useState('');
  const [professors, setProfessors] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProfessorId, setSelectedProfessorId] = useState('');
  const [loadingProf, setLoadingProf] = useState(false);

  function handleQuickSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const q = String(formData.get('q') || '').trim();
    if (!q) return;
    setInitialQuestion(q);
    setStage('detail');
  }

  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<{ pdf?: File; image?: File }>({});
  const [aiLoading, setAiLoading] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [subjectSuggestions, setSubjectSuggestions] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  async function handleDetailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formSubject = String(formData.get('subject') || '').trim();
    const files: File[] = [];
    if (selectedFiles.pdf) files.push(selectedFiles.pdf);
    if (selectedFiles.image) files.push(selectedFiles.image);

    const payload = {
      title: String(formData.get('title') || '').trim(),
      content: String(formData.get('content') || '').trim(),
      subjectId: selectedSubjectId || undefined,
      professorId: selectedProfessorId ? parseInt(selectedProfessorId) : undefined,
      files: files.length > 0 ? files : undefined,
    };
    if (!payload.title || !payload.content || !selectedSubjectId) {
      alert('제목/과목/내용을 모두 입력해주세요.');
      return;
    }
    try {
      const created = await questionApi.create(payload);
      alert('질문이 등록되었습니다.');
      router.push(`/board/${created.id}`);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'Authentication required') {
        alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        window.location.href = '/login';
        return;
      }
      alert(e instanceof Error ? e.message : '알 수 없는 오류');
    }
  }

  useEffect(() => {
    setSubject('');
  }, []);

  async function handleSearchProfessors() {
    if (!selectedSubjectId) {
      alert('먼저 과목을 선택해주세요.');
      return;
    }
    setLoadingProf(true);
    try {
      const list = await professorApi.getBySubjectId(selectedSubjectId);
      setProfessors(list.map((p: any) => ({ id: p.id.toString(), name: p.name })));
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

  async function handleSearchSubjects() {
    const keyword = subject.trim();
    if (!keyword) {
      setSubjectSuggestions([]);
      return;
    }
    try {
      const suggestions = await subjectsApi.search(keyword);
      setSubjectSuggestions(suggestions);
    } catch (e) {
      console.error(e);
      if (e instanceof Error && e.message === 'Authentication required') {
        alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        window.location.href = '/login';
        return;
      }
      setSubjectSuggestions([]);
    }
  }

  function handleSubjectChange(next: string) {
    setSubject(next);
    setSelectedProfessorId('');
    setSubjectSuggestions([]);
    setSelectedSubjectId(null);
  }

  return (
    <main className='mx-auto max-w-4xl px-6 py-10'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-xl font-semibold'>질문하기</h1>
        
      
      </div>

      {/* 빠른 입력 섹션 (축소 애니메이션) */}
      <div
        className={`transition-all duration-500 ease-out transform-gpu overflow-hidden ${
          stage === 'quick' ? 'max-h-40 opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95'
        }`}
      >
        <form onSubmit={handleQuickSubmit} className='mb-6'>
          <label className='block text-sm text-gray-600 mb-2'>무엇이 궁금한가요?</label>
          <div className='rounded-full border border-gray-300 bg-gray-100 px-5 py-3 shadow-sm'>
            <input
              name='q'
              className='w-full bg-transparent outline-none'
              placeholder='키워드나 질문을 입력하고 Enter'
            />
          </div>
        </form>
      </div>

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
          {/* 1단계: 과목 검색 */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <span className='flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium'>1</span>
              <label className='text-sm text-gray-600 font-medium'>과목 검색</label>
            </div>
            <div className='flex gap-2'>
              <input
                name='subject'
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchSubjects(); } }}
                className='flex-1 rounded-md border px-3 py-2 text-sm outline-none'
                placeholder='과목명을 입력하세요 (예: 자료구조, 회계원리)'
              />
              <button
                type='button'
                onClick={handleSearchSubjects}
                className='px-4 py-2 rounded-md bg-green-600 text-white text-sm'
              >
                과목 검색
              </button>
            </div>
            <datalist id='subject-suggestions'>
              {subjectSuggestions.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
            
            {subjectSuggestions.length > 0 && (
              <div className='p-3 bg-gray-50 rounded-md border'>
                <label className='block text-xs text-gray-500 mb-2'>검색 결과에서 과목을 선택하세요:</label>
                <select
                  value={selectedSubjectId || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    setSelectedSubjectId(value);
                    const selected = subjectSuggestions.find(s => s.id === value);
                    if (selected) setSubject(selected.name);
                    setProfessors([]);
                    setSelectedProfessorId('');
                  }}
                  className='w-full rounded-md border px-3 py-2 text-sm outline-none bg-white'
                >
                  <option value=''>과목을 선택하세요</option>
                  {subjectSuggestions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2단계: 교수 검색 */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                selectedSubjectId ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}>2</span>
              <label className={`text-sm font-medium ${
                selectedSubjectId ? 'text-gray-600' : 'text-gray-400'
              }`}>교수 검색</label>
            </div>
            
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={handleSearchProfessors}
                disabled={!selectedSubjectId || loadingProf}
                className='px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:bg-gray-300 disabled:cursor-not-allowed'
              >
                {loadingProf ? '검색 중...' : '교수 검색'}
              </button>
              
              {professors.length > 0 && (
                <select
                  value={selectedProfessorId}
                  onChange={(e) => setSelectedProfessorId(e.target.value)}
                  className='flex-1 rounded-md border px-3 py-2 text-sm outline-none bg-white'
                >
                  <option value=''>교수를 선택하세요</option>
                  {professors.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
            
            {!selectedSubjectId && (
              <p className='text-xs text-gray-400'>먼저 위에서 과목을 선택해주세요.</p>
            )}
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
          <div className='flex items-center justify-between'>
            <div className='flex gap-3 items-center'>
              <label className='px-4 py-2 rounded-md border text-sm cursor-pointer'>
                PDF
                <input
                  type='file'
                  accept='application/pdf'
                  className='hidden'
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setSelectedFiles((prev) => ({ ...prev, pdf: file }));
                  }}
                />
              </label>
              <label className='px-4 py-2 rounded-md border text-sm cursor-pointer'>
                이미지
                <input
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setSelectedFiles((prev) => ({ ...prev, image: file }));
                  }}
                />
              </label>
              {(selectedFiles.pdf || selectedFiles.image) && (
                <div className='text-xs text-gray-500'>
                  {selectedFiles.pdf ? `PDF: ${selectedFiles.pdf.name}` : ''}
                  {selectedFiles.pdf && selectedFiles.image ? ' / ' : ''}
                  {selectedFiles.image ? `이미지: ${selectedFiles.image.name}` : ''}
                </div>
              )}
            </div>
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => setStage('quick')}
                className='px-4 py-2 rounded-md border text-sm'
              >
                뒤로
              </button>
              <button type='submit' className='px-4 py-2 rounded-md bg-blue-600 text-white text-sm'>질문 등록</button>
              <button
                type='button'
                onClick={async () => {
                  try {
                    setAiLoading(true);
                    const contentValue = contentTextareaRef.current?.value || '';
                    const res = await aiApi.suggestQuestion({ subject, content: contentValue });
                    if (res.title && titleInputRef.current) {
                      titleInputRef.current.value = res.title;
                    }
                    if (res.content && contentTextareaRef.current) {
                      contentTextareaRef.current.value = res.content;
                    }
                  } catch (e) {
                    alert('AI 제안에 실패했습니다.');
                  } finally {
                    setAiLoading(false);
                  }
                }}
                className='px-4 py-2 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-50'
                disabled={aiLoading}
              >
                {aiLoading ? 'AI 작성 중...' : 'AI 질문하기'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}


