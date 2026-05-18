// 게임 난이도 / 물리 튜닝 설정.
// 값만 바꿔도 게임감이 즉시 변하도록 한 곳에 모아둠.

export const difficultyConfig = {
  // 스폰 가능한 최대 레벨 (0-indexed). Lv.1~Lv.3 → 0..2
  maxSpawnLevel: 2,
  // 가중치: index = level
  spawnWeights: [60, 30, 10],
  // 같은 레벨이 N번 연속으로 나오지 않게
  maxSameLevelStreak: 3,
  // 7단계 radius (px)
  radiusByLevel: [20, 28, 38, 50, 64, 80, 98],
  // 게임오버 라인 (캔버스 상단 기준 y px). 살짝 낮춰 압박↑
  gameOverLineY: 120,
  // 스폰 직후 게임오버 판정 유예 (ms)
  spawnGraceMs: 320,
};

export const physicsConfig = {
  // 캐릭터 body
  restitution: 0.12,
  friction: 0.55,
  frictionStatic: 0.35,
  frictionAir: 0.012,
  slop: 0.04,
  // density = base + level * step
  densityBase: 0.0012,
  densityStep: 0.0001,
  sleepThreshold: 60,

  // 벽: 절대 붙잡거나 매달리게 만들지 않음
  wallFriction: 0.02,
  wallFrictionStatic: 0,
  wallRestitution: 0.04,

  // 속도 클램프
  maxVelocity: 14,
  maxAngularVelocity: 0.4,

  // 병합 직후 새 body에 반영할 평균속도 비율
  mergeVelocityScale: 0.35,
  mergeBouncePopY: -1.0,
  mergeMaxVx: 3,
  mergeMaxVy: 3,

  // 벽 끼임 보정
  stuckDetectionEnabled: true,
  stuckDetectionTimeMs: 600,
  stuckMinYDelta: 0.5, // 600ms 동안 y가 이만큼도 안 변하면 stuck 후보
  stuckCorrectionForceY: 0.0006, // 부드럽게 아래로 톡
  stuckWallContactPx: 2.5, // 벽 표면과의 거리 허용치
};

export type DifficultyConfig = typeof difficultyConfig;
export type PhysicsConfig = typeof physicsConfig;
