import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1
        className="text-5xl font-black tracking-tight"
        style={{ color: "#00f5ff", textShadow: "0 0 20px #00f5ff, 0 0 40px #00f5ff" }}
      >
        캐치마인드
      </h1>
      <p className="text-gray-400">SOOP 스트리머용 실시간 그림 맞추기 게임</p>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link href="/host" className="btn-primary text-center py-4 text-lg rounded-xl">
          🎮 Host (스트리머)
        </Link>
        <Link href="/overlay" className="btn-secondary text-center py-4 text-lg rounded-xl border border-[#2a2a3e]">
          📺 Overlay (OBS)
        </Link>
        <Link href="/admin" className="btn-secondary text-center py-4 text-lg rounded-xl border border-[#2a2a3e]">
          ⚙️ Admin (설정)
        </Link>
      </div>
    </main>
  );
}
