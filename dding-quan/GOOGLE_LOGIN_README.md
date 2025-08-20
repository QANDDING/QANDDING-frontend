# 구글 로그인 토큰 처리 및 페이지 이동 가이드

## 개요
이 프로젝트는 구글 로그인 후 토큰을 처리하고, 인증 상태에 따라 적절한 페이지로 이동하는 기능을 제공합니다.

## 주요 기능

### 1. 인증 상태 확인
- `isAuthenticated()`: 사용자 인증 상태와 토큰 존재 여부를 확인
- `checkAuthAndRedirect()`: 인증 상태를 확인하고 필요시 로그인 페이지로 리다이렉트

### 2. 토큰 관리
- `saveAccessToken(token)`: 액세스 토큰을 로컬 스토리지에 저장
- `getAccessToken()`: 저장된 액세스 토큰을 가져오기
- `removeAccessToken()`: 액세스 토큰 제거

### 3. 페이지 이동
- `redirectToMain()`: 메인 페이지로 이동
- `requireAuth()`: 보호된 라우트에서 인증 요구

## 사용법

### 1. 로그인 페이지에서 구글 로그인 처리

```tsx
import { handleGoogleLoginSuccess, redirectToMain } from '@/lib/auth';

// 구글 로그인 성공 후
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const userData = urlParams.get('user');
  
  if (token && userData) {
    try {
      const user = JSON.parse(decodeURIComponent(userData));
      // 구글 로그인 성공 처리
      handleGoogleLoginSuccess(token, user);
      
      // 메인 페이지로 이동
      redirectToMain();
    } catch (error) {
      console.error('사용자 정보 파싱 실패:', error);
    }
  }
}, []);
```

### 2. 보호된 라우트에서 인증 확인

```tsx
import { requireAuth } from '@/lib/auth';

export default function ProtectedPage() {
  useEffect(() => {
    // 인증되지 않은 경우 로그인 페이지로 이동
    if (!requireAuth()) {
      return;
    }
    
    // 인증된 경우에만 실행할 코드
  }, []);
  
  return <div>보호된 콘텐츠</div>;
}
```

### 3. AuthGuard 컴포넌트 사용

```tsx
import AuthGuard from '@/components/AuthGuard';

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <div>보호된 콘텐츠</div>
    </AuthGuard>
  );
}
```

### 4. useAuth 훅 사용

```tsx
import { useAuth } from '@/components/AuthGuard';

export default function MyComponent() {
  const { isAuth, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>로딩 중...</div>;
  }
  
  if (!isAuth) {
    return <div>로그인이 필요합니다.</div>;
  }
  
  return <div>인증된 사용자만 볼 수 있는 콘텐츠</div>;
}
```

## 인증 플로우

1. **구글 로그인 시작**: 사용자가 구글 로그인 버튼 클릭
2. **구글 OAuth**: 구글에서 인증 처리 후 콜백 URL로 리다이렉트
3. **토큰 처리**: 콜백 URL에서 토큰과 사용자 정보 추출
4. **로컬 저장**: 토큰과 사용자 정보를 로컬 스토리지에 저장
5. **페이지 이동**: 메인 페이지로 자동 이동

## 보안 고려사항

- 토큰은 로컬 스토리지에 저장되므로 XSS 공격에 취약할 수 있습니다
- 프로덕션 환경에서는 HttpOnly 쿠키 사용을 고려하세요
- 토큰 만료 시간을 설정하고 주기적으로 갱신하는 것을 권장합니다

## 에러 처리

- 토큰 파싱 실패 시 사용자에게 알림
- 네트워크 오류 시 적절한 에러 메시지 표시
- 인증 실패 시 자동으로 로그인 페이지로 리다이렉트

## 파일 구조

```
src/
├── lib/
│   ├── auth.ts          # 인증 관련 유틸리티 함수
│   └── api.ts           # API 호출 함수
├── components/
│   └── AuthGuard.tsx    # 인증 보호 컴포넌트
└── app/
    ├── login/
    │   └── page.tsx     # 로그인 페이지
    └── page.tsx         # 메인 페이지 (보호됨)
``` 