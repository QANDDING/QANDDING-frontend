import {
  Question,
  CreateQuestionRequest,
  Answer,
  CreateAnswerRequest,
  PaginatedResponse,
  QuestionListParams,
  User,
  Professor,
} from '../types/types'
import { getAccessToken, removeAccessToken, handleTokenExpired, refreshAccessToken } from './auth';

// API 기본 설정
const BASE_URL = process.env.NEXT_PUBLIC_API_SERVER_URL;
// 개발 환경에서만 BASE_URL 로그 출력
if (process.env.NODE_ENV === 'development') {
  console.log('API BASE_URL 설정됨');
}



// 토큰 관리 유틸리티
const getToken = (): string | null => {
  const token = getAccessToken();
  if (!token) {
    console.log('API 호출용 토큰 없음 - 인증 필요');
  }
  return token;
};

// 인증 에러 처리 유틸리티
const handleAuthError = (response: Response): void => {
  if (response.status === 401) {
    console.log('토큰이 만료되었거나 무효합니다.');
    handleTokenExpired();
  }
};

// 공통 fetch 래퍼 함수 (자동 토큰 갱신 포함)
const authenticatedFetch = async (url: string, options: RequestInit = {}, isRetry = false): Promise<Response> => {
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  // 기본 헤더 설정
  const defaultHeaders: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // FormData인 경우 Content-Type 제거 (브라우저가 자동 설정)
  if (options.body instanceof FormData) {
    delete defaultHeaders['Content-Type'];
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  // 401 에러 처리 - 리프레시 토큰으로 재시도
  if (response.status === 401 && !isRetry) {
    console.log('401 에러 발생, 리프레시 토큰으로 재시도...');
    
    const refreshSuccess = await refreshAccessToken();
    if (refreshSuccess) {
      console.log('토큰 갱신 성공, API 재호출');
      // 토큰 갱신 성공 시 같은 요청을 다시 시도 (무한 루프 방지를 위해 isRetry = true)
      return authenticatedFetch(url, options, true);
    } else {
      console.log('토큰 갱신 실패, 로그아웃 처리');
      handleAuthError(response);
      throw new Error('Authentication failed');
    }
  }

  // 두 번째 시도에서도 401이면 완전히 실패
  if (response.status === 401 && isRetry) {
    console.log('토큰 갱신 후에도 401 에러, 완전한 인증 실패');
    handleAuthError(response);
    throw new Error('Authentication failed');
  }

  return response;
};

// 질문 관련 API
export async function fetchQuestions(params: QuestionListParams = {}): Promise<PaginatedResponse<Question>> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.append('page', params.page.toString());
  if (params.size !== undefined) searchParams.append('size', params.size.toString());
  if (params.subjectId) searchParams.append('subjectId', params.subjectId.toString());
  if (params.professorId) searchParams.append('professorId', params.professorId.toString());

  const queryString = searchParams.toString();
  const url = `${BASE_URL}/api/questions`;
  
  console.log('질문 목록 API 호출:', url);
  
  const response = await authenticatedFetch(url, { method: 'GET' });

  console.log('질문 목록 API 응답:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('질문 목록 API 에러:', response.status, errorText);
    throw new Error(`Failed to fetch questions: ${response.status}`);
  }

  const data = await response.json();
  console.log('질문 목록 데이터:', data);
  return data;
}

export async function fetchDetailQuestion(id: string): Promise<Question> {
  const response = await authenticatedFetch(`${BASE_URL}/api/questions/${id}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch question: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function createQuestion(questionData: CreateQuestionRequest): Promise<Question> {
  const formData = new FormData();
  formData.append('title', questionData.title);
  formData.append('content', questionData.content);
  if (questionData.subjectId) formData.append('subjectId', questionData.subjectId.toString());
  if (questionData.professorId) formData.append('professorId', questionData.professorId.toString());
  
  if (questionData.files) {
    questionData.files.forEach(file => {
      if (file instanceof File) {
        formData.append('files', file);
      }
    });
  }

  const response = await authenticatedFetch(`${BASE_URL}/api/questions`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to create question: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function deleteQuestion(id: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/questions/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete question: ${response.status}`);
  }
}

// 답변 관련 API
export async function fetchAnswers(questionId: number): Promise<Answer[]> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/user-answers/${questionId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch answers: ${response.status}`);
  }

  const data = await response.json();
  return data.users?.content || [];
}

export async function createAnswer(answerData: CreateAnswerRequest & { title?: string }): Promise<Answer> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const formData = new FormData();
  formData.append('title', answerData.title || '답변');
  formData.append('content', answerData.content);
  
  if (answerData.files) {
    answerData.files.forEach(file => {
      if (file instanceof File) {
        formData.append('files', file);
      }
    });
  }

  const response = await fetch(`${BASE_URL}/api/user-answers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to create answer: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function adoptAnswer(): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/answers/selection`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to adopt answer: ${response.status}`);
  }
}

