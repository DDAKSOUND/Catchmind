"use client";
import { useState, useEffect, useRef } from "react";
import { useSocket } from "./SocketProvider";

const SESSION_KEY = "catchmind_authed";
const PIN_CACHE_KEY = "catchmind_pin";

export default function PinAuth({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 소켓 연결/재연결 시 캐시된 PIN으로 자동 재인증
  useEffect(() => {
    if (!socket) return;
    const cachedPin = sessionStorage.getItem(PIN_CACHE_KEY);
    if (!cachedPin) return;

    const reAuth = () => {
      socket.emit("admin:auth", cachedPin, (ok: boolean) => {
        if (ok) {
          setVerified(true);
        } else {
          // 캐시된 PIN이 틀리면 (서버 PIN 변경 등) 재로그인
          sessionStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(PIN_CACHE_KEY);
          setVerified(false);
        }
      });
    };

    socket.on("connect", reAuth);
    if (socket.connected) reAuth();
    return () => { socket.off("connect", reAuth); };
  }, [socket]);

  useEffect(() => {
    if (!verified) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [verified]);

  function verify() {
    if (!pin.trim() || !socket || loading) return;
    setLoading(true);
    setError("");
    socket.emit("admin:auth", pin, (ok: boolean) => {
      setLoading(false);
      if (ok) {
        sessionStorage.setItem(SESSION_KEY, "1");
        sessionStorage.setItem(PIN_CACHE_KEY, pin);
        setVerified(true);
      } else {
        setError("PIN이 올바르지 않습니다.");
        setPin("");
        inputRef.current?.focus();
      }
    });
  }

  if (verified) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]">
      <div className="w-full max-w-xs rounded-2xl border border-[#2a2a3e] bg-[#111118] p-8 shadow-2xl">
        <h1
          className="mb-2 text-center text-2xl font-black text-[#ffbe0b]"
          style={{ textShadow: "0 0 12px #ffbe0b" }}
        >
          Catchmind
        </h1>
        <p className="mb-6 text-center text-sm text-gray-400">PIN을 입력하세요</p>

        <input
          ref={inputRef}
          type="password"
          className="input-field mb-3 w-full text-center text-lg tracking-widest"
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && verify()}
          autoComplete="current-password"
          maxLength={32}
        />

        {error && (
          <p className="mb-3 text-center text-sm text-red-400">{error}</p>
        )}

        <button
          onClick={verify}
          disabled={loading || !pin.trim()}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? "확인 중..." : "입장"}
        </button>
      </div>
    </div>
  );
}
