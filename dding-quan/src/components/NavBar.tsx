import Link from "next/link";
import { refreshAccessToken } from "@/lib/auth";
import { Route } from "next";

export default function NavBar() {
  return (
    <header className="w-full flex items-center justify-end gap-3 px-6 py-4">
      <Link
        href="/"
        className="rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
      >
        home
      </Link>
      <Link
        href="/ask"
        className="rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
      >
        질문
      </Link>
      <Link
        href="/board"
        className="rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
      >
        게시판
      </Link>
      <Link
        href="/history"
        className="rounded-full bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
      >
        히스토리
      </Link>
      <div className="space-y-2">
          <button
            type='button'
            onClick={() => {
              const BASE_URL = process.env.NEXT_PUBLIC_API_SERVER_URL;
              const loginUrl = `${BASE_URL}/login/oauth2/code/google`;
              console.log('직접 URL 테스트 시작');
              alert(`리다이렉트 URL 테스트를 시작합니다.\n\n브라우저 콘솔을 확인하세요.`);
              window.open(loginUrl, '_blank');
            }}
            className='w-full px-4 py-2 text-sm bg-gray-100 border rounded-md hover:bg-gray-200 text-gray-600'
          >
            🔧 디버그: URL 직접 테스트
          </button>
          
          <button
            type='button'
            onClick={async () => {
              try {
                console.log('토큰 갱신 시도...');
                const success = await refreshAccessToken();
                if (success) {
                  alert('토큰 갱신 성공! 브라우저 콘솔을 확인하세요.');
                } else {
                  alert('토큰 갱신 실패. 리프레시 토큰이 만료되었거나 없습니다.');
                }
              } catch (error) {
                console.error('토큰 갱신 에러:', error);
                alert('토큰 갱신 중 에러가 발생했습니다.');
              }
            }}
            className='w-full px-4 py-2 text-sm bg-blue-100 border rounded-md hover:bg-blue-200 text-blue-700'
          >
            토큰 갱신 
          </button>
        </div>
    </header>
  );
}