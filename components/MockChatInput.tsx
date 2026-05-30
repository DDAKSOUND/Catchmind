"use client";
import { useState, useRef } from "react";
import type { Socket } from "socket.io-client";

interface Props {
  socket: Socket | null;
}

const QUICK_COMMANDS = ["!정답 ", "!정답 고양이", "!정답 강아지", "!정답 자동차"];

export default function MockChatInput({ socket }: Props) {
  const [nickname, setNickname] = useState("viewer123");
  const [message, setMessage] = useState("");
  const [log, setLog] = useState<{ nick: string; msg: string; time: string }[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  function send() {
    if (!message.trim() || !socket) return;
    const entry = { nick: nickname, msg: message, time: new Date().toLocaleTimeString() };
    setLog((prev) => [entry, ...prev.slice(0, 49)]);
    socket.emit("chat:message", {
      nickname: nickname || "viewer",
      message: message.trim(),
      timestamp: new Date().toISOString(),
      source: "mock",
    });
    setMessage("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="card flex flex-col gap-2">
      <h3 className="text-sm font-bold text-[#ffbe0b]">💬 Mock Chat</h3>
      <div className="flex gap-2">
        <input
          className="input-field w-28 text-sm"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <input
          className="input-field flex-1 text-sm"
          placeholder="!정답 고양이"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKey}
        />
        <button onClick={send} className="btn-primary px-3 py-1 text-sm whitespace-nowrap">
          전송
        </button>
      </div>
      {/* Quick commands */}
      <div className="flex flex-wrap gap-1">
        {QUICK_COMMANDS.map((cmd) => (
          <button
            key={cmd}
            onClick={() => setMessage(cmd)}
            className="rounded border border-[#2a2a3e] px-2 py-0.5 text-xs text-gray-400 hover:border-[#00f5ff] hover:text-[#00f5ff]"
          >
            {cmd}
          </button>
        ))}
      </div>
      {/* Log */}
      <div
        ref={logRef}
        className="max-h-32 overflow-y-auto rounded-lg bg-[#0a0a0f] p-2 font-mono text-xs"
      >
        {log.length === 0 && <span className="text-gray-600">채팅 로그가 여기에 표시됩니다.</span>}
        {log.map((entry, i) => (
          <div key={i} className="flex gap-1">
            <span className="text-gray-600">{entry.time}</span>
            <span className="text-[#00f5ff]">{entry.nick}</span>
            <span className="text-gray-300">{entry.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
