'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { aiApi } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

interface AiAnswerResponse {
  title?: string;
  content?: string;
  suggestions?: string[];
}

function AiAnswerPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState<AiAnswerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  
  // URL에서 전달받은 초기 질문이 있다면 설정
  const initialQuestion = searchParams.get('question') || '';
  const initialSubject = searchParams.get('subject') || '';

  // 인증 상태 확인
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const question = questionInputRef.current?.value.trim();
    const subject = subjectInputRef.current?.value.trim();
    
    if (!question) {
      alert('질문 내용을 입력해주세요.');
      return;
    }
    
    if (!subject) {
      alert('과목을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await aiApi.suggestQuestion({
        subject,
        content: `사용자가 ${subject} 과목에 대해 질문한 내용입니다.`
      });
      
      setAnswer(response);
    } catch (err) {
      console.error('AI 답변 요청 실패:', err);
      setError('AI 답변을 받는 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskQuestion = () => {
    if (answer?.title && answer?.content) {
      // 질문하기 페이지로 이동하면서 AI가 생성한 내용을 전달
      const params = new URLSearchParams({
        title: answer.title,
        content: answer.content,
        subject: subjectInputRef.current?.value || '',
        fromAi: 'true'
      });
      router.push(`/ask?${params.toString()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 섹션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">AI 답변 받기</h1>
              <p className="text-gray-600">질문에 대한 AI의 답변을 받아보세요</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              뒤로가기
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* 질문 입력 폼 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">질문 입력</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  과목 *
                </label>
                <input
                  ref={subjectInputRef}
                  type="text"
                  defaultValue={initialSubject}
                  placeholder="과목명을 입력하세요 (예: 자료구조, 회계원리)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  질문 내용 *
                </label>
                <textarea
                  ref={questionInputRef}
                  defaultValue={initialQuestion}
                  placeholder="질문 내용을 자세히 적어주세요"
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'AI 답변 생성 중...' : 'AI 답변 받기'}
              </button>
            </form>
          </div>

          {/* AI 답변 결과 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">AI 답변</h2>
            
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
            
            {answer && !isLoading && (
              <div className="space-y-4">
                {answer.title && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">제안 제목</h3>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-blue-900">{answer.title}</p>
                    </div>
                  </div>
                )}
                
                {answer.content && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">제안 내용</h3>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                      <p className="text-gray-900 whitespace-pre-wrap">{answer.content}</p>
                    </div>
                  </div>
                )}
                
                {answer.suggestions && answer.suggestions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">추가 제안사항</h3>
                    <ul className="space-y-2">
                      {answer.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span className="text-gray-700 text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleAskQuestion}
                    className="w-full px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    이 내용으로 질문하기
                  </button>
                </div>
              </div>
            )}
            
            {!answer && !isLoading && !error && (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">질문을 입력하고 AI 답변을 받아보세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AiAnswerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AiAnswerPageContent />
    </Suspense>
  );
} 