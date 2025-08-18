import Link from 'next/link';

export default function Home() {
  return (
    <main className='mx-auto max-w-5xl px-6 py-10'>
      <p className='text-sm text-gray-600 mb-6'>궁금한 건 무엇이든 질문해보세요!</p>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <Link
          href='/ask'
          className='h-56 rounded-3xl bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center text-gray-700'>
          질문하기
        </Link>
        <Link
          href='/board'
          className='h-56 rounded-3xl bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center text-gray-700'>
          게시판
        </Link>
        <Link
          href='/history'
          className='h-80 rounded-3xl bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center text-gray-700 md:col-span-1'>
          히스토리
        </Link>
        <div className='h-80 rounded-3xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400'>
          준비중
        </div>
      </div>
    </main>
  );
}
