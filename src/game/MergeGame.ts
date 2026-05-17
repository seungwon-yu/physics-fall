import Matter from "matter-js";
import {
  CHARACTERS,
  MAX_LEVEL,
  SPAWNABLE_MAX_LEVEL,
  getCharacterImage,
  preloadCharacterImages,
  type CharacterStage,
} from "./characters";
import { playBounce, playDrop, playMerge, playCombo, playGameOver } from "./audio";

export interface GameCallbacks {
  onScore: (score: number) => void;
  onNext: (level: number) => void;
  onGameOver: (score: number) => void;
  onCombo: (n: number) => void;
  onShake: () => void;
  onMergePopup?: (text: string) => void;
}

interface Popup { x: number; y: number; text: string; life: number; color: string; vy: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; r: number }

interface CharacterBody extends Matter.Body {
  characterLevel: number;
  merged?: boolean;
  spawnTime: number;
  landed?: boolean;
}

const MAX_LINEAR_SPEED = 14;
const MAX_ANGULAR_SPEED = 0.4;

export class MergeGame {
  private engine: Matter.Engine;
  private world: Matter.World;
  private runner: Matter.Runner;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private wallThickness = 40;
  private topLine = 110;
  private dpr = 1;

  private currentLevel = 0;
  private nextLevel = 0;
  private dropX = 0;
  private canDrop = true;
  private dropCooldown = 0;
  private gameOver = false;
  private gameOverTriggered = false;
  private paused = false;
  private score = 0;
  private mergeChainTimer = 0;
  private mergeChainCount = 0;

  private particles: Particle[] = [];
  private popups: Popup[] = [];
  private shakeAmount = 0;
  private flash = 0;

  private rafId = 0;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement, private cb: GameCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d ctx");
    this.ctx = ctx;

