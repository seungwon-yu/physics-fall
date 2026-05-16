import { createFileRoute } from "@tanstack/react-router";
import { GameView } from "@/components/GameView";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Orb Drop — Physics Merge Puzzle" },
      { name: "description", content: "A cozy physics-based merge puzzle. Drop, merge, chain combos, and beat your high score." },
      { property: "og:title", content: "Orb Drop — Physics Merge Puzzle" },
      { property: "og:description", content: "Drop, merge, and chain combos in this satisfying physics puzzle." },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen w-full">
      <h1 className="sr-only">Orb Drop — Physics Merge Puzzle Game</h1>
      <GameView />
    </main>
  );
}
