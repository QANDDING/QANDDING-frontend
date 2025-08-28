"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout, getAccessToken, getAuthUser } from "@/lib/auth";
import { refreshAccessToken } from "@/lib/api";
import { History, House, MessageSquareText, FileQuestionMark, Hourglass, Repeat2, LogOut } from "lucide-react";
import toast from "react-hot-toast";


export default function NavBar() {
  const router = useRouter();
  const [tokenStatus, setTokenStatus] = useState<
    "checking" | "valid" | "expired" | "none"
  >("checking");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 토큰 상태 확인 함수
  const checkTokenStatus = () => {
    const token = getAccessToken();
    const user = getAuthUser();

    if (!token || !user) {
      setTokenStatus("none");
      return;
    }

    try {
      // JWT 토큰 만료 시간 확인
      const tokenParts = token.split(".");
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        const currentTime = Math.floor(Date.now() / 1000);

        console.log("토큰 만료 시간 확인:", {
          현재시간: new Date(currentTime * 1000).toLocaleString("ko-KR", {
            timeZone: "Asia/Seoul",
          }),
          만료시간: payload.exp
            ? new Date(payload.exp * 1000).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
              })
            : "없음",
          남은시간분: payload.exp
            ? Math.round((payload.exp - currentTime) / 60)
            : 0,
          토큰일부: token.substring(0, 20) + "...",
        });

        if (payload.exp && payload.exp < currentTime) {
          setTokenStatus("expired");
          console.log("🔴 토큰 만료됨 - 갱신 버튼 표시");
        } else {
          setTokenStatus("valid");
          console.log("🟢 토큰 유효함 - 갱신 버튼 표시");
        }
      } else {
        setTokenStatus("valid"); // JWT가 아닌 경우 일단 유효한 것으로 처리
      }
    } catch (error) {
      console.error("토큰 파싱 에러:", error);
      setTokenStatus("valid");
    }
  };

  // 토큰 상태 확인
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("NavBar 초기화 - 토큰 상태 확인 시작");
    }
    checkTokenStatus();
    // 1분마다 토큰 상태 재확인
    const interval = setInterval(checkTokenStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleRefreshToken = async () => {
    if (process.env.NODE_ENV === "development")
      console.log("🔴 handleRefreshToken 함수 시작");
    setIsRefreshing(true);
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("수동 토큰 갱신 시도...");
        console.log("refreshAccessToken 함수 호출 직전");
      }
      const success = await refreshAccessToken();
      if (process.env.NODE_ENV === "development")
        console.log("refreshAccessToken 함수 호출 완료, 결과:", success);

      if (success) {
        if (process.env.NODE_ENV === "development")
          console.log("토큰 갱신 성공 - UI 상태 업데이트");
        // 토큰 상태 즉시 재확인
        checkTokenStatus();
        // 강제로 상태 업데이트 (약간의 지연 후)
        setTimeout(() => {
          checkTokenStatus();
        }, 100);
        toast.success("토큰 갱신 성공! 🎉");
      } else {
        setTokenStatus("expired");
        toast.error("토큰 갱신 실패. 다시 로그인해주세요.");
        handleLogout();
      }
    } catch (error) {
      console.error("토큰 갱신 에러:", error);
      toast.error("토큰 갱신 중 에러가 발생했습니다.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTokenStatusInfo = () => {
    switch (tokenStatus) {
      case "valid":
        return { color: "text-green-600",  title: "토큰 유효" };
      case "expired":
        return { color: "text-red-600", title: "토큰 만료" };
      case "none":
        return { color: "text-gray-400",  title: "토큰 없음" };
      default:
        return {
          color: "text-yellow-600",
          text: <Hourglass />,
          title: "확인 중",
        };
    }
  };

  const statusInfo = getTokenStatusInfo();

  // 운영 콘솔 노이즈 방지: 개발 모드에서만 상태 로그
  if (process.env.NODE_ENV === "development") {
    console.log(
      "현재 tokenStatus:",
      tokenStatus,
      "버튼 표시 여부:",
      tokenStatus !== "none" &&
        (tokenStatus === "expired" || tokenStatus === "valid")
    );
  }

  return (
    <header className="w-full flex items-center justify-between px-6 py-4">
      {/* 로고: 클릭 시 메인 이동 */}
      <Link
        href="/"
        className="flex items-center gap-2 select-none"
        aria-label="홈으로 이동"
      >
        <Image
          src="/logo.png"
          alt="띵콴 로고"
          width={32}
          height={32}
          className="h-8 w-auto"
        />
        <span className="sr-only">띵콴</span>
      </Link>

      {/* 네비게이션 메뉴 */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
        >
          <House />
        </Link>
        <Link
          href="/ask"
          className="rounded-lg bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
        >
          <FileQuestionMark />
        </Link>
        <Link
          href="/board"
          className="rounded-lg bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
        >
          <MessageSquareText />
        </Link>
        <Link
          href="/history"
          className="rounded-lg bg-blue-100 text-blue-700 px-4 py-1 text-sm font-medium hover:bg-blue-200"
        >
          <History />
        </Link>

        {/* 토큰 상태 및 갱신 버튼 */}
        <div className="flex items-center gap-2 ml-2">
          <span
            className={`text-sm ${statusInfo.color}`}
            title={statusInfo.title}
          >
            {statusInfo.text}
          </span>

          <button
            onClick={handleRefreshToken}
            disabled={isRefreshing}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              isRefreshing
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : tokenStatus === "expired"
                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                  : "bg-green-100 text-green-600 hover:bg-green-200"
            }`}
            title={isRefreshing ? "갱신 중..." : "토큰 갱신"}
          >
            {isRefreshing ? <Hourglass /> : <Repeat2 />}
          </button>
        </div>

        {/* 로그아웃 버튼 */}
        <button
          onClick={handleLogout}
          className="rounded-lg bg-red-100 text-red-700 px-4 py-1 text-sm font-medium hover:bg-red-200"
        >
          <LogOut />
        </button>
      </div>
    </header>
  );
}
