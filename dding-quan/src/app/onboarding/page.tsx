"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { userApi } from '../../lib/api';
import { saveAuthUser } from '@/lib/auth';

export default function OnboardingPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [grade, setGrade] = useState('');
  const [major, setMajor] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await userApi.getProfile();
        if (me) {
          setNickname(me.name || '');
        }
      } catch {}
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }
    if (!grade) {
      alert('학년을 선택해주세요.');
      return;
    }
    setLoading(true);
    try {
      // 스웨거 명세: /api/users/complete-profile 사용
      const updated = await userApi.completeProfile({ nickname: nickname.trim(), grade, major: major.trim() });
      saveAuthUser(updated);
      router.replace('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : '프로필 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white border p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">프로필 설정</h1>
          <p className="text-sm text-gray-500">처음 오셨네요! 기본 정보를 입력해주세요.</p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">닉네임</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            placeholder="예: 홍길동"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">학년</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none bg-white"
          >
            <option value="" disabled>학년을 선택하세요</option>
            <option value="1학년">1학년</option>
            <option value="2학년">2학년</option>
            <option value="3학년">3학년</option>
            <option value="4학년">4학년</option>
            <option value="그외">그외</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">전공</label>
          <input
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            placeholder="예: 컴퓨터공학"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장하고 시작하기'}
          </button>
        </div>
      </form>
    </main>
  );
}


