// API 관련 타입 정의

// 기본 질문 타입
export interface Question {
  id: string;
  title: string;
  subject: string;
  content: string;
  createdAt: string;
  hasAnswer?: boolean;
  isAdopted?: boolean;
}

// 질문 생성 요청 타입
export interface CreateQuestionRequest {
  title: string;
  subject: string;
  content: string;
}

// 질문 수정 요청 타입
export interface UpdateQuestionRequest {
  title?: string;
  subject?: string;
  content?: string;
}

// 답변 타입
export interface Answer {
  id: string;
  questionId: string;
  content: string;
  author: string;
  createdAt: string;
  isAdopted?: boolean;
}

// 답변 생성 요청 타입
export interface CreateAnswerRequest {
  content: string;
  author: string;
}

// 페이지네이션 응답 타입
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// API 응답 타입
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// 에러 응답 타입
export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

// 질문 목록 조회 파라미터
export interface QuestionListParams {
  page?: number;
  pageSize?: number;
  subject?: string;
  hasAnswer?: boolean;
  isAdopted?: boolean;
}

// 검색 파라미터
export interface SearchParams {
  q: string;
  page?: number;
  pageSize?: number;
}

// 파일 업로드 응답
export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
}

// 사용자 정보 타입
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// 통계 정보 타입
export interface Statistics {
  totalQuestions: number;
  totalAnswers: number;
  adoptedAnswers: number;
  unansweredQuestions: number;
} 