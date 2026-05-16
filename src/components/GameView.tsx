import { useEffect, useRef, useState, useCallback } from "react";
import { MergeGame } from "@/game/MergeGame";
import { FRUITS } from "@/game/fruits";
import { setMuted, isMuted, startMusic, stopMusic, resume } from "@/game/audio";
import { Button } from "@/components/ui/button";
import { Pause, Play, RotateCcw, Volume2, VolumeX, Trophy } from "lucide-react";

const HS_KEY = "merge-game-hs-v1";

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
        // force reflow
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
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Score</span>
          <span className="text-2xl font-bold tabular-nums text-foreground">{score}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <NextPreview level={nextLevel} />
        </div>
        <div className="flex flex-col items-end">
          <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-muted-foreground">
            <Trophy className="h-3 w-3" /> Best
          </span>
          <span className="text-2xl font-bold tabular-nums text-foreground">{Math.max(highScore, score)}</span>
        </div>
      </header>

      <div
        ref={wrapRef}
        className="relative w-full max-w-md flex-1 overflow-hidden rounded-3xl border bg-card shadow-xl"
        style={{ touchAction: "none" }}
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
            className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 animate-pop text-3xl font-black text-primary drop-shadow"
            style={{ textShadow: "0 2px 0 rgba(0,0,0,0.15)" }}
          >
            COMBO x{combo.n}!
          </div>
        )}

        {paused && !over && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <div className="text-2xl font-bold">Paused</div>
          </div>
        )}

        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/85 p-6 backdrop-blur-sm">
            <h2 className="text-3xl font-black tracking-tight">Game Over</h2>
            <div className="flex flex-col items-center">
              <span className="text-sm text-muted-foreground">Final score</span>
              <span className="text-5xl font-black tabular-nums text-primary">{overScore}</span>
              {overScore >= highScore && overScore > 0 && (
                <span className="mt-1 text-xs font-semibold uppercase tracking-widest text-primary">New best!</span>
              )}
            </div>
            <Button size="lg" onClick={restart} className="rounded-full px-8">
              <RotateCcw className="mr-2 h-4 w-4" /> Play again
            </Button>
          </div>
        )}
      </div>

      <footer className="flex w-full max-w-md items-center justify-between">
        <Button variant="secondary" size="icon" onClick={togglePause} aria-label="Pause" className="rounded-full">
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Ladder current={nextLevel} />
        <Button variant="secondary" size="icon" onClick={toggleMute} aria-label="Mute" className="rounded-full">
          {mute || isMuted() ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </footer>
    </div>
  );
}

function NextPreview({ level }: { level: number }) {
  const f = FRUITS[level];
  const size = 44;
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Next</span>
      <div className="mt-0.5 flex h-12 w-12 items-center justify-center rounded-full border bg-card shadow-inner">
        <span
          className="block rounded-full"
          style={{
            width: size * 0.65, height: size * 0.65,
            background: `radial-gradient(circle at 30% 30%, ${f.highlight}, ${f.color} 60%, ${f.shadow})`,
          }}
        />
      </div>
    </div>
  );
}

function Ladder({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1">
      {FRUITS.slice(0, 8).map((f, i) => (
        <span
          key={i}
          className="rounded-full transition-transform"
          style={{
            width: 10 + i * 1.5,
            height: 10 + i * 1.5,
            background: `radial-gradient(circle at 30% 30%, ${f.highlight}, ${f.color} 60%, ${f.shadow})`,
            opacity: i === current ? 1 : 0.5,
            transform: i === current ? "scale(1.25)" : "scale(1)",
          }}
        />
      ))}
    </div>
  );
}
