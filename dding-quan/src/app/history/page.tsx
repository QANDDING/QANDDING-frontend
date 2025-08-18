"use client";
import Link from 'next/link';
import { useEffect, useState, use } from 'react';
import { listQuestionsLocal } from '@/lib/localStore';

type HistoryItem = {
  id: string;
  title: string;
  subject: string;
};

const PAGE_SIZE = 5;

export default function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const [data, setData] = useState<{ items: HistoryItem[]; total: number }>({ items: [], total: 0 });
  const resolvedParams = searchParams ? use(searchParams) : { page: '1' };
  const page = Math.max(1, Number(resolvedParams?.page || 1));

  useEffect(() => {
    const result = listQuestionsLocal(page, PAGE_SIZE);
    setData(result);
  }, [page]);

  // TODO: 실제 서버 API 연결 시 아래 코드로 교체
  // export default async function HistoryPage({
  //   searchParams,
  // }: {
  //   searchParams?: Promise<{ page?: string }>;
  // }) {
  //   const resolvedParams = searchParams ? await searchParams : { page: '1' };
  //   const page = Math.max(1, Number(resolvedParams?.page || 1));
  //   const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/questions?page=${page}&limit=${PAGE_SIZE}`);
  //   const data = await res.json();
  //   return (
  //     <main className='mx-auto max-w-5xl px-6 py-10'>
  //       {/* 기존 JSX 내용 */}
  //     </main>
  //   );
  // }

  const totalPages = Math.max(1, Math.ceil((data?.total || 1) / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const items = (data?.items || []) as HistoryItem[];
  const pageNumbers = Array.from({ length: totalPages }).map((_, i) => i + 1);

  return (
    <main className='mx-auto max-w-5xl px-6 py-10'>
      <h1 className='text-xl font-semibold mb-6'>히스토리</h1>
      <div className='grid grid-cols-[100px_1fr] gap-4'>
        <div className='text-gray-500 space-y-4'>
          {['수학', '영어', '국어', '과학', '사회'].map((s) => (
            <div key={s}>{s}</div>
          ))}
        </div>
        <div className='space-y-3'>
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/history/${item.id}`}
              className='rounded-md bg-gray-100 h-10 flex items-center px-3 text-sm text-gray-700 hover:bg-gray-200'>
              Q. {item.title}
            </Link>
          ))}
          <div className='rounded-md bg-gray-200 h-64' />
        </div>
      </div>

      <nav className='mt-8 w-full flex items-center justify-center gap-2 text-xs'>
        <Link
          href={`/history?page=${Math.max(1, current - 1)}`}
          className='px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200'>
          이전
        </Link>
        {pageNumbers.map((n) => (
          <Link
            key={n}
            href={`/history?page=${n}`}
            className={`px-3 py-2 rounded-md ${
              n === current ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            {n}
          </Link>
        ))}
        <Link
          href={`/history?page=${Math.min(totalPages, current + 1)}`}
          className='px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200'>
          다음
        </Link>
      </nav>
    </main>
  );
}


