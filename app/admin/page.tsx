"use client";
import { useState, useEffect } from "react";
import SocketProvider, { useSocket } from "@/components/SocketProvider";
import ScoreBoard from "@/components/ScoreBoard";
import { useGameStore } from "@/lib/useGameStore";
import Link from "next/link";

function AdminInner() {
  const { socket } = useSocket();
  const state = useGameStore();
  const [settings, setSettings] = useState(state.settings);
  const [logs, setLogs] = useState<string[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setSettings(state.settings);
  }, [state.settings]);

  function saveSettings() {
    socket?.emit("host:updateSettings", settings);
    addLog("설정 저장됨");
  }

  function resetScores() {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    socket?.emit("host:resetScores");
    setConfirmReset(false);
    addLog("점수 초기화됨");
  }

  function addLog(msg: string) {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1
            className="text-3xl font-black text-[#ffbe0b]"
            style={{ textShadow: "0 0 15px #ffbe0b" }}
          >
            ⚙️ Admin
          </h1>
          <div className="flex gap-2">
            <Link href="/host" className="btn-secondary px-3 py-1 text-sm">Host</Link>
            <Link href="/overlay" target="_blank" className="btn-secondary px-3 py-1 text-sm">Overlay</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Settings */}
          <div className="card">
            <h2 className="mb-4 text-lg font-bold text-[#00f5ff]">게임 설정</h2>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-400">기본 제한 시간 (초)</span>
                <input
                  type="number"
                  className="input-field"
                  min={10}
                  max={600}
                  value={settings.defaultTimeLimit}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultTimeLimit: Number(e.target.value) }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-400">기본 점수</span>
                <input
                  type="number"
                  className="input-field"
                  min={10}
                  step={10}
                  value={settings.defaultBaseScore}
                  onChange={(e) => setSettings((s) => ({ ...s, defaultBaseScore: Number(e.target.value) }))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-400">랭킹 표시 개수</span>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  max={50}
                  value={settings.rankingDisplayCount}
                  onChange={(e) => setSettings((s) => ({ ...s, rankingDisplayCount: Number(e.target.value) }))}
                />
              </label>
              <div className="flex flex-col gap-2">
                {[
                  { key: "useHint", label: "힌트 사용 허용" },
                  { key: "showWrongAnswers", label: "오답 목록 표시" },
                  { key: "hintScorePenalty", label: "힌트 점수 차감 사용" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex cursor-pointer items-center gap-3">
                    <div
                      className={`relative h-5 w-10 rounded-full transition-colors ${
                        settings[key as keyof typeof settings] ? "bg-[#00f5ff]" : "bg-[#2a2a3e]"
                      }`}
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          [key]: !s[key as keyof typeof s],
                        }))
                      }
                    >
                      <div
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                          settings[key as keyof typeof settings] ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </div>
                    <span className="text-sm text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
              <button onClick={saveSettings} className="btn-primary">
                설정 저장
              </button>
            </div>
          </div>

          {/* Score management */}
          <div className="flex flex-col gap-4">
            <div className="card">
              <h2 className="mb-4 text-lg font-bold text-[#ff006e]">점수 관리</h2>
              <button
                onClick={resetScores}
                className={`w-full rounded-lg px-4 py-3 font-bold transition-all ${
                  confirmReset
                    ? "bg-[#ff006e] text-white animate-pulse"
                    : "btn-danger"
                }`}
              >
                {confirmReset ? "⚠️ 한 번 더 클릭하면 초기화됩니다!" : "전체 점수 초기화"}
              </button>
              {confirmReset && (
                <button
                  onClick={() => setConfirmReset(false)}
                  className="mt-2 w-full btn-secondary text-sm"
                >
                  취소
                </button>
              )}
            </div>
            <ScoreBoard
              scoreboard={state.scoreboard}
              maxCount={state.settings.rankingDisplayCount}
            />
          </div>

          {/* Game log */}
          <div className="card md:col-span-2">
            <h2 className="mb-3 text-lg font-bold text-[#8338ec]">게임 로그</h2>
            <div className="max-h-48 overflow-y-auto rounded-lg bg-[#0a0a0f] p-3 font-mono text-xs">
              {logs.length === 0 && <span className="text-gray-600">로그가 없습니다.</span>}
              {logs.map((log, i) => (
                <div key={i} className="text-gray-400">{log}</div>
              ))}
            </div>
          </div>

          {/* Connection info */}
          <div className="card md:col-span-2">
            <h2 className="mb-3 text-lg font-bold text-gray-400">OBS 설정 가이드</h2>
            <div className="rounded-lg bg-[#0a0a0f] p-4 font-mono text-sm text-gray-400">
              <p className="mb-2 text-[#00f5ff]">Browser Source URL:</p>
              <p className="text-white">http://localhost:3000/overlay</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <span className="text-gray-500">Width:</span> <span>1920</span>
                <span className="text-gray-500">Height:</span> <span>1080</span>
                <span className="text-gray-500">FPS:</span> <span>60</span>
                <span className="text-gray-500">Shutdown source:</span> <span>Off</span>
                <span className="text-gray-500">Refresh on active:</span> <span>Off</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <SocketProvider clientType="admin">
      <AdminInner />
    </SocketProvider>
  );
}
