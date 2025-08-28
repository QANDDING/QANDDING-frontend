'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { userApi } from '@/lib/api';

export default function OnboardingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nickname: '',
    grade: '',
    major: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nickname.trim() || !formData.grade.trim() || !formData.major.trim()) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await userApi.completeProfile({
        nickname: formData.nickname.trim(),
        grade: formData.grade.trim(),
        major: formData.major.trim(),
      });

      // 프로필 완성 성공 시 메인 페이지로 이동
      router.replace('/');
    } catch (err) {
      console.error('프로필 완성 실패:', err);
      setError(err instanceof Error ? err.message : '프로필 완성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        <div className='text-center'>
          <h2 className='mt-6 text-3xl font-extrabold text-gray-900'>프로필 완성</h2>
          <p className='mt-2 text-sm text-gray-600'>서비스 이용을 위해 추가 정보를 입력해주세요</p>
        </div>

        <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
          <div className='space-y-4'>
            <div>
              <label htmlFor='nickname' className='block text-sm font-medium text-gray-700'>
                닉네임 *
              </label>
              <input
                id='nickname'
                name='nickname'
                type='text'
                required
                value={formData.nickname}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                className='mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm'
                placeholder='닉네임을 입력하세요'
              />
            </div>

            <div>
              <label htmlFor='grade' className='block text-sm font-medium text-gray-700'>
                학년 *
              </label>
              <select
                id='grade'
                name='grade'
                required
                value={formData.grade}
                onChange={(e) => handleInputChange('grade', e.target.value)}
                className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm'>
                <option value=''>학년을 선택하세요</option>
                <option value='1학년'>1학년</option>
                <option value='2학년'>2학년</option>
                <option value='3학년'>3학년</option>
                <option value='4학년'>4학년</option>
                <option value='대학원'>대학원</option>
                <option value='졸업생'>졸업생</option>
              </select>
            </div>

            <div>
              <label htmlFor='major' className='block text-sm font-medium text-gray-700'>
                전공 *
              </label>
              <input
                id='major'
                name='major'
                type='text'
                required
                value={formData.major}
                onChange={(e) => handleInputChange('major', e.target.value)}
                className='mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm'
                placeholder='전공을 입력하세요 (예: 컴퓨터공학과)'
              />
            </div>
          </div>

          {error && <div className='text-red-600 text-sm text-center bg-red-50 p-3 rounded-md'>{error}</div>}

          <div>
            <button
              type='submit'
              disabled={loading}
              className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'>
              {loading ? (
                <div className='flex items-center'>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                  처리 중...
                </div>
              ) : (
                '프로필 완성'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
