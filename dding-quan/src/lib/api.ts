import { Question, CreateQuestionRequest, Answer, CreateAnswerRequest, PaginatedResponse, QuestionListParams, QuestionListItem, User, Professor, UserPostsResponse } from '../types/types';
import { getAccessToken, removeAccessToken, handleTokenExpired, saveAccessToken } from './auth';

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
    Authorization: `Bearer ${token}`,
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

// ------- S3 Presigned Upload Helpers (per Swagger: Storage) -------
async function getPresignedUploadUrl(key: string): Promise<string> {
  const url = `${BASE_URL}/api/storage/presign?` + new URLSearchParams({ key }).toString();
  const res = await authenticatedFetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to get presigned URL: ${res.status}`);
  const text = await res.text();
  return text.replace(/^"|"$/g, ''); // in case server returns JSON string
}

function uploadFileToS3WithProgress(presignedUrl: string, file: File, onProgress?: (loaded: number, total: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presignedUrl, true);
      // 주의: 일부 presign은 Content-Type을 서명에 포함하지 않음. 헤더를 설정하지 않아 불일치 방지.
      xhr.upload.onprogress = (e) => {
        if (onProgress && e.lengthComputable) onProgress(e.loaded, e.total);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}`));
      };
      xhr.onerror = () => reject(new Error('S3 upload network error (CORS or network)'));
      xhr.send(file);
    } catch (err) {
      reject(err);
    }
  });
}

function makeS3Key(prefix: string, file: File): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const p = prefix.replace(/\/+$/, '');
  return `${p}/${ts}-${rand}-${safeName}`;
}

async function presignAndUpload(prefix: string, files: File[] = [], onFileProgress?: (info: { index: number; file: File; percent: number }) => void): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const key = makeS3Key(prefix, f);
    const presigned = await getPresignedUploadUrl(key);
    await uploadFileToS3WithProgress(presigned, f, (loaded, total) => {
      if (onFileProgress) {
        const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
        onFileProgress({ index: i, file: f, percent });
      }
    });
    const publicUrl = presigned.split('?')[0];
    urls.push(publicUrl);
  }
  return urls;
}

// 질문 관련 API
export async function fetchQuestions(params: QuestionListParams = {}): Promise<PaginatedResponse<QuestionListItem>> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.append('page', params.page.toString());
  if (params.size !== undefined) searchParams.append('size', params.size.toString());
  if (params.subjectId) searchParams.append('subjectId', params.subjectId.toString());
  if (params.professorId) searchParams.append('professorId', params.professorId.toString());
  if (params.keyword) searchParams.append('keyword', params.keyword);
  if (params.status) searchParams.append('status', params.status);

  const queryString = searchParams.toString();
  const url = queryString ? `${BASE_URL}/api/questions?${queryString}` : `${BASE_URL}/api/questions`;

  console.log('질문 목록 API 호출:', url);

  const response = await authenticatedFetch(url, { method: 'GET' });

  console.log('질문 목록 API 응답:', response.status, response.statusText);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('질문 목록 API 에러:', response.status, errorText);
    throw new Error(`Failed to fetch questions: ${response.status}`);
  }

  const data: PaginatedResponse<QuestionListItem> = await response.json();
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

export async function createQuestion(questionData: CreateQuestionRequest, opts?: { onProgress?: (info: { index: number; file: File; percent: number }) => void }): Promise<Question> {
  // Swagger: POST /api/questions expects JSON with imageUrls (presigned upload)
  let imageUrls: string[] | undefined = undefined;
  if (questionData.files && questionData.files.length > 0) {
    imageUrls = await presignAndUpload('uploads/questions', questionData.files, opts?.onProgress);
  }

  const payload: { title: string; content: string; subjectId?: number; professorId?: number; imageUrls?: string[] } = {
    title: questionData.title,
    content: questionData.content,
    subjectId: questionData.subjectId,
    professorId: questionData.professorId,
    ...(imageUrls ? { imageUrls } : {}),
  };

  const response = await authenticatedFetch(`${BASE_URL}/api/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const t = await response.text().catch(() => '');
    throw new Error(`Failed to create question: ${response.status} ${t}`);
  }

  const data: Question = await response.json();
  return data;
}

export async function deleteQuestion(id: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch(`${BASE_URL}/api/questions/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete question: ${response.status}`);
  }
}

// 답변 관련 API
// New: combined answers feed (AI + users paginated)
export async function fetchCombinedAnswers(
  questionPostId: number,
  page = 0,
  size = 3
): Promise<{
  ai?: Answer | null;
  users: PaginatedResponse<Answer> | { content: Answer[]; totalElements: number; totalPages: number; size: number; number: number; first: boolean; last: boolean };
}> {
  const params = new URLSearchParams({ questionPostId: String(questionPostId), page: String(page), size: String(size) });
  const response = await authenticatedFetch(`${BASE_URL}/api/answers/combined?${params.toString()}`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to fetch combined answers: ${response.status}`);
  }
  return response.json();
}

