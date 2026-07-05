import Link from "next/link";

const DOT_COLORS = [
  "var(--board-red)",
  "var(--board-blue)",
  "var(--board-yellow)",
  "var(--board-green)",
];

export default function Home() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-10 px-6">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-7xl font-black tracking-tight text-[var(--board-path)] sm:text-8xl">
          Ludiq
        </h1>
        <div className="flex items-center gap-3">
          {DOT_COLORS.map((color) => (
            <span
              key={color}
              className="h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <p className="text-sm uppercase tracking-[0.3em] text-[var(--board-path-border)]">
          Parqués multijugador
        </p>
      </div>

      <Link
        href="/play"
        className="rounded-full bg-[var(--board-green)] px-14 py-4 text-xl font-bold uppercase tracking-widest text-[var(--board-path)] shadow-lg transition-transform hover:scale-105 hover:bg-[var(--board-green-dark)] active:scale-95"
      >
        Play
      </Link>
    </main>
  );
}
