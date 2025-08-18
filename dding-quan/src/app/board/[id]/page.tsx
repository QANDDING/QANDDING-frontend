"use client";
import { useEffect, useState, use } from 'react';
import { getQuestionById } from '@/lib/localStore';

type Question = {
  id: string;
  title: string;
  subject: string;
  content: string;
};

export default function BoardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; image?: string }>>([
    { id: '1', author: '답변자', text: '예시 답변입니다.' },
  ]);
  const [question, setQuestion] = useState<Question | null>(null);

  useEffect(() => {
    setQuestion(getQuestionById(id) || null);
  }, [id]);

  function handleAddComment(formData: FormData) {
    const text = String(formData.get('text') || '').trim();
    const file = formData.get('image') as File | null;
    const newComment = { id: String(Date.now()), author: '질문자', text } as {
      id: string;
      author: string;
      text: string;
      image?: string;
    };
    if (file && file.size > 0) {
      const url = URL.createObjectURL(file);
      newComment.image = url;
    }
    setComments((prev) => [...prev, newComment]);
  }

  return (
    <main className='mx-auto max-w-3xl px-6 py-10'>
      <h1 className='text-xl font-semibold mb-4'>Q. {question?.title || '로딩 중...'}</h1>
      <div className='text-xs text-gray-500 mb-2'>과목: {question?.subject || '-'}</div>
      <div className='rounded-md bg-gray-50 p-4 mb-8 text-sm text-gray-700 whitespace-pre-line'>
        {question?.content || '내용을 불러오는 중입니다.'}
      </div>

      <section>
        <h2 className='text-sm font-medium mb-3'>댓글</h2>
        <ul className='space-y-3 mb-6'>
          {comments.map((c) => (
            <li key={c.id} className='rounded-md border p-3'>
              <div className='text-xs text-gray-500 mb-1'>{c.author}</div>
              <div className='text-sm text-gray-800 whitespace-pre-line'>{c.text}</div>
              {c.image && (
                <img src={c.image} alt='업로드 이미지' className='mt-2 max-h-48 rounded-md border object-contain' />
              )}
            </li>
          ))}
        </ul>

        <form
          action={(formData) => {
            handleAddComment(formData);
          }}
          className='rounded-md border p-4 space-y-3'>
          <textarea
            name='text'
            placeholder='댓글을 입력하세요'
            className='w-full h-24 resize-none rounded-md border px-3 py-2 text-sm outline-none'
          />
          <div className='flex items-center justify-between'>
            <input type='file' name='image' accept='image/*' className='text-xs' />
            <button type='submit' className='px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm'>등록</button>
          </div>
        </form>
      </section>
    </main>
  );
}


