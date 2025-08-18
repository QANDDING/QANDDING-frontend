import { use } from 'react';

export default function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <main className='mx-auto max-w-3xl px-6 py-10'>
      <h1 className='text-xl font-semibold mb-4'>저장된 질문 {id}</h1>
      <article className='rounded-md border p-5 text-sm text-gray-800'>
        질문 본문 예시입니다. (히스토리 상세)
      </article>
    </main>
  );
}


