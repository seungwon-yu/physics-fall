import { useEffect, useRef, useState, useCallback } from "react";
import { MergeGame } from "@/game/MergeGame";
import { CHARACTERS, getCharacterImage } from "@/game/characters";
import { setMuted, isMuted, startMusic, stopMusic, resume } from "@/game/audio";
import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw, Volume2, VolumeX, Trophy } from "lucide-react";

const HS_KEY = "merge-character-hs-v1";

export function GameView() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<MergeGame | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [nextLevel, setNextLevel] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [overScore, setOverScore] = useState(0);
  const [mute, setMute] = useState(false);
  const [combo, setCombo] = useState<{ n: number; key: number } | null>(null);

  useEffect(() => {
    const hs = Number(localStorage.getItem(HS_KEY) || "0");
    setHighScore(hs);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new MergeGame(canvasRef.current, {
      onScore: setScore,
      onNext: setNextLevel,
      onGameOver: (s) => { setOverScore(s); setOver(true); },
      onCombo: (n) => setCombo({ n, key: Date.now() }),
      onShake: () => {
        wrapRef.current?.classList.remove("animate-shake");
        void wrapRef.current?.offsetWidth;
        wrapRef.current?.classList.add("animate-shake");
      },
    });
    gameRef.current = game;
    startMusic();
    const onResize = () => game.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      game.destroy();
      stopMusic();
    };
  }, []);

  useEffect(() => {
    if (over) {
      setHighScore((prev) => {
        const next = Math.max(prev, overScore);
        localStorage.setItem(HS_KEY, String(next));
        return next;
      });
    }
  }, [over, overScore]);

  const handlePointer = useCallback((clientX: number) => {
    const canvas = canvasRef.current; if (!canvas || !gameRef.current) return;
    const rect = canvas.getBoundingClientRect();
    gameRef.current.setDropX(clientX - rect.left);
  }, []);

  const handleDrop = useCallback(() => {
    if (over || paused) return;
    resume();
    gameRef.current?.drop();
  }, [over, paused]);

  const togglePause = () => {
    if (over) return;
    const next = !paused;
    setPaused(next);
    gameRef.current?.pause(next);
  };

  const restart = () => {
    setOver(false);
    setPaused(false);
    setScore(0);
    gameRef.current?.pause(false);
    gameRef.current?.restart();
  };

  const toggleMute = () => {
    const next = !mute;
    setMute(next);
    setMuted(next);
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-start gap-3 px-3 py-3 sm:py-5">
      <header className="flex w-full max-w-md items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">점수</span>
          <span className="text-2xl font-bold tabular-nums text-foreground">{score}</span>
        </div>
        <NextPreview level={nextLevel} />
        <div className="flex flex-col items-end">
          <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground">
            <Trophy className="h-3 w-3" /> 최고
          </span>
          <span className="text-2xl font-bold tabular-nums text-foreground">{Math.max(highScore, score)}</span>
        </div>
      </header>

      <div
        ref={wrapRef}
        className="relative w-full max-w-md flex-1 overflow-hidden rounded-3xl border border-white/10 bg-card shadow-[0_10px_60px_-10px_rgba(120,80,255,0.4)]"
        style={{
          touchAction: "none",
          background:
            "radial-gradient(ellipse at 30% 10%, rgba(140,90,255,0.25), transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(255,90,180,0.18), transparent 60%), #1a1030",
        }}
        onMouseMove={(e) => handlePointer(e.clientX)}
        onMouseDown={(e) => { handlePointer(e.clientX); handleDrop(); }}
        onTouchStart={(e) => { handlePointer(e.touches[0].clientX); }}
        onTouchMove={(e) => { handlePointer(e.touches[0].clientX); e.preventDefault(); }}
        onTouchEnd={() => handleDrop()}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />

        {combo && combo.n > 1 && (
          <div
            key={combo.key}
            className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 animate-pop text-4xl font-black text-primary drop-shadow"
            style={{ textShadow: "0 0 20px rgba(255,120,220,0.8), 0 2px 0 rgba(0,0,0,0.4)" }}
          >
            콤보 x{combo.n}!
          </div>
        )}

        {paused && !over && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="text-2xl font-bold">일시정지</div>
          </div>
        )}

        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/85 p-6 backdrop-blur-sm">
            <h2 className="text-3xl font-black tracking-tight">합체 실패</h2>
            <div className="flex flex-col items-center">
              <span className="text-sm text-muted-foreground">최종 점수</span>
              <span className="text-5xl font-black tabular-nums text-primary">{overScore}</span>
              {overScore >= highScore && overScore > 0 && (
                <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-primary">신기록!</span>
              )}
            </div>
            <Button size="lg" onClick={restart} className="rounded-full px-8">
              <RotateCcw className="mr-2 h-4 w-4" /> 다시 시작
            </Button>
          </div>
        )}
      </div>

      <CharacterDex current={nextLevel} />

      <footer className="flex w-full max-w-md items-center justify-between">
        <Button variant="secondary" size="icon" onClick={togglePause} aria-label="일시정지" className="rounded-full">
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <span className="text-xs text-muted-foreground">같은 캐릭터끼리 부딪히면 합체!</span>
        <Button variant="secondary" size="icon" onClick={toggleMute} aria-label="음소거" className="rounded-full">
          {mute || isMuted() ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </footer>
    </div>
  );
}

function CharacterAvatar({ level, size }: { level: number; size: number }) {
  const c = CHARACTERS[level];
  const [hasImg, setHasImg] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.src = c.imagePath;
    img.onload = () => setHasImg(true);
    img.onerror = () => setHasImg(false);
  }, [c.imagePath]);

  return (
    <div
      className="relative overflow-hidden rounded-full border border-white/20 shadow-inner"
      style={{
        width: size,
        height: size,
        background: hasImg
          ? "#222"
          : `radial-gradient(circle at 30% 30%, ${c.highlight}, ${c.color} 60%, ${c.shadow})`,
      }}
    >
      {hasImg && (
        <img src={c.imagePath} alt={c.name} className="h-full w-full object-cover" />
      )}
    </div>
  );
}

function NextPreview({ level }: { level: number }) {
  const c = CHARACTERS[level];
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">다음 캐릭터</span>
      <div className="mt-0.5 flex items-center gap-2">
        <CharacterAvatar level={level} size={36} />
        <span className="text-xs font-semibold text-foreground">{c.name}</span>
      </div>
    </div>
  );
}

function CharacterDex({ current }: { current: number }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/50 p-2">
      <div className="mb-1 px-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        캐릭터 도감 · 합체 진화표
      </div>
      <div className="flex items-center justify-between gap-1 overflow-x-auto">
        {CHARACTERS.map((c, i) => {
          const isCurrent = i === current;
          const size = 18 + i * 3;
          return (
            <div
              key={c.id}
              className="flex flex-shrink-0 flex-col items-center gap-0.5"
              style={{ opacity: isCurrent ? 1 : 0.7 }}
            >
              <CharacterAvatar level={i} size={size} />
              <span
                className="text-[9px] font-semibold"
                style={{ color: isCurrent ? c.color : undefined }}
              >
                Lv.{i + 1}
              </span>
              <span className="max-w-[56px] truncate text-[9px] text-muted-foreground">
                {c.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 사용되지 않는 import 회피용
void getCharacterImage;
