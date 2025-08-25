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
import { getAccessToken, removeAccessToken } from './auth';

// API 기본 설정
const BASE_URL = process.env.NEXT_PUBLIC_API_SERVER_URL;
console.log('API BASE_URL:', BASE_URL);



// 토큰 관리 유틸리티
const getToken = (): string | null => {
  const token = getAccessToken();
  console.log('API 호출용 토큰 조회:', token ? '토큰 있음' : '토큰 없음');
  return token;
};

// 질문 관련 API
export async function fetchQuestions(params: QuestionListParams = {}): Promise<PaginatedResponse<Question>> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.append('page', params.page.toString());
  if (params.size !== undefined) searchParams.append('size', params.size.toString());
  if (params.subjectId) searchParams.append('subjectId', params.subjectId.toString());
  if (params.professorId) searchParams.append('professorId', params.professorId.toString());

  const queryString = searchParams.toString();
  const url = `${BASE_URL}/api/questions${queryString ? `?${queryString}` : ''}`;
  
  console.log('질문 목록 API 호출:', url);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
  });

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

export async function fetchQuestion(id: string): Promise<Question> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/questions/${id}`, {
    method: 'GET',
    headers: {
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch question: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function createQuestion(questionData: CreateQuestionRequest): Promise<Question> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

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

  const response = await fetch(`${BASE_URL}/api/questions`, {
    method: 'POST',
    headers: {
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
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
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete question: ${response.status}`);
  }
}

// 답변 관련 API
export async function fetchAnswers(questionId: string): Promise<Answer[]> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/answers/combined?questionPostId=${questionId}`, {
    method: 'GET',
    headers: {
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
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

  const response = await fetch(`${BASE_URL}/api/user-answers?questionPostId=${answerData.questionId}`, {
    method: 'POST',
    headers: {
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to create answer: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function adoptAnswer(answerId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/answers/selection?answerPostId=${answerId}`, {
    method: 'POST',
    headers: {
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to adopt answer: ${response.status}`);
  }
}

// 과목 관련 API
export async function fetchSubjects(query: string): Promise<Array<{ id: number; name: string }>> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/subjects/search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: {
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch subjects: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// 교수 관련 API
export async function fetchProfessorsBySubject(subjectId: number): Promise<Professor[]> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/professors/by-subject?subjectId=${subjectId}`, {
    method: 'GET',
    headers: {
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch professors: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// 사용자 관련 API
export async function fetchUserProfile(): Promise<User> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/users/me`, {
    method: 'GET',
    headers: {
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

export async function completeUserProfile(profileData: { nickname: string; grade: string; major: string; email: string }): Promise<User> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/users/complete-profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
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
      'Content-Type': 'application/json',
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
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
      Cookie: `ACCESS_TOKEN=${token}`,
    },
    credentials: 'include',
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
        Cookie: `ACCESS_TOKEN=${token}`,
      },
      credentials: 'include',
    });

    return response.ok;
  } catch {
    return false;
  }
}

export function startGoogleLogin(): void {
  if (typeof window !== 'undefined') {
    const loginUrl = `${BASE_URL}/login/oauth2/code/google`;
    console.log('구글 로그인 시작:', {
      currentUrl: window.location.href,
      userAgent: navigator.userAgent
    });
    
    // URL이 ASCII 문자만 포함하는지 확인
    const isValidUrl = /^[!-~\s]*$/.test(loginUrl);
    if (isValidUrl) {
      console.log('구글 OAuth2 페이지로 리다이렉트 중...');
      window.location.href = loginUrl;
    } else {
      console.error('Invalid URL contains non-ASCII characters:', loginUrl);
      alert('Login URL is invalid. Please contact support.');
    }
  }
}

// 기존 코드와의 호환성을 위한 객체 형태 API
export const questionApi = {
  getList: fetchQuestions,
  getById: fetchQuestion,
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