// 과목 관련 API
export async function fetchSubjects(): Promise<Array<{ id: number; name: string }>> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/subjects/search`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subjects: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// 교수 관련 API
export async function fetchProfessorsBySubject(): Promise<Professor[]> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/professors/by-subject`, {
    method: 'GET',  
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch professors: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// 사용자 관련 API
export async function fetchUserProfile(): Promise<User> {
  const response = await authenticatedFetch(`${BASE_URL}/api/users/me`, {
    method: 'GET',
  });

  if (!response.ok) {
    console.log(`사용자 프로필 조회 실패: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to fetch user profile: ${response.status}`);
  }

  const data = await response.json();
  console.log('사용자 프로필 조회 성공');
  return data;
}

export async function completeUserProfile(profileData: { nickname: string; grade: string; major: string; email: string }): Promise<User> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/users/complete-profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    throw new Error(`Failed to complete profile: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// AI 관련 API
export async function generateAIResponse(prompt: Record<string, string>): Promise<Record<string, string>> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/ai/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(prompt),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate AI response: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// 인증 관련 API
export async function logout(): Promise<void> {
  const token = getToken();
  if (!token) return;

  const response = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  removeAccessToken();
  
  if (!response.ok) {
    console.warn('Logout request failed, but token was removed locally');
  }
}

export async function checkAuth(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await fetch(`${BASE_URL}/api/auth/check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

export function startGoogleLogin(): void {
  if (typeof window !== 'undefined') {
    const loginUrl = `${BASE_URL}/login`;
    // 개발 환경에서만 상세 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log('구글 로그인 시작:', {
        currentUrl: window.location.href,
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        baseUrlSet: !!BASE_URL
      });
    } else {
      console.log('구글 로그인 시작');
    }
    
    // BASE_URL이 제대로 설정되었는지 확인
    if (!BASE_URL) {
      console.error('BASE_URL이 설정되지 않았습니다!');
      alert('서버 URL이 설정되지 않았습니다. 관리자에게 문의하세요.');
      return;
    }
    
    // URL이 ASCII 문자만 포함하는지 확인
    const isValidUrl = /^[!-~\s]*$/.test(loginUrl);
    if (isValidUrl) {
      console.log('구글 OAuth2 페이지로 리다이렉트 중...');
      // 개발 환경에서만 리다이렉트 URL 로그 출력
      if (process.env.NODE_ENV === 'development') {
        console.log('리다이렉트 URL:', loginUrl);
      }
      
      try {
        // 여러 리다이렉트 방법 시도
        console.log('방법 1: window.location.href 시도');
        window.location.href = loginUrl;
        
        // 대안 방법들을 순차적으로 시도
        setTimeout(() => {
          if (window.location.href.includes('/login')) {
            console.log('방법 2: window.location.assign 시도');
            window.location.assign(loginUrl);
            
            setTimeout(() => {
              if (window.location.href.includes('/login')) {
                console.log('방법 3: window.open 시도');
                const popup = window.open(loginUrl, '_self');
                if (!popup) {
                  console.error('팝업이 차단되었습니다');
                  alert('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.');
                }
              }
            }, 1000);
          }
        }, 1000);
        
      } catch (error) {
        console.error('리다이렉트 중 에러 발생:', error);
        alert('페이지 이동 중 오류가 발생했습니다.');
      }
    } else {
      console.error('Invalid URL contains non-ASCII characters:', loginUrl);
      alert('Login URL is invalid. Please contact support.');
    }
  }
}

// 기존 코드와의 호환성을 위한 객체 형태 API
export const questionApi = {
  getList: fetchQuestions,
  create: createQuestion,
  delete: deleteQuestion,
};

export const answerApi = {
  getByQuestionId: fetchAnswers,
  create: createAnswer,
  adopt: adoptAnswer,
};

export const subjectsApi = {
  search: fetchSubjects,
};

export const professorApi = {
  getBySubjectId: fetchProfessorsBySubject,
};

export const userApi = {
  getProfile: fetchUserProfile,
  completeProfile: completeUserProfile,
};

export const aiApi = {
  generate: generateAIResponse,
  suggestQuestion: async (data: { subject: string; content: string }) => {
    return generateAIResponse({
      subject: data.subject,
      content: data.content,
      type: 'question_suggestion'
    });
  },
};

export const authApi = {
  startGoogleLogin,
  logout,
  checkAuth,
};
