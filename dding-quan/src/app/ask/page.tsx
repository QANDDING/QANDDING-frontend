"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addQuestionLocal } from '@/lib/localStore';

export default function AskPage() {
  const [initialQuestion, setInitialQuestion] = useState<string>('');
  const [stage, setStage] = useState<'quick' | 'detail'>('quick');

  function handleQuickSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const q = String(formData.get('q') || '').trim();
    if (!q) return;
    setInitialQuestion(q);
    setStage('detail');
  }

  const router = useRouter();

  async function handleDetailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get('title') || '').trim(),
      subject: String(formData.get('subject') || '').trim(),
      content: String(formData.get('content') || '').trim(),
    };
    if (!payload.title || !payload.subject || !payload.content) {
      alert('제목/과목/내용을 모두 입력해주세요.');
      return;
    }
    try {
      const created = addQuestionLocal(payload);
      alert('질문이 등록되었습니다.');
      router.push(`/board/${created.id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '알 수 없는 오류');
    }
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
              className='w-full rounded-md border px-3 py-2 text-sm outline-none'
              placeholder='제목을 입력하세요'
            />
          </div>
          <div>
            <label className='block text-sm text-gray-600 mb-1'>과목</label>
            <input
              name='subject'
              className='w-full rounded-md border px-3 py-2 text-sm outline-none'
              placeholder='예: 수학'
            />
          </div>
          <div>
            <label className='block text-sm text-gray-600 mb-1'>문제/질문 내용</label>
            <textarea
              name='content'
              defaultValue={initialQuestion}
              className='w-full h-40 resize-y rounded-md border px-3 py-2 text-sm outline-none'
              placeholder='질문 내용을 자세히 적어주세요'
            />
          </div>
          <div className='flex items-center justify-between'>
            <div className='flex gap-3'>
              <button type='button' className='px-4 py-2 rounded-md border text-sm'>PDF</button>
              <button type='button' className='px-4 py-2 rounded-md border text-sm'>이미지</button>
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
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}