export async function deleteAnswerById(id: number): Promise<void> {
  const response = await authenticatedFetch(`${BASE_URL}/api/answers/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const t = await response.text().catch(() => '');
    throw new Error(`Failed to delete answer: ${response.status} ${t}`);
  }
}

export async function createAnswer(answerData: CreateAnswerRequest & { title?: string }, opts?: { onProgress?: (info: { index: number; file: File; percent: number }) => void }): Promise<Answer> {
  // Swagger: POST /api/answers expects JSON with imageUrls
  let imageUrls: string[] | undefined = undefined;
  if (answerData.files && answerData.files.length > 0) {
    imageUrls = await presignAndUpload('uploads/answers', answerData.files, opts?.onProgress);
  }

  const payload: { title: string; content: string; questionPostId: number; imageUrls?: string[] } = {
    title: answerData.title || '답변',
    content: answerData.content,
    questionPostId: Number((answerData as { questionId?: string; questionPostId?: number }).questionId ?? (answerData as { questionPostId?: number }).questionPostId ?? 0),
    ...(imageUrls ? { imageUrls } : {}),
  };

  const response = await authenticatedFetch(`${BASE_URL}/api/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const t = await response.text().catch(() => '');
    throw new Error(`Failed to create answer: ${response.status} ${t}`);
  }

  const data: Answer = await response.json();
  return data;
}

export async function adoptAnswer(answerPostId: number): Promise<void> {
  const qs = new URLSearchParams({ answerPostId: String(answerPostId) }).toString();
  const response = await authenticatedFetch(`${BASE_URL}/api/answers/selection?${qs}`, { method: 'POST' });
  if (!response.ok) {
    let msg = '';
    try {
      msg = await response.text();
    } catch {}
    throw new Error(`Failed to adopt answer: ${response.status} ${msg || ''}`.trim());
  }
}

export async function unadoptAnswer(questionPostId: number): Promise<void> {
  const qs = new URLSearchParams({ questionPostId: String(questionPostId) }).toString();
  const response = await authenticatedFetch(`${BASE_URL}/api/answers/selection?${qs}`, { method: 'DELETE' });
  if (!response.ok) {
    let msg = '';
    try {
      msg = await response.text();
    } catch {}
    throw new Error(`Failed to unadopt answer: ${response.status} ${msg || ''}`.trim());
  }
}

// 과목 관련 API
export async function fetchSubjects(query: string): Promise<Array<{ id: number; name: string }>> {
  console.log('🔍 fetchSubjects 호출됨 - query:', query);

  const params = new URLSearchParams();
  if (query) params.set('query', query);
  const url = `${BASE_URL}/api/subjects/search?${params.toString()}`;

  console.log('🌐 API URL:', url);
  console.log('🔑 BASE_URL:', BASE_URL);

  try {
    console.log('📡 API 호출 시작...');
    const response = await authenticatedFetch(url, {
      method: 'GET',
    });

    console.log('📥 API 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      console.error('❌ API 호출 실패:', response.status, response.statusText);
      throw new Error(`Failed to fetch subjects: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ 과목 검색 결과:', data);
    return data;
  } catch (error) {
    console.error('💥 fetchSubjects 에러:', error);
    throw error;
  }
}

// 교수 관련 API
export async function fetchProfessorsBySubject(subjectId: number): Promise<Professor[]> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const params = new URLSearchParams({ subjectId: String(subjectId) });
  const url = `${BASE_URL}/api/professors/by-subject?${params.toString()}`;

  const response = await authenticatedFetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
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
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await authenticatedFetch(`${BASE_URL}/api/users/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.log(`사용자 프로필 조회 실패: ${response.status} ${response.statusText}`);
    throw new Error(`Failed to fetch user profile: ${response.status}`);
  }

  const data: User = await response.json();
  console.log('사용자 프로필 조회 성공');
  return data;
}

export async function completeUserProfile(profileData: { nickname: string; grade: string; major: string }): Promise<User> {
  const token = getToken();
  if (!token) throw new Error('Authentication required');

  const response = await authenticatedFetch(`${BASE_URL}/api/users/complete-profile`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to complete profile: ${response.status}`);
  }

  const data: User = await response.json();
  return data;
}

// AI 관련 API
export async function generateAIResponse(prompt: Record<string, string>): Promise<Record<string, string>> {
  const response = await authenticatedFetch(`${BASE_URL}/api/ai/generate`, {
    method: 'POST',
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

  const response = await authenticatedFetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  removeAccessToken();

  if (!response.ok) {
    console.warn('Logout request failed, but token was removed locally');
  }
}

// 리프레시 토큰으로 액세스 토큰 갱신
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('REFRESH_TOKEN');
  const accessToken = getAccessToken(); // 현재 액세스 토큰 가져오기

  if (!refreshToken) {
    console.log('리프레시 토큰이 없습니다.');
    return false;
  }

  try {
    // 액세스 토큰이 있으면 헤더에 포함, 없으면 헤더에서 제외
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    // 리프레시 토큰으로 토큰 갱신 요청
    const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.log(`토큰 갱신 실패: ${response.status}`);
      if (response.status === 401) handleTokenExpired();
      return false;
    }

    const data: { accessToken?: string; refreshToken?: string; message?: string } = await response.json();
    console.log('토큰 갱신 응답:', data);

    if (data.accessToken) {
      saveAccessToken(data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('REFRESH_TOKEN', data.refreshToken);
      }
      console.log('토큰 갱신 성공');
      return true;
    }

    return false;
  } catch (error) {
    console.error('토큰 갱신 중 에러:', error);
    return false;
  }
}

export async function checkAuth(): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await authenticatedFetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

// startGoogleLogin 함수 내부
export function startGoogleLogin(): void {
  if (typeof window !== 'undefined') {
    const loginUrl = `${BASE_URL}/oauth2/authorization/google`;

    try {
      console.log('구글 OAuth2 페이지로 리다이렉트 중...');
      window.location.href = loginUrl;
    } catch (error) {
      console.error('리다이렉트 중 에러 발생:', error);
      alert('페이지 이동 중 오류가 발생했습니다.');
    }
  }
}

// 기존 코드와의 호환성을 위한 객체 형태 API
export const questionApi = {
  getList: fetchQuestions,
  getById: fetchDetailQuestion,
  create: createQuestion,
  delete: deleteQuestion,
};

export const answerApi = {
  // New combined feed
  getCombined: fetchCombinedAnswers,
  create: createAnswer,
  adopt: adoptAnswer,
  delete: deleteAnswerById,
  unadopt: unadoptAnswer,
};

// ----- Comment APIs -----
type ThreadItem = {
  parent: { id: number; nickname?: string; content: string; createdAt?: string; imageUrls?: string[] };
  replies: Array<{ id: number; nickname?: string; content: string; createdAt?: string; imageUrls?: string[] }>;
};

export async function fetchComments(
  answerPostId: number,
  page = 0,
  size = 10
): Promise<{ content: ThreadItem[]; page?: number; size?: number; totalElements?: number; totalPages?: number; last?: boolean }> {
  const params = new URLSearchParams({ answerPostId: String(answerPostId), page: String(page), size: String(size) });
  const res = await authenticatedFetch(`${BASE_URL}/api/comments?${params.toString()}`, { method: 'GET' });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Failed to fetch comments: ${res.status} ${t}`);
  }
  return res.json();
}

export async function createComment(
  data: { answerPostId: number; content: string; files?: File[] },
  opts?: { onProgress?: (info: { index: number; file: File; percent: number }) => void }
): Promise<void> {
  let imageUrls: string[] | undefined = undefined;
  if (data.files && data.files.length > 0) {
    imageUrls = await presignAndUpload('uploads/comments', data.files, opts?.onProgress);
  }
  const payload: { answerPostId: number; content: string; imageUrls?: string[] } = { answerPostId: data.answerPostId, content: data.content, ...(imageUrls ? { imageUrls } : {}) };
  const res = await authenticatedFetch(`${BASE_URL}/api/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Failed to create comment: ${res.status} ${t}`);
  }
}

