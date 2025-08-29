'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { questionApi, subjectsApi, createAiProblem } from '@/lib/api';
import type { PaginatedResponse, QuestionListItem, QuestionListParams } from '@/types/types';
import { formatKST } from '@/lib/datetime';
import { FileQuestion, History, BookOpen, BotMessageSquare, Upload, X, Search, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const router = useRouter();
  const [preview, setPreview] = useState<Array<{ id: string; title: string; authorNickname?: string; createdAt?: string; hasAiAnswer?: boolean; hasMemberAnswer?: boolean; isAdopted?: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAiModal, setShowAiModal] = useState(false);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectResults, setSubjectResults] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedSubject, setSelectedSubject] = useState<{ id: number; name: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const subjectBoxRef = useRef<HTMLDivElement | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

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

  // subject search (debounced)
  useEffect(() => {
    if (!showAiModal) return;
    const q = subjectQuery.trim();
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q) {
      setSubjectResults([]);
      setHighlightedIndex(-1);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await subjectsApi.search(q);
        setSubjectResults(results || []);
        setHighlightedIndex(results && results.length > 0 ? 0 : -1);
      } catch (e) {
        console.error('과목 검색 실패:', e);
      } finally {
        setSearching(false);
      }
    }, 250);
    // cleanup
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [subjectQuery, showAiModal]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!subjectBoxRef.current) return;
      if (!subjectBoxRef.current.contains(e.target as Node)) {
        setSubjectResults((prev) => prev); // keep list but no action
      }
    }
    if (showAiModal) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showAiModal]);

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    setFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    setFile(f);
  }

  async function handleSubmitAiProblem() {
    if (!selectedSubject) {
      toast.error('과목을 선택해주세요.');
      return;
    }
    if (!file) {
      toast.error('이미지 1개를 업로드해주세요.');
      return;
    }
    let popup: Window | null = null;
    try {
      setSubmitting(true);
      // Open a new tab immediately to avoid popup blockers
      popup = typeof window !== 'undefined' ? window.open('', '_blank', 'noopener,noreferrer') : null;

      const pdfBlob = await createAiProblem({ subjectId: selectedSubject.id, file });
      const url = URL.createObjectURL(pdfBlob);
      if (popup) {
        popup.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      // Revoke later to free memory
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      toast.success('문제 업로드를 완료했어요. PDF를 새 탭에서 열었어요.');
      setShowAiModal(false);
      setSubjectQuery('');
      setSubjectResults([]);
      setSelectedSubject(null);
      setFile(null);
      // 메인 페이지로 이동
      router.replace('/');
    } catch (e: unknown) {
      if (popup && !popup.closed) {
        try { popup.close(); } catch {}
      }
      console.error(e);
      const msg = e instanceof Error ? e.message : '업로드 중 오류가 발생했어요.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }


  // 가운데 카드는 이제 미리보기 iframe 대신 모달을 엽니다.

  const historyIframe = useMemo(() => (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <iframe
        src='/history'
        className='w-full h-full border-0 pointer-events-none'
        style={{
          transform: 'scale(0.25)',
          transformOrigin: 'top left',
          width: '400%',
          height: '400%',
          // 상단 헤더를 잘라내고 필터 영역부터 보이도록 위로 올림 (값은 필요시 조절 가능)
          marginTop: '-220px'
        }}
        title='히스토리 페이지 미리보기'
      />
    </div>
  ), []);

  return (
    <main className='mx-auto max-w-5xl px-6 py-10'>
      <p className='text-sm text-gray-600 mb-6'>모르는 문제는 질문하고 선배님과 AI 답변을 받아보세요</p>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {/* 질문하기 카드: 미리보기 제거, 이미지 영역 표시 */}
        <div className='group rounded-2xl bg-white border hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden'>
          <div className='p-4 border-b bg-blue-50'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2 text-blue-700'>
                <FileQuestion size={16} />
                <span className='text-sm font-medium'>질문하기</span>
              </div>
              <Link href='/ask' className='text-xs text-blue-600 hover:underline'>
                이동 →
              </Link>
            </div>
          </div>
          <div className='relative h-48 bg-gray-50 flex items-center justify-center'>
            <div className='text-center text-gray-500'>
              <Image src='/file.svg' alt='질문하기 이미지' width={64} height={64} className='mx-auto mb-2 opacity-80' />
              <div className='text-sm'>이미지 영역 (추가 예정)</div>
            </div>
          </div>
        </div>

        {/* 가운데 카드: AI 문제 받기 → 모달 열기 */}
        <div className='group rounded-2xl bg-white border hover:border-green-300 hover:shadow-lg transition-all duration-200 overflow-hidden'>
          <div className='p-4 border-b bg-green-50'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2 text-green-700'>
                <BotMessageSquare  size={16} />
                <span className='text-sm font-medium'>AI 문제 받기</span>
              </div>
              <button
                type='button'
                onClick={() => setShowAiModal(true)}
                className='text-xs text-green-700 hover:underline'
              >
                시작하기 →
              </button>
            </div>
          </div>
          <div className='relative h-48 bg-gray-50 flex items-center justify-center'>
            <div className='text-center text-gray-500'>
              <div className='mx-auto mb-2 w-8 h-8 text-green-600'>
                <BotMessageSquare size={32} />
              </div>
              <div className='text-sm'>이미지 업로드로 AI 문제 받기</div>
              <div className='text-xs text-gray-400 mt-1'>(미리보기 대신 모달로 진행)</div>
            </div>
            <button
              type='button'
              onClick={() => setShowAiModal(true)}
              className='absolute inset-0 bg-transparent hover:bg-green-50/20 transition-colors'
              aria-label='AI 문제 업로드 모달 열기'
            />
          </div>
        </div>

        {/* 히스토리 페이지 미리보기 (상단 영역만 보이도록 크롭) */}
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
          <div className='relative h-36 bg-gray-50 overflow-hidden'>
            {historyIframe}
            <Link 
              href='/history'
              className='absolute inset-0 bg-transparent hover:bg-purple-50/20 transition-colors'
              aria-label='히스토리 페이지로 이동'
            />
          </div>
        </div>
      </div>

      {/* AI 문제 업로드 모달 */}
      {showAiModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <div className='absolute inset-0 bg-black/30' onClick={() => !submitting && setShowAiModal(false)} />
          <div className='relative z-10 w-full max-w-lg rounded-xl bg-white border shadow-lg p-5'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-base font-semibold'>AI 문제 등록</h3>
              <button type='button' onClick={() => !submitting && setShowAiModal(false)} className='p-1 rounded hover:bg-gray-100'>
                <X size={18} />
              </button>
            </div>

            {/* 과목 검색/선택 */}
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>과목 선택</label>
              <div ref={subjectBoxRef} className='relative'>
                <div className='flex items-center border rounded-md px-2 py-1.5 focus-within:ring-2 focus-within:ring-green-200'>
                  <Search size={16} className='text-gray-400 mr-2' />
                  <input
                    type='text'
                    className='w-full outline-none text-sm'
                    placeholder='과목명을 입력하세요 (예: 자료구조)'
                    value={selectedSubject ? selectedSubject.name : subjectQuery}
                    onChange={(e) => {
                      setSelectedSubject(null);
                      setSubjectQuery(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedIndex((i) => Math.min(i + 1, subjectResults.length - 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedIndex((i) => Math.max(i - 1, 0));
                      } else if (e.key === 'Enter') {
                        if (highlightedIndex >= 0 && highlightedIndex < subjectResults.length) {
                          const s = subjectResults[highlightedIndex];
                          setSelectedSubject(s);
                          setSubjectQuery(s.name);
                        }
                      }
                    }}
                  />
                  {selectedSubject && (
                    <button type='button' onClick={() => { setSelectedSubject(null); setSubjectQuery(''); }} className='ml-2 text-xs text-gray-500 hover:underline'>
                      변경
                    </button>
                  )}
                </div>
                {subjectQuery && subjectResults.length > 0 && !selectedSubject && (
                  <ul className='absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white shadow-sm'>
                    {subjectResults.map((s, idx) => (
                      <li
                        key={s.id}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-green-50 ${idx === highlightedIndex ? 'bg-green-50' : ''}`}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => { setSelectedSubject(s); setSubjectQuery(s.name); }}
                      >
                        {s.name}
                      </li>
                    ))}
                  </ul>
                )}
                {searching && <div className='text-xs text-gray-500 mt-1'>검색 중...</div>}
              </div>
            </div>

            {/* 드래그 앤 드롭: 이미지 1개 */}
            <div className='mb-5'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>문제 이미지 (1장)</label>
              <div
                className='flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors'
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleDrop}
              >
                {!file ? (
                  <>
                    <Upload className='text-gray-400 mb-2' size={22} />
                    <p className='text-sm text-gray-600'>여기로 이미지를 드래그하거나 클릭해서 선택하세요</p>
                    <p className='text-xs text-gray-400 mt-1'>(최대 1장, 이미지 파일만)</p>
                    <input type='file' accept='image/*' className='mt-3 text-sm' onChange={handleFileChange} />
                  </>
                ) : (
                  <div className='w-full flex items-center gap-3'>
                    <ImageIcon size={20} className='text-gray-500' />
                    <div className='flex-1'>
                      <div className='text-sm'>{file.name}</div>
                      <div className='text-xs text-gray-500'>{Math.round(file.size / 1024)} KB</div>
                    </div>
                    <button type='button' onClick={() => setFile(null)} className='p-1 rounded hover:bg-gray-100'>
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className='flex justify-end gap-2'>
              <button type='button' onClick={() => setShowAiModal(false)} className='px-4 py-2 text-sm rounded-md border'>취소</button>
              <button
                type='button'
                onClick={handleSubmitAiProblem}
                disabled={!selectedSubject || !file || submitting}
                className={`px-4 py-2 text-sm rounded-md text-white ${!selectedSubject || !file || submitting ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {submitting ? '업로드 중...' : '등록하기'}
              </button>
            </div>

            {/* 업로드 진행 중 오버레이 */}
            {submitting && (
              <div className='absolute inset-0 rounded-xl bg-white/70 backdrop-blur-[2px] flex items-center justify-center'>
                <div className='flex flex-col items-center gap-3'>
                  <div className='animate-spin rounded-full h-10 w-10 border-2 border-green-600 border-t-transparent'></div>
                  <div className='text-sm text-gray-700'>업로드 중입니다. 잠시만 기다려주세요…</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
