import {
  Question,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  Answer,
  CreateAnswerRequest,
  PaginatedResponse,
  ApiResponse,
  ApiError,
  QuestionListParams,
  SearchParams,
  FileUploadResponse,
  User,
  Statistics,
} from '../types/types'

// API 기본 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ;

// HTTP 클라이언트 유틸리티
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }));
        
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('알 수 없는 오류가 발생했습니다.');
    }
  }

  // GET 요청
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST 요청
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT 요청
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE 요청
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// API 클라이언트 인스턴스
const apiClient = new ApiClient(API_BASE_URL);

// 질문 관련 API
export const questionApi = {
  // 질문 목록 조회
  getList: async (params: QuestionListParams = {}): Promise<PaginatedResponse<Question>> => {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());
    if (params.subject) searchParams.append('subject', params.subject);
    if (params.hasAnswer !== undefined) searchParams.append('hasAnswer', params.hasAnswer.toString());
    if (params.isAdopted !== undefined) searchParams.append('isAdopted', params.isAdopted.toString());

    const queryString = searchParams.toString();
    const endpoint = `/questions/list${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get<PaginatedResponse<Question>>(endpoint);
  },

  // 질문 상세 조회
  getById: async (id: string): Promise<Question> => {
    return apiClient.get<Question>(`/questions/${id}`);
  },

  // 질문 생성
  create: async (data: CreateQuestionRequest): Promise<Question> => {
    return apiClient.post<Question>('/questions', data);
  },

  // 질문 수정
  update: async (id: string, data: UpdateQuestionRequest): Promise<Question> => {
    return apiClient.put<Question>(`/questions/${id}`, data);
  },

  // 질문 삭제
  delete: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/questions/${id}`);
  },

  // 질문 검색
  search: async (params: SearchParams): Promise<PaginatedResponse<Question>> => {
    const searchParams = new URLSearchParams();
    searchParams.append('q', params.q);
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    return apiClient.get<PaginatedResponse<Question>>(`/questions/search?${searchParams.toString()}`);
  },
};

// 답변 관련 API
export const answerApi = {
  // 질문의 답변 목록 조회
  getByQuestionId: async (questionId: string): Promise<Answer[]> => {
    return apiClient.get<Answer[]>(`/questions/${questionId}/answers`);
  },

  // 답변 생성
  create: async (questionId: string, data: CreateAnswerRequest): Promise<Answer> => {
    return apiClient.post<Answer>(`/questions/${questionId}/answers`, data);
  },

  // 답변 수정
  update: async (questionId: string, answerId: string, data: Partial<CreateAnswerRequest>): Promise<Answer> => {
    return apiClient.put<Answer>(`/questions/${questionId}/answers/${answerId}`, data);
  },

  // 답변 삭제
  delete: async (questionId: string, answerId: string): Promise<void> => {
    return apiClient.delete<void>(`/questions/${questionId}/answers/${answerId}`);
  },

  // 답변 채택
  adopt: async (questionId: string, answerId: string): Promise<void> => {
    return apiClient.put<void>(`/questions/${questionId}/answers/${answerId}/adopt`);
  },
};

// 파일 업로드 API
export const fileApi = {
  // 이미지 업로드
  uploadImage: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/upload/image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('이미지 업로드에 실패했습니다.');
    }

    return response.json();
  },

  // 파일 업로드
  uploadFile: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload/file`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('파일 업로드에 실패했습니다.');
    }

    return response.json();
  },
};

// 통계 API
export const statisticsApi = {
  // 전체 통계 조회
  getStatistics: async (): Promise<Statistics> => {
    return apiClient.get<Statistics>('/statistics');
  },

  // 과목별 통계 조회
  getStatisticsBySubject: async (subject: string): Promise<Statistics> => {
    return apiClient.get<Statistics>(`/statistics/subject/${encodeURIComponent(subject)}`);
  },
};

// 사용자 API
export const userApi = {
  // 사용자 정보 조회
  getProfile: async (): Promise<User> => {
    return apiClient.get<User>('/user/profile');
  },

  // 사용자 정보 수정
  updateProfile: async (data: Partial<User>): Promise<User> => {
    return apiClient.put<User>('/user/profile', data);
  },
};

// API 에러 처리 유틸리티
export const handleApiError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return '알 수 없는 오류가 발생했습니다.';
};

// API 응답 래퍼
export const createApiResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  data,
  message,
  success: true,
});

// 기본 API 객체 (모든 API를 포함)
export const api = {
  questions: questionApi,
  answers: answerApi,
  files: fileApi,
  statistics: statisticsApi,
  users: userApi,
}; 