# API 사용법 가이드

## 📁 파일 구조
```
src/
├── types/
│   └── api.ts          # API 관련 타입 정의
├── lib/
│   └── api.ts          # API 함수들
```

## 🚀 기본 사용법

### 1. 질문 관련 API

```typescript
import { questionApi } from '@/lib/api';

// 질문 목록 조회
const questions = await questionApi.getList({
  page: 1,
  pageSize: 20,
  subject: '수학',
  hasAnswer: true
});

// 질문 상세 조회
const question = await questionApi.getById('123');

// 질문 생성
const newQuestion = await questionApi.create({
  title: '질문 제목',
  subject: '수학',
  content: '질문 내용'
});

// 질문 수정
const updatedQuestion = await questionApi.update('123', {
  title: '수정된 제목'
});

// 질문 삭제
await questionApi.delete('123');

// 질문 검색
const searchResults = await questionApi.search({
  q: '검색어',
  page: 1,
  pageSize: 10
});
```

### 2. 답변 관련 API

```typescript
import { answerApi } from '@/lib/api';

// 답변 목록 조회
const answers = await answerApi.getByQuestionId('123');

// 답변 생성
const newAnswer = await answerApi.create('123', {
  content: '답변 내용',
  author: '답변자'
});

// 답변 수정
const updatedAnswer = await answerApi.update('123', '456', {
  content: '수정된 답변'
});

// 답변 삭제
await answerApi.delete('123', '456');

// 답변 채택
await answerApi.adopt('123', '456');
```

### 3. 파일 업로드 API

```typescript
import { fileApi } from '@/lib/api';

// 이미지 업로드
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
if (fileInput.files?.[0]) {
  const uploadResult = await fileApi.uploadImage(fileInput.files[0]);
  console.log('업로드된 이미지 URL:', uploadResult.url);
}

// 파일 업로드
const fileUploadResult = await fileApi.uploadFile(file);
```

### 4. 통계 API

```typescript
import { statisticsApi } from '@/lib/api';

// 전체 통계 조회
const stats = await statisticsApi.getStatistics();
console.log('총 질문 수:', stats.totalQuestions);

// 과목별 통계 조회
const subjectStats = await statisticsApi.getStatisticsBySubject('수학');
```

### 5. 사용자 API

```typescript
import { userApi } from '@/lib/api';

// 사용자 정보 조회
const profile = await userApi.getProfile();

// 사용자 정보 수정
const updatedProfile = await userApi.updateProfile({
  name: '새로운 이름'
});
```

## 🔧 에러 처리

```typescript
import { questionApi, handleApiError } from '@/lib/api';

try {
  const questions = await questionApi.getList();
} catch (error) {
  const errorMessage = handleApiError(error);
  console.error('API 오류:', errorMessage);
  // 사용자에게 오류 메시지 표시
}
```

## 🎯 React 컴포넌트에서 사용

```typescript
import { useState, useEffect } from 'react';
import { questionApi, Question } from '@/lib/api';

export default function QuestionList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const result = await questionApi.getList({ page: 1, pageSize: 10 });
        setQuestions(result.items);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>오류: {error}</div>;

  return (
    <div>
      {questions.map(question => (
        <div key={question.id}>
          <h3>{question.title}</h3>
          <p>{question.content}</p>
        </div>
      ))}
    </div>
  );
}
```

## ⚙️ 환경 변수 설정

`.env.local` 파일에 API URL을 설정하세요:

```env
NEXT_PUBLIC_API_URL=https://qandding.store/api
```

## 📝 타입 활용

```typescript
import { 
  Question, 
  CreateQuestionRequest, 
  PaginatedResponse 
} from '@/types/api';

// 컴포넌트 props 타입
interface QuestionListProps {
  questions: Question[];
  onQuestionSelect: (question: Question) => void;
}

// 함수 파라미터 타입
const createQuestion = async (data: CreateQuestionRequest): Promise<Question> => {
  return questionApi.create(data);
};

// 상태 타입
const [questions, setQuestions] = useState<Question[]>([]);
const [pagination, setPagination] = useState<PaginatedResponse<Question> | null>(null);
```

## 🔄 전체 API 객체 사용

```typescript
import { api } from '@/lib/api';

// 모든 API에 접근 가능
const questions = await api.questions.getList();
const answers = await api.answers.getByQuestionId('123');
const stats = await api.statistics.getStatistics();
const profile = await api.users.getProfile();
``` 