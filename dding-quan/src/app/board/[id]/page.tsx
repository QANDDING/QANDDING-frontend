"use client";

import Link from 'next/link';
import { useEffect, useRef, useState, use } from 'react';
import { answerApi, questionApi, userApi } from '@/lib/api';

type Question = {
  id: string;
  title: string;
  subject?: string;
  subjectName?: string;
  content: string;
  isAdopted?: boolean;
  imageUrls?: string[];
  files?: Array<{ url: string; filename?: string }>;
  authorNickname?: string;
  createdAt?: string;
};

type Combined = {
  ai?: { id: number; title?: string; content: string; createdAt?: string; imageUrls?: string[]; authorNickname?: string } | null;
  users: { content: Array<{ id: number; title?: string; content: string; isAdopted?: boolean; createdAt?: string; imageUrls?: string[]; authorNickname?: string; nickname?: string }>; number?: number; size?: number; totalElements?: number; totalPages?: number; first?: boolean; last?: boolean };
};

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Combined | null>(null);
  const [loading, setLoading] = useState(true);
  const [adopting, setAdopting] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [answerProgress, setAnswerProgress] = useState<number[]>([]);
  const answerTitleRef = useRef<HTMLInputElement | null>(null);
  const answerContentRef = useRef<HTMLTextAreaElement | null>(null);
  const [userPage, setUserPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userHasMore, setUserHasMore] = useState(false);

  function formatKST(iso?: string) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).replace(/\./g, '-').replace(/-\s/g, '-').replace(/\s$/, '');
    } catch {
      return iso;
    }
  }

  function CollapsibleText({ text, threshold = 400 }: { text: string; threshold?: number }) {
    const [open, setOpen] = useState(false);
    const tooLong = (text || '').length > threshold;
    const display = !tooLong || open ? text : text.slice(0, threshold) + '…';
    return (
      <div>
        <div className='text-sm text-gray-800 whitespace-pre-line'>{display}</div>
        {tooLong && (
          <button type='button' onClick={() => setOpen(!open)} className='mt-1 text-xs text-blue-600 hover:underline'>
            {open ? '접기' : '더보기'}
          </button>
        )}
      </div>
    );
  }

  function ImageStrip({ urls }: { urls: string[] }) {
    if (!urls || urls.length === 0) return null;
    return (
      <div className='mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2'>
        {urls.map((u, i) => (
          <a key={i} href={u} target='_blank' rel='noreferrer' className='block'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt={`첨부 이미지 ${i + 1}`} className='w-full h-28 object-cover rounded border' />
          </a>
        ))}
      </div>
    );
  }

  const USERS_PAGE_SIZE = 3;

  function hasMoreUsers(users: any): boolean {
    if (!users) return false;
    if (typeof users.last === 'boolean') return !users.last;
    if (Array.isArray(users.content)) {
      // If page returns less than page size or empty, it's the last page
      if (users.content.length === 0) return false;
      if (users.content.length < (users.size ?? USERS_PAGE_SIZE)) return false;
    }
    if (typeof users.totalPages === 'number' && typeof users.number === 'number') {
      return users.number + 1 < users.totalPages;
    }
    if (typeof users.totalElements === 'number' && Array.isArray(users.content)) {
      return users.content.length < users.totalElements;
    }
    // Fallback: if exactly page size and no metadata, assume there might be more
    if (Array.isArray(users.content)) {
      return users.content.length >= (users.size ?? USERS_PAGE_SIZE);
    }
    return false;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [q, a] = await Promise.all([
        questionApi.getById(id),
        answerApi.getCombined(Number(id), 0, 3),
      ]);
      setQuestion(q as any);
      setAnswers(a as any);
      const users = (a as any)?.users || {};
      setUserPage(users.number ?? 0);
      setUserHasMore(hasMoreUsers(users));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // 프로필 로딩 (작성자 본인 여부 확인)
    (async () => {
      try {
        const me = await userApi.getProfile();
        const extractUserId = (u: any) => {
          return (
            u?.id ?? u?.userId ?? u?.memberId ?? u?.accountId ?? u?.uid ?? null
          );
        };
        const uid = extractUserId(me);
        if (uid != null) setCurrentUserId(String(uid));
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function adopt(answerPostId: number) {
    if (!isAuthor) {
      alert('질문 작성자만 채택할 수 있습니다.');
      return;
    }
    try {
      setAdopting(answerPostId);
      await answerApi.adopt(answerPostId);
      await loadAll();
    } catch (e) {
      alert('채택 중 오류가 발생했습니다. 권한 또는 네트워크를 확인해주세요.');
      // console.error(e);
    } finally {
      setAdopting(null);
    }
  }

  async function loadMoreUsers() {
    if (loadingMore) return;
    try {
      setLoadingMore(true);
      const nextPage = (userPage ?? 0) + 1;
      const more = await answerApi.getCombined(Number(id), nextPage, 3);
      const moreUsers = (more as any)?.users || {};
      setAnswers((prev) => {
        if (!prev) return more as any;
        const merged = {
          ...prev,
          users: {
            ...(prev.users || {}),
            ...moreUsers,
            content: [
              ...((prev.users && (prev.users as any).content) || []),
              ...((moreUsers.content) || []),
            ],
          },
        } as any;
        return merged;
      });
      setUserPage(moreUsers.number ?? nextPage);
      setUserHasMore(hasMoreUsers(moreUsers));
    } finally {
      setLoadingMore(false);
    }
  }

  const subjectLabel = question?.subjectName || question?.subject || '-';
  const getQuestionAuthorId = (q: any): string | null => {
    if (!q) return null;
    const cand = [
      q.authorId,
      q.userId,
      q.memberId,
      q.writerId,
      q.ownerId,
      q?.author?.id,
      q?.writer?.id,
      q?.owner?.id,
    ];
    for (const v of cand) {
      if (v !== undefined && v !== null) return String(v);
    }
    return null;
  };
  const isAuthor = !!(currentUserId && getQuestionAuthorId(question) === String(currentUserId));

  async function submitAnswer() {
    const title = answerTitleRef.current?.value?.trim() || '';
    const content = answerContentRef.current?.value?.trim() || '';
    if (!content) {
      alert('답변 내용을 입력해주세요.');
      return;
    }
    try {
      setAnswerSubmitting(true);
      if (answerFiles.length > 0) setAnswerProgress(Array(answerFiles.length).fill(0));
      await answerApi.create({ content, questionId: id, title, files: answerFiles }, {
        onProgress: ({ index, percent }) => {
          setAnswerProgress((prev) => {
            const next = prev.slice();
            if (index >= 0) next[index] = percent;
            return next;
          });
        },
      });
      // reset and reload
      setAnswering(false);
      setAnswerFiles([]);
      setAnswerProgress([]);
      if (answerTitleRef.current) answerTitleRef.current.value = '';
      if (answerContentRef.current) answerContentRef.current.value = '';
      await loadAll();
    } catch (e) {
      alert('답변 등록 중 오류가 발생했습니다.');
    } finally {
      setAnswerSubmitting(false);
    }
  }

  return (
    <main className='mx-auto max-w-3xl px-6 py-10'>
      <div className='flex items-center justify-between mb-4 gap-3'>
        <h1 className='text-xl font-semibold'>Q. {question?.title || (loading ? '로딩 중...' : '-')}</h1>
        <div className='flex items-center gap-2'>
          {!isAuthor && (
            <button
              type='button'
              onClick={() => setAnswering((v) => !v)}
              className='px-3 py-1.5 rounded-md text-sm bg-emerald-600 text-white hover:bg-emerald-700'
            >
              답변달기
            </button>
          )}
          <Link href='/board' className='px-3 py-1.5 rounded-md text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'>
            목록
          </Link>
        </div>
      </div>
      <div className='text-xs text-gray-500 mb-2 flex items-center gap-2 flex-wrap'>
        <span className='px-2 py-0.5 bg-gray-100 rounded-full'>과목: {subjectLabel}</span>
        {question?.authorNickname && (
          <span>작성자: {question.authorNickname}</span>
        )}
        {question?.createdAt && (
          <span>• {formatKST(question.createdAt)}</span>
        )}
      </div>
      <div className='rounded-md bg-gray-50 p-4 mb-2'>
        <div className='text-sm font-medium text-gray-900 mb-2'>본문</div>
        <div className='text-sm text-gray-700 whitespace-pre-line'>
          {question?.content || (loading ? '내용을 불러오는 중입니다.' : '-')}
        </div>
        {(() => {
          const urls = (question?.imageUrls && question.imageUrls.length > 0)
            ? question.imageUrls
            : (question?.files || []).map((f) => f.url).filter(Boolean);
          return urls && urls.length > 0 ? <ImageStrip urls={urls} /> : null;
        })()}
      </div>

      {/* AI 답변 */}
      {answers?.ai && (
        <section className='mb-6'>
          <h2 className='text-sm font-medium mb-2'>AI 답변</h2>
          <div className='rounded-md border p-4 bg-white'>
            <div className='flex items-center justify-between mb-1'>
              <div className='font-semibold text-gray-900 truncate'>
                A. {answers.ai?.title || '답변'}
              </div>
              <div className='flex items-center gap-2 text-xs text-gray-500'>
                <span className='px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full'>AI</span>
                {answers.ai?.createdAt && (
                  <span>{formatKST(answers.ai.createdAt)}</span>
                )}
              </div>
            </div>
            <div className='text-sm font-medium text-gray-900 mb-1'>본문</div>
            <CollapsibleText text={answers.ai.content} />
            {answers.ai?.imageUrls && answers.ai.imageUrls.length > 0 && (
              <ImageStrip urls={answers.ai.imageUrls} />
            )}
          </div>
        </section>
      )}

      {/* 선배 답변 목록 */}
      <section>
        <h2 className='text-sm font-medium mb-3'>선배 답변</h2>
        {!isAuthor && answering && (
          <div className='mb-6 rounded-md border p-4 bg-white'>
            <div className='grid gap-2 md:grid-cols-2 mb-2'>
              <input ref={answerTitleRef} placeholder='답변 제목 (선택)' className='w-full rounded-md border px-3 py-2 text-sm outline-none' />
              <label className='justify-self-end'>
                <span className='px-3 py-1.5 rounded-md border text-sm cursor-pointer bg-white inline-block'>파일 선택</span>
                <input
                  type='file'
                  multiple
                  accept='image/*,application/pdf'
                  className='hidden'
                  onChange={(e) => {
                    if (answerSubmitting) return;
                    const list = Array.from(e.target.files || []);
                    if (list.length) setAnswerFiles((prev) => [...prev, ...list]);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
            </div>
            <textarea ref={answerContentRef} className='w-full h-28 resize-y rounded-md border px-3 py-2 text-sm outline-none' placeholder='답변 내용을 입력하세요' />
            {answerFiles.length > 0 && (
              <ul className='mt-2 space-y-1 max-h-28 overflow-auto text-xs text-gray-700'>
                {answerFiles.map((f, idx) => (
                  <li key={idx} className='flex items-center justify-between'>
                    <span className='truncate'>{f.name}</span>
                    {typeof answerProgress[idx] === 'number' && answerSubmitting && (
                      <div className='ml-3 w-40 h-2 bg-gray-200 rounded-full overflow-hidden'>
                        <div className='h-2 bg-blue-600' style={{ width: `${Math.min(100, Math.max(0, answerProgress[idx] || 0))}%` }} />
                      </div>
                    )}
                    <button
                      type='button'
                      disabled={answerSubmitting}
                      onClick={() => !answerSubmitting && setAnswerFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className='ml-2 text-red-600 hover:underline'
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className='mt-3 flex items-center gap-2'>
              <button
                type='button'
                onClick={submitAnswer}
                disabled={answerSubmitting}
                className='px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-50'
              >
                {answerSubmitting ? '등록 중…' : '등록'}
              </button>
              <button
                type='button'
                onClick={() => { if (!answerSubmitting) { setAnswering(false); setAnswerFiles([]); setAnswerProgress([]); } }}
                disabled={answerSubmitting}
                className='px-3 py-1.5 rounded-md border text-sm'
              >
                취소
              </button>
            </div>
          </div>
        )}
        <ul className='space-y-3 mb-4'>
          {(answers?.users?.content || []).map((u) => (
            <li key={u.id} className='rounded-md border p-4 bg-white'>
              <div className='flex items-start justify-between mb-1 gap-2'>
                <div className='min-w-0'>
                  <div className='font-semibold text-gray-900 truncate'>A. {u.title || '답변'}</div>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='hidden sm:block text-xs text-gray-500 mr-1'>
                    <span>{u.authorNickname || (u as any).nickname || '사용자'}</span>
                    {u.createdAt && <span className='ml-2'>{formatKST(u.createdAt)}</span>}
                  </div>
                  {u.isAdopted && (
                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'>채택됨</span>
                  )}
                  {!u.isAdopted && isAuthor && (
                    <button
                      onClick={() => adopt(u.id)}
                      disabled={adopting === u.id}
                      className='px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs disabled:opacity-50'
                    >
                      {adopting === u.id ? '채택 중…' : '채택하기'}
                    </button>
                  )}
                </div>
              </div>
              <div className='sm:hidden text-xs text-gray-500 mb-2'>
                <span>{u.authorNickname || (u as any).nickname || '사용자'}</span>
                {u.createdAt && <span className='ml-2'>{formatKST(u.createdAt)}</span>}
              </div>
              <div className='text-sm font-medium text-gray-900 mb-1'>본문</div>
              <CollapsibleText text={u.content} />
              {u.imageUrls && u.imageUrls.length > 0 && (
                <ImageStrip urls={u.imageUrls} />
              )}
            </li>
          ))}
          {(!answers || (answers.users?.content || []).length === 0) && !loading && (
            <li className='text-sm text-gray-500'>아직 등록된 사용자 답변이 없습니다.</li>
          )}
        </ul>
        {userHasMore && (
          <div className='mb-6'>
            <button
              type='button'
              onClick={loadMoreUsers}
              disabled={loadingMore}
              className='px-3 py-1.5 rounded-md border text-sm bg-white hover:bg-gray-50 disabled:opacity-50'
            >
              {loadingMore ? '불러오는 중…' : '더보기'}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}