export async function createReply(
  data: { parentCommentId: number; content: string; files?: File[] },
  opts?: { onProgress?: (info: { index: number; file: File; percent: number }) => void }
): Promise<void> {
  let imageUrls: string[] | undefined = undefined;
  if (data.files && data.files.length > 0) {
    imageUrls = await presignAndUpload('uploads/comments', data.files, opts?.onProgress);
  }
  const payload: { parentCommentId: number; content: string; imageUrls?: string[] } = { parentCommentId: data.parentCommentId, content: data.content, ...(imageUrls ? { imageUrls } : {}) };
  const res = await authenticatedFetch(`${BASE_URL}/api/comments/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Failed to create reply: ${res.status} ${t}`);
  }
}

export async function deleteComment(commentId: number): Promise<void> {
  const res = await authenticatedFetch(`${BASE_URL}/api/comments/${commentId}`, { method: 'DELETE' });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Failed to delete comment: ${res.status} ${t}`);
  }
}

export const commentApi = {
  list: fetchComments,
  create: createComment,
  reply: createReply,
  delete: deleteComment,
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
      type: 'question_suggestion',
    });
  },
};

export const authApi = {
  startGoogleLogin,
  logout,
  checkAuth,
};
// ----- User posts (history) -----
export async function fetchUserPosts(page = 0, size = 10, opts?: { keyword?: string; postType?: 'QUESTION' | 'ANSWER' }): Promise<UserPostsResponse> {
  const sp = new URLSearchParams();
  sp.set('page', String(page));
  if (typeof size === 'number') sp.set('size', String(size));
  if (opts?.keyword) sp.set('keyword', opts.keyword);
  if (opts?.postType) {
    // 서버 호환: type/postType 모두 지원 (안전성 확보)
    sp.set('type', opts.postType);
    sp.set('postType', opts.postType);
  }
  const url = `${BASE_URL}/api/users/posts${sp.toString() ? `?${sp.toString()}` : ''}`;
  if (process.env.NODE_ENV === 'development') console.log('GET /api/users/posts:', url);
  const res = await authenticatedFetch(url, { method: 'GET' });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Failed to fetch user posts: ${res.status} ${t}`);
  }
  return res.json();
}

export const historyApi = {
  getMyPosts: fetchUserPosts,
};
