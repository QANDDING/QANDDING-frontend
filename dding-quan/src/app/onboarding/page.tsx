"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { userApi } from '../../lib/api';
import { saveAuthUser } from '@/lib/auth';

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await userApi.getProfile();
        if (me) {
          setName(me.name || '');
          
          setBio((me.bio as string) || '');
        }
      } catch {}
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      // 스웨거 명세: /api/users/complete-profile 사용
      const updated = await userApi.completeProfile({ nickname: name.trim(), grade: '', major: '', email: '' });
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
          <h1 className="text-xl font-semibold">간단한 자기소개</h1>
          <p className="text-sm text-gray-500">처음 오셨네요! 이름과 간단한 소개를 남겨주세요.</p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            placeholder="예: 홍길동"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">소개</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full h-28 resize-y rounded-md border px-3 py-2 text-sm outline-none"
            placeholder="간단한 자기소개를 적어주세요"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.replace('/')}
            className="px-4 py-2 rounded-md border text-sm"
          >
            건너뛰기
          </button>
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


