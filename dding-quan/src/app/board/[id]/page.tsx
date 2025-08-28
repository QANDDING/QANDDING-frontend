"use client";

import Link from 'next/link';
import { useEffect, useRef, useState, use } from 'react';
import { answerApi, questionApi, userApi, commentApi } from '@/lib/api';
import type { User } from '@/types/types';
import { formatKST } from '@/lib/datetime';

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
  users: { content: Array<{ id: string; title?: string; content: string; isAdopted?: boolean; createdAt?: string; imageUrls?: string[]; authorNickname?: string; nickname?: string }>; number?: number; size?: number; totalElements?: number; totalPages?: number; first?: boolean; last?: boolean };
};

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Combined | null>(null);
  const [loading, setLoading] = useState(true);
  const [adopting, setAdopting] = useState<number | null>(null);
  const [unadopting, setUnadopting] = useState(false);
  const [deletingAnswerId, setDeletingAnswerId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserNickname, setCurrentUserNickname] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [answerFiles, setAnswerFiles] = useState<File[]>([]);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const [answerProgress, setAnswerProgress] = useState<number[]>([]);
  const answerTitleRef = useRef<HTMLInputElement | null>(null);
  const answerContentRef = useRef<HTMLTextAreaElement | null>(null);
  const [userPage, setUserPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userHasMore, setUserHasMore] = useState(false);
  // 댓글 상태
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  type ThreadItem = { parent: { id: number; nickname?: string; content: string; createdAt?: string; imageUrls?: string[] }; replies: Array<{ id: number; nickname?: string; content: string; createdAt?: string; imageUrls?: string[] }> };
  type CommentPage = { content: ThreadItem[]; page?: number; size?: number; totalElements?: number; totalPages?: number; last?: boolean };
  const [comments, setComments] = useState<Record<string, CommentPage>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({}); // key: answerId
  const [replyText, setReplyText] = useState<Record<string, string>>({}); // key: parentCommentId
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [imageModal, setImageModal] = useState<{ urls: string[]; index: number } | null>(null);
  const [commentFiles, setCommentFiles] = useState<Record<string, File[]>>({}); // key: answerId
  const [commentProgress, setCommentProgress] = useState<Record<string, number[]>>({});
  const [replyFiles, setReplyFiles] = useState<Record<string, File[]>>({}); // key: parentCommentId
  const [replyProgress, setReplyProgress] = useState<Record<string, number[]>>({});
  const [commentsPage, setCommentsPage] = useState<Record<string, number>>({});
  const [commentsHasMore, setCommentsHasMore] = useState<Record<string, boolean>>({});

  // using global formatKST

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

  async function toggleComments(answerId: number) {
    const key = String(answerId);
    setOpenComments((prev) => ({ ...prev, [key]: !prev[key] }));
    const needLoad = !comments[key];
    if (needLoad) await loadComments(answerId);
  }

  async function loadComments(answerId: number, page = 0) {
    const key = String(answerId);
    setLoadingComments((prev) => ({ ...prev, [key]: true }));
    try {
      const res: CommentPage = await commentApi.list(answerId, page, 10);
      if (page > 0 && comments[key]) {
        // append
        setComments((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || {}),
            ...res,
            content: [
              ...((prev[key]?.content) || []),
              ...(res.content || []),
            ],
          } as CommentPage,
        }));
      } else {
        // replace
        setComments((prev) => ({ ...prev, [key]: res }));
      }
      // 댓글 보기 시에는 대댓글 자동 펼침을 하지 않음
      setCommentsPage((prev) => ({ ...prev, [key]: res.page ?? page }));
      const size = res.size ?? 10;
      const last = typeof res.last === 'boolean' ? res.last : ((res.content?.length || 0) < size);
      setCommentsHasMore((prev) => ({ ...prev, [key]: !last }));
    } finally {
      setLoadingComments((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function submitNewComment(answerId: number) {
    const k = String(answerId);
    const text = (commentText[k] || '').trim();
    if (!text) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }
    try {
      const files = commentFiles[k] || [];
      await commentApi.create(
        { answerPostId: answerId, content: text, files },
        {
          onProgress: ({ index, percent }) => {
            setCommentProgress((prev) => {
              const arr = (prev[k] || []).slice();
              arr[index] = percent;
              return { ...prev, [k]: arr };
            });
          },
        },
      );
      setCommentText((prev) => ({ ...prev, [k]: '' }));
      setCommentFiles((prev) => ({ ...prev, [k]: [] }));
      setCommentProgress((prev) => ({ ...prev, [k]: [] }));
      await loadComments(answerId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      alert(`댓글 등록 중 오류가 발생했습니다. ${msg}`);
    }
  }

  async function submitReply(parentCommentId: number, answerId: number) {
    const text = (replyText[parentCommentId] || '').trim();
    if (!text) {
      alert('대댓글 내용을 입력해주세요.');
      return;
    }
    try {
      const files = replyFiles[String(parentCommentId)] || [];
      await commentApi.reply(
        { parentCommentId, content: text, files },
        {
          onProgress: ({ index, percent }) => {
            setReplyProgress((prev) => {
              const arr = (prev[String(parentCommentId)] || []).slice();
              arr[index] = percent;
              return { ...prev, [String(parentCommentId)]: arr };
            });
          },
        },
      );
      setReplyText((prev) => ({ ...prev, [String(parentCommentId)]: '' }));
      setReplyFiles((prev) => ({ ...prev, [String(parentCommentId)]: [] }));
      setReplyProgress((prev) => ({ ...prev, [String(parentCommentId)]: [] }));
      setOpenReplies((prev) => ({ ...prev, [String(parentCommentId)]: true }));
      await loadComments(answerId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      alert(`대댓글 등록 중 오류가 발생했습니다. ${msg}`);
    }
  }

  function toggleReplies(parentCommentId: number) {
    const k = String(parentCommentId);
    setOpenReplies((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  async function removeComment(commentId: number, answerId: number) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await commentApi.delete(commentId);
      await loadComments(answerId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      alert(`삭제 중 오류가 발생했습니다. ${msg}`);
    }
  }

  function calcCommentCount(answerId: number): number {
    const th = comments[answerId];
    if (!th) return 0;
    return (th.content || []).reduce((sum, t) => sum + 1 + (t.replies?.length || 0), 0);
  }

  // ImageStrip 제거 (미사용)

  // 썸네일 캐러셀(3개씩 보기)
  function ImageCarousel({ urls }: { urls: string[] }) {
    const [start, setStart] = useState(0);
    if (!urls || urls.length === 0) return null;
    const view = 3;
    const end = Math.min(start + view, urls.length);
    const canPrev = start > 0;
    const canNext = end < urls.length;
    const onPrev = () => setStart((s) => Math.max(0, s - view));
    const onNext = () => setStart((s) => Math.min(Math.max(0, urls.length - view), s + view));
    return (
      <div className='mt-2'>
        <div className='flex items-center gap-2'>
          <button type='button' className='px-2 py-1 text-xs rounded border disabled:opacity-40' onClick={onPrev} disabled={!canPrev}>
            ‹
          </button>
          <div className='grid grid-cols-3 gap-2 flex-1'>
            {urls.slice(start, end).map((u, i) => (
              <button key={start + i} type='button' onClick={() => setImageModal({ urls, index: start + i })} className='block'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`첨부 이미지 ${start + i + 1}`} className='w-full h-24 sm:h-28 object-cover rounded border' />
              </button>
            ))}
          </div>
          <button type='button' className='px-2 py-1 text-xs rounded border disabled:opacity-40' onClick={onNext} disabled={!canNext}>
            ›
          </button>
        </div>
        {urls.length > view && (
          <div className='mt-1 text-[11px] text-gray-500 text-right'>
            {start + 1}–{end} / {urls.length}
          </div>
        )}
      </div>
    );
  }

  // 댓글/대댓글 전용: 대표 1장 + 개수 배지
  function CommentImages({ urls }: { urls: string[] }) {
    if (!urls || urls.length === 0) return null;
    const cover = urls[0];
    const count = urls.length;
    return (
      <div className='mt-2 inline-block'>
        <button
          type='button'
          onClick={() => setImageModal({ urls, index: 0 })}
          className='relative block rounded border overflow-hidden'
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={`첨부 이미지 대표`} className='w-28 h-20 object-cover' />
          <span className='absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] rounded bg-black/70 text-white'>
            {count}장
          </span>
        </button>
      </div>
    );
  }

  const USERS_PAGE_SIZE = 3;

  function hasMoreUsers(users: Combined['users']): boolean {
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
      // 매핑: API 질문 → 로컬 Question 타입
      const qMapped = q as unknown as import('@/types/types').Question;
      setQuestion({
        id: String(qMapped.id),
        title: qMapped.title,
        subject: qMapped.subject,
        subjectName: undefined,
        content: qMapped.content,
        isAdopted: Boolean(qMapped.isAdopted ?? false),
        imageUrls: undefined,
        files: Array.isArray(qMapped.files) ? qMapped.files : undefined,
        authorNickname: qMapped.authorName,
        createdAt: qMapped.createdAt,
      });
      setAnswers(a as Combined);
      const users = a?.users || {};
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
        const me: User = await userApi.getProfile();
        const uid = me?.id ? String(me.id) : null;
        if (uid != null) setCurrentUserId(uid);
        if (me.nickname) setCurrentUserNickname(String(me.nickname));
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 답변 모달 UX: 자동 포커스, ESC 닫기
  useEffect(() => {
    if (!answering) return;
    const t = setTimeout(() => {
      answerContentRef.current?.focus();
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !answerSubmitting) setAnswering(false);
    };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [answering, answerSubmitting]);

  // 해시로 특정 답변으로 스크롤
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = window.location.hash;
    if (!h || !answers) return;
    const el = document.querySelector(h) as HTMLElement | null;
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
      return;
    }
    // If target answer not in current page, try to find and load its page
    const m = /^#answer-(\d+)$/.exec(h);
    const targetId = m ? Number(m[1]) : NaN;
    if (!Number.isFinite(targetId)) return;
    (async () => {
      try {
        const users = answers?.users || {};
        const pageSize = users.size ?? 3;
        const totalPages = users.totalPages ?? 0;
        // scan pages starting from 0
        for (let p = 0; p < Math.min(totalPages || 50, 50); p++) {
          const res = await answerApi.getCombined(Number(id), p, pageSize);
          const list = (res?.users?.content || []) as Array<{ id: string }>;
          if (Array.isArray(list) && list.some((x) => Number(x.id) === targetId)) {
            setAnswers(res as Combined);
            setUserPage(res?.users?.number ?? p);
            setUserHasMore(hasMoreUsers(res?.users || ({} as Combined['users'])));
            // wait for render
            setTimeout(() => {
              const el2 = document.querySelector(h) as HTMLElement | null;
              if (el2) el2.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
            break;
          }
        }
      } catch {
        // ignore
      }
    })();
  }, [answers]);

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
      const msg = e instanceof Error ? e.message : '';
      alert(`채택 중 오류가 발생했습니다. ${msg || '권한 또는 네트워크를 확인해주세요.'}`);
      // console.error(e);
    } finally {
      setAdopting(null);
    }
  }

  async function unadopt() {
    if (!isAuthor) {
      alert('질문 작성자만 채택을 취소할 수 있습니다.');
      return;
    }
    try {
      setUnadopting(true);
      await answerApi.unadopt(Number(id));
      await loadAll();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      alert(`채택 취소 중 오류가 발생했습니다. ${msg || '권한 또는 네트워크를 확인해주세요.'}`);
    } finally {
      setUnadopting(false);
    }
  }

  async function deleteAnswer(answerId: number) {
    if (!confirm('내가 작성한 이 답변을 삭제할까요?')) return;
    try {
      setDeletingAnswerId(answerId);
      await answerApi.delete(answerId);
      await loadAll();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      alert(`삭제 중 오류가 발생했습니다. ${msg}`);
    } finally {
      setDeletingAnswerId(null);
    }
  }

  async function loadMoreUsers() {
    if (loadingMore) return;
    try {
      setLoadingMore(true);
      const nextPage = (userPage ?? 0) + 1;
      const more = await answerApi.getCombined(Number(id), nextPage, 3);
      const moreUsers = more?.users || {};
      setAnswers((prev) => {
        if (!prev) return more as Combined;
        const merged = {
          ...prev,
          users: {
            ...(prev.users || {}),
            ...moreUsers,
            content: [
              ...((prev.users && prev.users.content) || []),
              ...((moreUsers.content || [])),
            ],
          },
        } as Combined;
        return merged;
      });
      setUserPage(moreUsers.number ?? nextPage);
      setUserHasMore(hasMoreUsers(moreUsers));
    } finally {
      setLoadingMore(false);
    }
  }

  const subjectLabel = question?.subjectName || question?.subject || '-';
  const professorLabel = '';
  const getQuestionAuthorId = (q: Question | null): string | null => {
    if (!q) return null;
    const anyQ = q as unknown as Record<string, unknown>;
    const getNestedId = (obj: unknown): unknown => {
      return (typeof obj === 'object' && obj !== null && 'id' in obj) ? (obj as { id?: unknown }).id : undefined;
    };
    const cand = [
      anyQ['authorId'],
      anyQ['userId'],
      anyQ['memberId'],
      anyQ['writerId'],
      anyQ['ownerId'],
      getNestedId(anyQ['author']),
      getNestedId(anyQ['writer']),
      getNestedId(anyQ['owner']),
    ];
    for (const v of cand) {
      if (v !== undefined && v !== null) return String(v);
    }
    return null;
  };
  const getQuestionAuthorNickname = (q: Question | null): string | null => {
    if (!q) return null;
    const anyQ = q as unknown as Record<string, unknown>;
    const getNestedNickname = (obj: unknown): unknown => {
      return (typeof obj === 'object' && obj !== null && 'nickname' in obj) ? (obj as { nickname?: unknown }).nickname : undefined;
    };
    const cand = [
      (q as Question).authorNickname,
      getNestedNickname(anyQ['author']),
      getNestedNickname(anyQ['writer']),
      getNestedNickname(anyQ['owner']),
    ];
    for (const v of cand) {
      if (typeof v === 'string' && v.trim().length > 0) return String(v).trim();
    }
    return null;
  };
  const isAuthorById = !!(currentUserId && getQuestionAuthorId(question) === String(currentUserId));
  const isAuthorByNickname = !!(currentUserNickname && getQuestionAuthorNickname(question) === String(currentUserNickname));
  const isAuthor = isAuthorById || isAuthorByNickname;
  const isAnswerOwner = (ans: { authorNickname?: string; nickname?: string }) => {
    const nick = (ans?.authorNickname ?? ans?.nickname ?? '').toString().trim();
    return !!(currentUserNickname && nick && currentUserNickname === nick);
  };

  const getQuestionAuthorNick = () => getQuestionAuthorNickname(question);
  const displayCommentName = (nick?: string): string => {
    const n = (nick || '').trim();
    const qnick = (getQuestionAuthorNick() || '').trim();
    if (n && qnick && n === qnick) return '작성자';
    return n || '사용자';
  };
  const isQuestionAuthorComment = (nick?: string): boolean => {
    const n = (nick || '').trim();
    const qnick = (getQuestionAuthorNick() || '').trim();
    return !!(n && qnick && n === qnick);
  };

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
      <div className='text-xs text-gray-500 mb-2 flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2 flex-wrap'>
          <span className='px-2 py-0.5 bg-gray-100 rounded-full'>과목: {subjectLabel}</span>
          {professorLabel && (
            <span className='px-2 py-0.5 bg-gray-100 rounded-full'>교수: {professorLabel}</span>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {question?.authorNickname && (
            <span>작성자: {question.authorNickname}</span>
          )}
          {question?.createdAt && (
            <span>{formatKST(question.createdAt)}</span>
          )}
        </div>
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
          return urls && urls.length > 0 ? <ImageCarousel urls={urls} /> : null;
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
              <ImageCarousel urls={answers.ai.imageUrls} />
            )}
          </div>
    </section>
  )}

      {/* 선배 답변 목록 */}
      <section>
        <h2 className='text-sm font-medium mb-3'>선배 답변</h2>
        {/* 답변 입력은 모달로 표시됩니다 */}
        {(() => {
          type UserAnswer = { id: string; title?: string; content: string; isAdopted?: boolean; adopted?: boolean; createdAt?: string; imageUrls?: string[]; authorNickname?: string; nickname?: string };
          const list = (answers?.users?.content || []) as UserAnswer[];
          const anyAdopted = list.some((x) => Boolean(x.isAdopted ?? x.adopted));
          return (
        <ul className='space-y-3 mb-4'>
          {list.map((u: UserAnswer) => (
            <li key={u.id} id={`answer-${u.id}`} className='rounded-md border p-4 bg-white'>
              <div className='flex items-start justify-between mb-1 gap-2'>
                <div className='min-w-0'>
                  <div className='font-semibold text-gray-900 truncate'>A. {u.title || '답변'}</div>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='hidden sm:block text-xs text-gray-500 mr-1'>
                    <span>{u.authorNickname || u.nickname || '사용자'}</span>
                    {u.createdAt && <span className='ml-2'>{formatKST(u.createdAt)}</span>}
                  </div>
                  {Boolean(u.isAdopted ?? u.adopted) && (
                    isAuthor ? (
                      <button
                        onClick={unadopt}
                        disabled={unadopting}
                        className='group inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50'
                        title='채택 취소'
                      >
                        {unadopting ? (
                          '취소 중…'
                        ) : (
                          <>
                            <span className='group-hover:hidden'>채택됨</span>
                            <span className='hidden group-hover:inline'>취소하기</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'>채택됨</span>
                    )
                  )}
                  {!Boolean(u.isAdopted ?? u.adopted) && isAuthor && !anyAdopted && (
                    <button
                      onClick={() => adopt(Number(u.id))}
                      disabled={adopting === Number(u.id)}
                      className='px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs disabled:opacity-50'
                    >
                      {adopting === Number(u.id) ? '채택 중…' : '채택하기'}
                    </button>
                  )}
                  {isAnswerOwner(u) && (
                    <button
                      onClick={() => deleteAnswer(Number(u.id))}
                      disabled={deletingAnswerId === Number(u.id)}
                      className='px-2.5 py-1 rounded-md border text-xs disabled:opacity-50'
                      title='내 답변 삭제'
                    >
                      {deletingAnswerId === Number(u.id) ? '삭제 중…' : '삭제'}
                    </button>
                  )}
                </div>
              </div>
              <div className='sm:hidden text-xs text-gray-500 mb-2'>
                <span>{u.authorNickname || u.nickname || '사용자'}</span>
                {u.createdAt && <span className='ml-2'>{formatKST(u.createdAt)}</span>}
              </div>
              <div className='text-sm font-medium text-gray-900 mb-1'>본문</div>
              <CollapsibleText text={u.content} />
              {u.imageUrls && u.imageUrls.length > 0 && (
                <ImageCarousel urls={u.imageUrls} />
              )}
              {/* 댓글 토글 및 영역 */}
              <div className='mt-3'>
                <button
                  type='button'
                  onClick={() => toggleComments(Number(u.id))}
                  className='inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded'
                >
                  <span>{openComments[String(u.id)] ? '댓글 숨기기' : `댓글 보기 (${calcCommentCount(Number(u.id))})`}</span>
                  <span className='text-[10px]'>{openComments[String(u.id)] ? '▲' : '▼'}</span>
                </button>
                {openComments[String(u.id)] && (
                  <div className='mt-2 border-t pt-3'>
                    {/* 댓글 작성 */}
                    <div className='mb-3'>
                      <input
                        type='text'
                        value={commentText[String(u.id)] || ''}
                        onChange={(e) => setCommentText((prev) => ({ ...prev, [String(u.id)]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitNewComment(Number(u.id)); } }}
                        placeholder='댓글을 입력하세요'
                        className='w-full h-10 rounded-md border px-3 py-2 text-sm outline-none'
                      />
                      {(commentFiles[String(u.id)]?.length || 0) > 0 && (
                        <ul className='mt-2 space-y-1 max-h-28 overflow-auto text-xs text-gray-700'>
                          {(commentFiles[String(u.id)] || []).map((f, idx) => (
                            <li key={idx} className='flex items-center justify-between'>
                              <span className='truncate'>{f.name}</span>
                              {typeof (commentProgress[String(u.id)]?.[idx]) === 'number' && (
                                <div className='ml-3 w-40 h-2 bg-gray-200 rounded-full overflow-hidden'>
                                  <div className='h-2 bg-blue-600' style={{ width: `${Math.min(100, Math.max(0, commentProgress[String(u.id)]?.[idx] || 0))}%` }} />
                                </div>
                              )}
                              <button
                                type='button'
                                onClick={() => setCommentFiles((prev) => ({ ...prev, [String(u.id)]: (prev[String(u.id)] || []).filter((_, i) => i !== idx) }))}
                                className='ml-2 text-red-600 hover:underline'
                              >
                                제거
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className='mt-2 flex items-center gap-2 justify-end'>
                        <label className='cursor-pointer text-xs px-2 py-1 border rounded-md bg-white'>
                          파일 선택
                          <input
                            type='file'
                            multiple
                            accept='image/*,application/pdf'
                            className='hidden'
                            onChange={(e) => {
                              const list = Array.from(e.target.files || []);
                              if (!list.length) return;
                              setCommentFiles((prev) => {
                                const cur = prev[String(u.id)] || [];
                                const remaining = Math.max(0, 10 - cur.length);
                                const nextToAdd = list.slice(0, remaining);
                                if (list.length > remaining) alert('최대 10개까지 첨부할 수 있습니다.');
                                return { ...prev, [String(u.id)]: [...cur, ...nextToAdd] };
                              });
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                        <button
                          type='button'
                          onClick={() => submitNewComment(Number(u.id))}
                          className='px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs'
                          disabled={loadingComments[String(u.id)]}
                        >
                          등록
                        </button>
                      </div>
                    </div>

                    {/* 댓글 목록 */}
                    {loadingComments[String(u.id)] && (
                      <div className='text-xs text-gray-500'>불러오는 중…</div>
                    )}
                    {(!loadingComments[String(u.id)]) && (
                      <>
                      <ul className='space-y-3'>
                        {(comments[String(u.id)]?.content || []).map((th, idx) => (
                          <li key={th.parent?.id ?? idx} className='text-sm'>
                            <div className='p-2 rounded-md bg-gray-50 border'>
                              <div className='flex items-center justify-between text-xs text-gray-600'>
                                <span className='font-medium inline-flex items-center gap-1'>
                                  {displayCommentName(th.parent?.nickname)}
                                  {isQuestionAuthorComment(th.parent?.nickname) && (
                                    <span className='px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px]'>작성자</span>
                                  )}
                                </span>
                                {th.parent?.createdAt && <span>{formatKST(th.parent.createdAt)}</span>}
                              </div>
                              <div className='mt-1 flex flex-col sm:flex-row sm:items-start sm:gap-3'>
                                <div className='text-gray-800 whitespace-pre-line flex-1'>
                                  {th.parent?.content}
                                </div>
                                {Array.isArray(th.parent?.imageUrls) && th.parent.imageUrls.length > 0 && (
                                  <div className='mt-2 sm:mt-0 sm:shrink-0 sm:self-start'>
                                    <CommentImages urls={th.parent.imageUrls} />
                                  </div>
                                )}
                              </div>
                              {/* 대댓글 토글 + 액션 푸터 */}
                              <div className='mt-2 flex items-center justify-between'>
                                <button
                                  type='button'
                                  onClick={() => toggleReplies(Number(th.parent?.id))}
                                  className='inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded'
                                >
                                  <span>{openReplies[String(th.parent?.id)] ? '대댓글 숨기기' : `대댓글 보기 (${(th.replies || []).length})`}</span>
                                  <span className='text-[10px]'>{openReplies[String(th.parent?.id)] ? '▲' : '▼'}</span>
                                </button>
                                {(currentUserNickname && th.parent?.nickname && currentUserNickname === String(th.parent.nickname)) && (
                                  <button
                                    type='button'
                                    onClick={() => removeComment(Number(th.parent.id), Number(u.id))}
                                    className='text-xs text-red-600 hover:underline'
                                  >
                                    삭제
                                  </button>
                                )}
                              </div>
                              {openReplies[String(th.parent?.id)] && (
                                <ul className='mt-2 pl-4 space-y-2 border-l'>
                                  {(th.replies || []).map((r) => (
                                    <li key={r.id} className='p-2 rounded-md bg-white border'>
                                      <div className='flex items-center justify-between text-xs text-gray-600'>
                                        <span className='font-medium inline-flex items-center gap-1'>
                                          {displayCommentName(r.nickname)}
                                          {isQuestionAuthorComment(r.nickname) && (
                                            <span className='px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px]'>작성자</span>
                                          )}
                                        </span>
                                        {r.createdAt && <span>{formatKST(r.createdAt)}</span>}
                                      </div>
                                      <div className='mt-1 flex flex-col sm:flex-row sm:items-start sm:gap-3'>
                                        <div className='text-gray-800 whitespace-pre-line flex-1'>
                                          {r.content}
                                        </div>
                                        {Array.isArray(r.imageUrls) && r.imageUrls.length > 0 && (
                                          <div className='mt-2 sm:mt-0 sm:shrink-0 sm:self-start'>
                                            <CommentImages urls={r.imageUrls} />
                                          </div>
                                        )}
                                      </div>
                                      {(currentUserNickname && r.nickname && currentUserNickname === String(r.nickname)) && (
                                        <div className='mt-1 text-right'>
                                          <button
                                            type='button'
                                            onClick={() => removeComment(Number(r.id), Number(u.id))}
                                            className='text-xs text-red-600 hover:underline'
                                          >
                                            삭제
                                          </button>
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                  {/* 대댓글 입력 */}
                                  <li>
                                    <div className='mt-1'>
                                      <input
                                        type='text'
                                        value={replyText[String(th.parent?.id)] || ''}
                                        onChange={(e) => setReplyText((prev) => ({ ...prev, [String(th.parent?.id)]: e.target.value }))}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitReply(Number(th.parent?.id), Number(u.id)); } }}
                                        placeholder='대댓글을 입력하세요'
                                        className='w-full h-10 rounded-md border px-3 py-2 text-xs outline-none'
                                      />
                                      {(replyFiles[String(th.parent?.id)]?.length || 0) > 0 && (
                                        <ul className='mt-2 space-y-1 max-h-24 overflow-auto text-xs text-gray-700'>
                                          {(replyFiles[String(th.parent?.id)] || []).map((f, idx) => (
                                            <li key={idx} className='flex items-center justify-between'>
                                              <span className='truncate'>{f.name}</span>
                                              {typeof (replyProgress[String(th.parent?.id)]?.[idx]) === 'number' && (
                                                <div className='ml-3 w-40 h-2 bg-gray-200 rounded-full overflow-hidden'>
                                                  <div className='h-2 bg-blue-600' style={{ width: `${Math.min(100, Math.max(0, replyProgress[String(th.parent?.id)]?.[idx] || 0))}%` }} />
                                                </div>
                                              )}
                                              <button
                                                type='button'
                                                onClick={() => setReplyFiles((prev) => ({ ...prev, [String(th.parent?.id)]: (prev[String(th.parent?.id)] || []).filter((_, i) => i !== idx) }))}
                                                className='ml-2 text-red-600 hover:underline'
                                              >
                                                제거
                                              </button>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                      <div className='mt-2 flex items-center gap-2 justify-end'>
                                        <label className='cursor-pointer text-xs px-2 py-1 border rounded-md bg-white'>
                                          파일
                                          <input
                                            type='file'
                                            multiple
                                            accept='image/*,application/pdf'
                                            className='hidden'
                                            onChange={(e) => {
                                              const list = Array.from(e.target.files || []);
                                              if (!list.length) return;
                                              const key = String(th.parent?.id);
                                              setReplyFiles((prev) => {
                                                const cur = prev[key] || [];
                                                const remaining = Math.max(0, 10 - cur.length);
                                                const nextToAdd = list.slice(0, remaining);
                                                if (list.length > remaining) alert('최대 10개까지 첨부할 수 있습니다.');
                                                return { ...prev, [key]: [...cur, ...nextToAdd] };
                                              });
                                              e.currentTarget.value = '';
                                            }}
                                          />
                                        </label>
                                        <button
                                          type='button'
                                          onClick={() => submitReply(Number(th.parent?.id), Number(u.id))}
                                          className='h-8 px-3 rounded-md bg-gray-800 text-white text-xs'
                                          disabled={loadingComments[String(u.id)]}
                                        >
                                          등록
                                        </button>
                                      </div>
                                    </div>
                                  </li>
                                </ul>
                              )}
                            </div>
                          </li>
                        ))}
                        {(comments[String(u.id)]?.content || []).length === 0 && (
                          <li className='text-xs text-gray-500'>댓글이 없습니다.</li>
                        )}
                      </ul>
                      {commentsHasMore[String(u.id)] && (
                        <div className='mt-3 text-center'>
                          <button
                            type='button'
                            onClick={() => loadComments(Number(u.id), (commentsPage[String(u.id)] || 0) + 1)}
                            className='px-3 py-1.5 rounded-md border text-xs bg-white hover:bg-gray-50'
                            disabled={loadingComments[String(u.id)]}
                          >
                            더보기
                          </button>
                        </div>
                      )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
          {(!answers || (answers.users?.content || []).length === 0) && !loading && (
            <li className='text-sm text-gray-500'>아직 등록된 사용자 답변이 없습니다.</li>
          )}
        </ul>
          );
        })()}
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
      {answering && !isAuthor && (
        <div
          className='fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4'
          onClick={() => { if (!answerSubmitting) { setAnswering(false); } }}
        >
          <div
            className='w-full max-w-xl bg-white rounded-lg shadow-lg border p-4'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='flex items-center justify-between mb-3 border-b pb-2'>
              <h3 className='text-base font-semibold'>답변 달기</h3>
              <button
                type='button'
                onClick={() => { if (!answerSubmitting) { setAnswering(false); } }}
                className='w-8 h-8 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                aria-label='닫기'
              >
                ×
              </button>
            </div>
            <div className='mb-2'>
              <input ref={answerTitleRef} placeholder='답변 제목 (선택)' className='w-full rounded-md border px-3 py-2 text-sm outline-none' />
            </div>
            <div
              className='rounded-md border p-2 bg-white'
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                if (answerSubmitting) return;
                const files = Array.from(e.dataTransfer.files || []).filter(f => /^(image\/.*|application\/pdf)$/.test(f.type));
                if (!files.length) return;
                setAnswerFiles((prev) => {
                  const cur = prev || [];
                  const remaining = Math.max(0, 10 - cur.length);
                  const nextToAdd = files.slice(0, remaining);
                  if (files.length > remaining) alert('최대 10개까지 첨부할 수 있습니다.');
                  return [...cur, ...nextToAdd];
                });
              }}
            >
              <textarea ref={answerContentRef} className='w-full h-32 resize-y rounded-md border px-3 py-2 text-sm outline-none' placeholder='답변 내용을 입력하세요' />
              <div className='mt-2 flex items-center justify-between'>
                <div className='text-[11px] text-gray-500'>파일을 이 영역으로 드래그하여 첨부할 수 있습니다.</div>
                <label className='cursor-pointer text-xs px-2 py-1 border rounded-md bg-white'>
                  파일 선택
                  <input
                    type='file'
                    multiple
                    accept='image/*,application/pdf'
                    className='hidden'
                    onChange={(e) => {
                      if (answerSubmitting) return;
                      const list = Array.from(e.target.files || []);
                      if (!list.length) return;
                      setAnswerFiles((prev) => {
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
            </div>
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
            <div className='mt-3 flex items-center justify-end gap-2'>
              <button
                type='button'
                onClick={() => { if (!answerSubmitting) { setAnswering(false); setAnswerFiles([]); setAnswerProgress([]); } }}
                disabled={answerSubmitting}
                className='px-3 py-1.5 rounded-md border text-sm'
              >
                취소
              </button>
              <button
                type='button'
                onClick={submitAnswer}
                disabled={answerSubmitting}
                className='px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm disabled:opacity-50'
              >
                {answerSubmitting ? '등록 중…' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 이미지 모달 */}
      {imageModal && (
        <div
          className='fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4'
          onClick={() => setImageModal(null)}
        >
          <div className='relative max-w-[90vw] max-h-[85vh]'>
            <button
              type='button'
              onClick={(e) => { e.stopPropagation(); setImageModal(null); }}
              className='absolute -top-3 -right-3 bg-black text-white rounded-full w-8 h-8 text-sm'
              aria-label='닫기'
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageModal.urls[imageModal.index]}
              alt='첨부 이미지 확대'
              className='max-w-[90vw] max-h-[85vh] rounded shadow-lg'
              onClick={(e) => e.stopPropagation()}
            />
            {imageModal.urls.length > 1 && (
              <div className='absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2'>
                <button
                  type='button'
                  className='bg-black/60 text-white rounded-full w-8 h-8'
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageModal((prev) => prev ? ({ urls: prev.urls, index: (prev.index - 1 + prev.urls.length) % prev.urls.length }) : prev);
                  }}
                  aria-label='이전'
                >
                  ‹
                </button>
                <button
                  type='button'
                  className='bg-black/60 text-white rounded-full w-8 h-8'
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageModal((prev) => prev ? ({ urls: prev.urls, index: (prev.index + 1) % prev.urls.length }) : prev);
                  }}
                  aria-label='다음'
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}


