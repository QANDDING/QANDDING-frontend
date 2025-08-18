"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listQuestionsLocal } from '@/lib/localStore';

type BoardItem = {
  id: string;
  title: string;
  subject: string;
  hasAnswer?: boolean;
  isAdopted?: boolean;
};

export default function BoardPage() {
  const [data, setData] = useState<{ items: BoardItem[] }>({ items: [] });

  useEffect(() => {
    const result = listQuestionsLocal(1, 20);
    setData(result);
  }, []);

  // TODO: 실제 서버 API 연결 시 아래 코드로 교체
  // 실제로 서버 연결하면 에러 발생안함 현재는 로컬로 저장해서 에러 발생하는것

  return (
    <main className='mx-auto max-w-5xl px-6 py-10'>
      <div className='flex items-center justify-between mb-6'>
        <h1 className='text-xl font-semibold'>게시판</h1>
        <Link href='/ask' className='px-3 py-1 rounded-md bg-blue-600 text-white text-sm'>질문하기</Link>
      </div>

      <ul className='space-y-3'>
        {(data?.items || []).map((item: BoardItem) => (
          <li key={item.id} className='rounded-md border p-4 flex items-center justify-between'>
            <Link href={`/board/${item.id}`} className='text-sm text-gray-800'>
              Q. {item.title}
            </Link>
            <div className='flex items-center gap-2 text-xs'>
              {item.hasAnswer ? (
                <span className='px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700'>답변있음</span>
              ) : (
                <span className='px-2 py-0.5 rounded-full bg-gray-100 text-gray-600'>미답변</span>
              )}
              {item.isAdopted && (
                <span className='px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700'>채택</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className='mt-8 w-full h-10 bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-500'>
        &lt; 1 2 3 4 5 &gt;
      </div>
    </main>
  );
}


