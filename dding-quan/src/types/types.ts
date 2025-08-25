// API 관련 타입 정의 (스웨거 명세 기준)

// 기본 질문 타입
export interface Question {
  id: string;
  title: string;
  subject: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  hasAnswer?: boolean;
  isAdopted?: boolean;
  authorId?: string;
  authorName?: string;
  // 교수 정보
  professorId?: string;
  professorName?: string;
  // 파일 정보
  files?: Array<{
    id: string;
    filename: string;
    url: string;
    fileType: string;
  }>;
}

// 질문 생성 요청 타입
export interface CreateQuestionRequest {
  title: string;
  content: string;
  subjectId?: number;
  professorId?: number;
  files?: File[]; // 파일 객체 배열
}

// 질문 수정 요청 타입
export interface UpdateQuestionRequest {
  title?: string;
  subject?: string;
  content?: string;
  professorId?: string;
  professorName?: string;
  files?: string[];
}

// 답변 타입
export interface Answer {
  id: string;
  questionId: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
  isAdopted?: boolean;
  files?: Array<{
    id: string;
    filename: string;
    url: string;
    fileType: string;
  }>;
}

// 답변 생성 요청 타입
export interface CreateAnswerRequest {
  content: string;
  questionId: string;
  title?: string;
  files?: File[]; // 파일 객체 배열
}

// 페이지네이션 응답 타입 (스웨거 명세에 맞춰 수정)
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
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
  timestamp?: string;
}

// 질문 목록 조회 파라미터 (스웨거 명세에 맞춰 수정)
export interface QuestionListParams {
  page?: number;
  size?: number; // pageSize 대신 size 사용
  subjectId?: number;
  professorId?: number;
  hasAnswer?: boolean;
  isAdopted?: boolean;
  authorId?: number;
}

// 검색 파라미터
export interface SearchParams {
  q: string;
  page?: number;
  size?: number; // pageSize 대신 size 사용
}

// 파일 업로드 응답
export interface FileUploadResponse {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  fileType: string;
  size: number;
  uploadedAt: string;
}

// 사용자 정보 타입 (스웨거 명세에 맞춰 확장)
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  introduction?: string;
  createdAt: string;
  updatedAt?: string;
  role?: 'USER' | 'ADMIN';
}

// 통계 정보 타입
export interface Statistics {
  totalQuestions: number;
  totalAnswers: number;
  adoptedAnswers: number;
  unansweredQuestions: number;
  totalUsers: number;
  totalProfessors: number;
}

// 교수 정보 타입 (스웨거 명세에 맞춰 확장)
export interface Professor {
  id: number;
  name: string;
  subjectId?: number;
  subjectName?: string;
  email?: string;
  phone?: string;
  office?: string;
  department?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 과목 정보 타입
export interface Subject {
  id: number;
  name: string;
  code?: string;
  description?: string;
  department?: string;
  credits?: number;
  createdAt?: string;
  updatedAt?: string;
}

// AI 관련 타입
export interface AiSuggestRequest {
  subject: string;
  content: string;
  context?: string;
}

export interface AiSuggestResponse {
  title?: string;
  content?: string;
  suggestions?: string[];
}

// 인증 관련 타입
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// 공통 응답 래퍼
export interface BaseResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}