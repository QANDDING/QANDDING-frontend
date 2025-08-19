import Link from "next/link";

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
    </header>
  );
}