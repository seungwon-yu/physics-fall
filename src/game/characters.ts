// 캐릭터 합체 퍼즐 단계 정의.
// 캐릭터만 교체하면 다른 세트로도 재사용할 수 있도록 데이터 중심으로 설계.

export interface CharacterStage {
  id: string;
  level: number;        // 0-indexed (Lv.1 = 0)
  name: string;
  radius: number;       // 물리 콜라이더 반지름(px)
  mass: number;         // 밀도 가중치 (density 계산용)
  score: number;        // 합체 시 점수
  color: string;        // fallback / 이미지 로딩 전 색상
  highlight: string;
  shadow: string;
  imagePath: string;    // public 폴더 기준 경로
  description: string;
}

const stages: Omit<CharacterStage, "level" | "radius" | "mass" | "score">[] = [
  {
    id: "amiha_yune",
    name: "아미하 유네",
    color: "#ff8fb1", highlight: "#ffd4e2", shadow: "#c45a7b",
    imagePath: "/characters/lv1_amiha_yune.png",
    description: "조용히 반짝이는 새벽의 별빛.",
  },
  {
    id: "hakuten_fuwa",
    name: "하쿠텐 후와",
    color: "#a5b4ff", highlight: "#d8defc", shadow: "#5d6fc7",
    imagePath: "/characters/lv2_hakuten_fuwa.png",
    description: "구름 사이를 떠다니는 솜털 같은 친구.",
  },
  {
    id: "shokoko_dori",
    name: "쇼코코 도리",
    color: "#ffd36b", highlight: "#fff1c2", shadow: "#c89a2a",
    imagePath: "/characters/lv3_shokoko_dori.png",
    description: "톡톡 튀는 작은 모험가.",
  },
  {
    id: "niuniu",
    name: "니우니우",
    color: "#7ee6c2", highlight: "#c8f5e4", shadow: "#3a9d7d",
    imagePath: "/characters/lv4_niuniu.png",
    description: "포근하게 안기고 싶은 둥글둥글한 영혼.",
  },
  {
    id: "odanming",
    name: "오단밍",
    color: "#9b7bff", highlight: "#d3c4ff", shadow: "#5a3fc4",
    imagePath: "/characters/lv5_odanming.png",
    description: "별가루로 만들어진 신비한 길잡이.",
  },
  {
    id: "hamkubi",
    name: "햄쿠비",
    color: "#ff8a5b", highlight: "#ffc9af", shadow: "#c45528",
    imagePath: "/characters/lv6_hamkubi.png",
    description: "온기를 품은 작은 태양.",
  },
  {
    id: "yato",
    name: "야토",
    color: "#f368e0", highlight: "#fcb6f0", shadow: "#8a2a9c",
    imagePath: "/characters/lv7_yato.png",
    description: "모든 합체의 끝에서 빛나는 최종 형태.",
  },
];

export const CHARACTERS: CharacterStage[] = stages.map((s, i) => ({
  ...s,
  level: i,
  radius: 20 + i * 10,
  mass: 0.001 + i * 0.0003,
  score: (i + 1) * (i + 2), // 2, 6, 12, 20, 30, 42, 56
}));

export const MAX_LEVEL = CHARACTERS.length - 1;
// 위에서 떨어뜨릴 수 있는 최대 레벨 (Lv.1 ~ Lv.4)
export const SPAWNABLE_MAX_LEVEL = 3;

// 이미지 캐시 + 비동기 로더
const imageCache = new Map<string, HTMLImageElement>();
const failed = new Set<string>();

export function getCharacterImage(path: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  if (failed.has(path)) return null;
  const cached = imageCache.get(path);
  if (cached) {
    return cached.complete && cached.naturalWidth > 0 ? cached : null;
  }
  const img = new Image();
  img.src = path;
  img.onerror = () => { failed.add(path); imageCache.delete(path); };
  imageCache.set(path, img);
  return null;
}

export function preloadCharacterImages() {
  CHARACTERS.forEach((c) => getCharacterImage(c.imagePath));
}
