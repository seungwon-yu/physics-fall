import { createFileRoute } from "@tanstack/react-router";
import { GameView } from "@/components/GameView";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "캐릭터 합체 퍼즐 — 7단계 진화" },
      { name: "description", content: "같은 캐릭터끼리 부딪혀 합체하는 물리 기반 퍼즐. Lv.1부터 Lv.7까지 진화시켜 최고 점수에 도전하세요." },
      { property: "og:title", content: "캐릭터 합체 퍼즐 — 7단계 진화" },
      { property: "og:description", content: "Lv.1 아미하 유네부터 Lv.7 야토까지, 캐릭터를 합체시키는 귀여운 물리 퍼즐." },
    ],
  }),
});

function Index() {
  return (
    <main className="min-h-screen w-full">
      <h1 className="sr-only">캐릭터 합체 퍼즐 게임</h1>
      <GameView />
    </main>
  );
}