    preloadCharacterImages();

    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.0014 },
      enableSleeping: true,
    });
    this.world = this.engine.world;
    this.runner = Matter.Runner.create();

    this.resize();
    this.addWalls();
    this.currentLevel = this.rollNewLevel();
    this.nextLevel = this.rollNewLevel();
    this.cb.onNext(this.nextLevel);

    Matter.Events.on(this.engine, "collisionStart", (e) => this.onCollision(e));
    Matter.Runner.run(this.runner, this.engine);
    this.loop(performance.now());
  }

  private rollNewLevel() {
    const weights = [42, 30, 18, 10];
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i <= SPAWNABLE_MAX_LEVEL; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  resize() {
    const parent = this.canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.floor(rect.width);
    this.height = Math.floor(rect.height);
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.dropX = this.width / 2;
    this.rebuildWalls();
  }

  private wallBodies: Matter.Body[] = [];
  private rebuildWalls() {
    this.wallBodies.forEach((b) => Matter.World.remove(this.world, b));
    this.wallBodies = [];
    this.addWalls();
  }
  private addWalls() {
    const t = this.wallThickness;
    const opts = {
      isStatic: true,
      friction: 0.6,
      restitution: 0.1,
      render: { visible: false },
    } satisfies Matter.IChamferableBodyDefinition;
    const floor = Matter.Bodies.rectangle(this.width / 2, this.height + t / 2 - 2, this.width, t, opts);
    const left = Matter.Bodies.rectangle(-t / 2 + 2, this.height / 2, t, this.height * 2, opts);
    const right = Matter.Bodies.rectangle(this.width + t / 2 - 2, this.height / 2, t, this.height * 2, opts);
    this.wallBodies = [floor, left, right];
    Matter.World.add(this.world, this.wallBodies);
  }

  setDropX(x: number) {
    if (this.gameOver) return;
    const def = CHARACTERS[this.currentLevel];
    const margin = def.radius + 4;
    this.dropX = Math.max(margin, Math.min(this.width - margin, x));
  }

  drop() {
    if (!this.canDrop || this.gameOver || this.paused) return;
    const def = CHARACTERS[this.currentLevel];
    const body = this.makeCharacter(this.dropX, this.topLine - def.radius - 10, this.currentLevel);
    Matter.World.add(this.world, body);
    playDrop();
    this.canDrop = false;
    this.dropCooldown = 0.45;
    this.currentLevel = this.nextLevel;
    this.nextLevel = this.rollNewLevel();
    this.cb.onNext(this.nextLevel);
  }

  private makeCharacter(x: number, y: number, level: number): CharacterBody {
    const def = CHARACTERS[level];
    const body = Matter.Bodies.circle(x, y, def.radius, {
      restitution: 0.18,
      friction: 0.35,
      frictionStatic: 0.6,
      frictionAir: 0.005,
      density: def.mass,
      slop: 0.02,
      sleepThreshold: 60,
    }) as CharacterBody;
    body.characterLevel = level;
    body.spawnTime = performance.now();
    return body;
  }

  private onCollision(event: Matter.IEventCollision<Matter.Engine>) {
    for (const pair of event.pairs) {
      const a = pair.bodyA as CharacterBody;
      const b = pair.bodyB as CharacterBody;
      const speed = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      if (a.characterLevel != null && b.characterLevel != null) {
        if (speed > 1.5) playBounce(speed / 4);
        if (!a.merged && !b.merged && a.characterLevel === b.characterLevel && a.characterLevel < MAX_LEVEL) {
          a.merged = true;
          b.merged = true;
          this.mergeCharacters(a, b);
        }
      } else if (speed > 2) {
        playBounce(speed / 5);
      }
    }
  }

  private mergeCharacters(a: CharacterBody, b: CharacterBody) {
    const newLevel = a.characterLevel + 1;
    const mx = (a.position.x + b.position.x) / 2;
    const my = (a.position.y + b.position.y) / 2;
    Matter.World.remove(this.world, a);
    Matter.World.remove(this.world, b);

    const isMax = newLevel > MAX_LEVEL;
    if (!isMax) {
      const nb = this.makeCharacter(mx, my, newLevel);
      Matter.Body.setVelocity(nb, { x: 0, y: -1.5 });
      Matter.World.add(this.world, nb);
    }

    const def = CHARACTERS[Math.min(newLevel, MAX_LEVEL)];
    this.mergeChainTimer = 0.6;
    this.mergeChainCount += 1;
    const combo = this.mergeChainCount;
    let gained = def.score;
    if (combo > 1) {
      gained = Math.round(gained * (1 + (combo - 1) * 0.25));
      this.cb.onCombo(combo);
      playCombo(combo);
    }
    this.score += gained;
    this.cb.onScore(this.score);

    playMerge(newLevel);
    this.spawnParticles(mx, my, def.color, 18 + newLevel * 3);
    this.popups.push({
      x: mx, y: my - def.radius - 6,
      text: `${def.name} 합체!`,
      life: 1.1, color: def.shadow, vy: -0.6,
    });
    this.popups.push({
      x: mx, y: my,
      text: `+${gained}${combo > 1 ? ` x${combo}` : ""}`,
      life: 0.9, color: def.color, vy: -0.5,
    });
    this.cb.onMergePopup?.(`${def.name} 합체!`);
    this.flash = Math.min(1, this.flash + 0.18);
    this.shakeAmount = Math.min(10, this.shakeAmount + 1.2 + newLevel * 0.5);
    this.cb.onShake();
  }

  private spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 4;
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1,
        life: 0.6 + Math.random() * 0.4, max: 1, color, r: 2 + Math.random() * 3,
      });
    }
  }

  pause(p: boolean) {
    this.paused = p;
    if (p) Matter.Runner.stop(this.runner);
    else Matter.Runner.run(this.runner, this.engine);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    Matter.Runner.stop(this.runner);
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
  }

  restart() {
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: 0.0014 }, enableSleeping: true });
    this.world = this.engine.world;
    Matter.Events.on(this.engine, "collisionStart", (e) => this.onCollision(e));
    Matter.Runner.run(this.runner, this.engine);
    this.addWalls();
    this.score = 0;
    this.gameOver = false;
    this.particles = [];
    this.popups = [];
    this.mergeChainCount = 0;
    this.mergeChainTimer = 0;
    this.currentLevel = this.rollNewLevel();
    this.nextLevel = this.rollNewLevel();
    this.canDrop = true;
    this.dropCooldown = 0;
    this.cb.onScore(0);
    this.cb.onNext(this.nextLevel);
  }

  private update(dt: number) {
    if (this.dropCooldown > 0) {
      this.dropCooldown -= dt;
      if (this.dropCooldown <= 0) this.canDrop = true;
    }
    if (this.mergeChainTimer > 0) {
      this.mergeChainTimer -= dt;
      if (this.mergeChainTimer <= 0) this.mergeChainCount = 0;
    }

    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.vx *= 0.99; p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const p of this.popups) {
      p.y += p.vy; p.vy *= 0.96; p.life -= dt * 1.2;
    }
    this.popups = this.popups.filter((p) => p.life > 0);

    this.shakeAmount *= 0.85;
    this.flash *= 0.9;

    if (!this.gameOver) {
      const now = performance.now();
      const bodies = Matter.Composite.allBodies(this.world);
      for (const body of bodies) {
        const fb = body as CharacterBody;
        if (fb.characterLevel == null) continue;
        if (now - fb.spawnTime < 1500) continue;
        if (fb.position.y - CHARACTERS[fb.characterLevel].radius < this.topLine) {
          const t0 = this.overLineSince.get(fb) ?? now;
          this.overLineSince.set(fb, t0);
          if (now - t0 > 1100) {
            this.triggerGameOver();
            break;
          }
        } else {
          this.overLineSince.delete(fb);
        }
      }
    }
  }

  private triggerGameOver() {
    this.gameOver = true;
    playGameOver();
    this.shakeAmount = 12;
    this.cb.onGameOver(this.score);
  }

  private drawCharacter(level: number, x: number, y: number, angle: number) {
    const def: CharacterStage = CHARACTERS[level];
    const r = def.radius;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    // 그림자
    ctx.beginPath();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.ellipse(2, 3, r, r, 0, 0, Math.PI * 2);
    ctx.fill();

    const img = getCharacterImage(def.imagePath);
    if (img) {
      // 원형 클립 후 이미지
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.rotate(angle);
      ctx.drawImage(img, -r, -r, r * 2, r * 2);
      ctx.restore();
      // 외곽
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.stroke();
    } else {
      // 색상 fallback
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
      grad.addColorStop(0, def.highlight);
      grad.addColorStop(0.6, def.color);
      grad.addColorStop(1, def.shadow);
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.stroke();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.22, r * 0.14, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private render() {
    const ctx = this.ctx;
    let sx = 0, sy = 0;
    if (this.shakeAmount > 0.1) {
      sx = (Math.random() - 0.5) * this.shakeAmount;
      sy = (Math.random() - 0.5) * this.shakeAmount;
    }
    ctx.save();
    ctx.translate(sx, sy);
    ctx.clearRect(-20, -20, this.width + 40, this.height + 40);

    // 우주 느낌 컨테이너 패널
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    const r = 18;
    const x = 4, y = this.topLine - 6, w = this.width - 8, h = this.height - this.topLine + 2;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();

    // 위험선
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "rgba(255, 120, 180, 0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, this.topLine);
    ctx.lineTo(this.width - 8, this.topLine);
    ctx.stroke();
    ctx.setLineDash([]);

    // 드롭 가이드
    if (!this.gameOver && this.canDrop) {
      const def = CHARACTERS[this.currentLevel];
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.dropX, this.topLine);
      ctx.lineTo(this.dropX, this.height - 4);
      ctx.stroke();
      ctx.globalAlpha = 0.85;
      this.drawCharacter(this.currentLevel, this.dropX, this.topLine - def.radius - 8, 0);
      ctx.globalAlpha = 1;
    }

    // 캐릭터
    const bodies = Matter.Composite.allBodies(this.world);
    for (const b of bodies) {
      const fb = b as CharacterBody;
      if (fb.characterLevel == null) continue;
      this.drawCharacter(fb.characterLevel, fb.position.x, fb.position.y, fb.angle);
    }

    // 파티클
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 팝업
    for (const p of this.popups) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 4;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;

    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.3})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }

  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000 || 0.016);
    this.lastTime = now;
    if (!this.paused) this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };
}
