import * as Phaser from "phaser";
import { GAME_CONFIG } from "../config";
import { getLevel } from "../levels";

type XY = { x: number; y: number };

export default class LevelScene extends Phaser.Scene {
  private level = 1;

  private shotsLeft = GAME_CONFIG.shotsPerLevel;
  private projectile?: Phaser.Physics.Matter.Image;

  private slingAnchor!: Phaser.Math.Vector2;
  private isDragging = false;

  private uiText!: Phaser.GameObjects.Text;

  private viruses: Phaser.Physics.Matter.Image[] = [];
  private deadVirusBodies = new Set<MatterJS.BodyType>();
  private pendingKills: Phaser.Physics.Matter.Image[] = [];

  private blockBodies: MatterJS.BodyType[] = [];
  private blockSprites: Phaser.GameObjects.Rectangle[] = [];

  private launchPower = 0.00003;

  private levelComplete = false;

  private readonly MAX_BOUNCES = 5;
  private readonly MIN_BOUNCE_SPEED = 2.5;

  private isProjectileInFlight = false;

  // Failsafe tracking so game can't stall
  private flightStartMs = 0;
  private lowSpeedStartMs = 0;
  private readonly MAX_FLIGHT_MS = 6500;
  private readonly RESTING_MS_TO_END = 1400;
  private readonly LOW_SPEED_THRESHOLD = 0.35;

  // ✅ Virus HP system: small hits accumulate damage
  private readonly VIRUS_HP = 3;
  private readonly DAMAGE_MIN_SPEED = 0.9; // smaller than kill threshold
  private virusHp = new Map<MatterJS.BodyType, number>();

  constructor() {
    super("LevelScene");
  }

  create() {
    // Always load current level from URL when scene starts
    this.level = this.loadLevelFromUrl();

    const w = this.scale.width;
    const h = this.scale.height;

    this.levelComplete = false;
    this.deadVirusBodies.clear();
    this.pendingKills = [];
    this.virusHp.clear();

    this.shotsLeft = GAME_CONFIG.shotsPerLevel;
    this.isProjectileInFlight = false;
    this.flightStartMs = 0;
    this.lowSpeedStartMs = 0;

    this.matter.world.setBounds(0, 0, w, h);

    // Right wall stopper
    this.matter.add.rectangle(w - 6, h / 2, 12, h, {
      isStatic: true,
      label: "wall",
    });

    // Ground
    this.matter.add.rectangle(w / 2, h - 24, w, 48, {
      isStatic: true,
      label: "ground",
    });
    this.add.rectangle(w / 2, h - 24, w, 48, 0x18213a).setDepth(0);

    // Decorative servers
    for (let i = 0; i < 4; i++) {
      const sx = 70;
      const sy = h - 90 - i * 70;
      this.add.rectangle(sx, sy, 80, 52, 0x2b3355).setStrokeStyle(2, 0x4e5aa0);

      const led = this.add.circle(sx + 28, sy - 14, 4, 0x68ff8a);
      this.tweens.add({
        targets: led,
        alpha: { from: 0.25, to: 1 },
        duration: 650,
        yoyo: true,
        repeat: -1,
        delay: i * 120,
      });
    }

    // UI
    this.uiText = this.add
      .text(16, 16, "", {
        fontFamily: "system-ui",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setDepth(10);

    // Sling anchor
    this.slingAnchor = new Phaser.Math.Vector2(170, h - 140);
    this.add.circle(this.slingAnchor.x, this.slingAnchor.y, 10, 0xffffff, 0.15);

    // Build + spawn
    this.buildLevel();
    this.spawnProjectile();

    // Collisions
    this.setupCollisionSystem();

    // Input
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (!this.projectile || this.levelComplete) return;
      if (this.isProjectileInFlight) return;

      const dx = p.worldX - this.projectile.x;
      const dy = p.worldY - this.projectile.y;
      const r = GAME_CONFIG.projectile.radius;

      const rr = r * 2.2 * (r * 2.2);
      if (dx * dx + dy * dy <= rr) {
        this.isDragging = true;
        this.projectile.setStatic(true);
      }
    });

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.isDragging || !this.projectile || this.levelComplete) return;

      const pull = new Phaser.Math.Vector2(
        this.slingAnchor.x - p.worldX,
        this.slingAnchor.y - p.worldY
      );

      const len = pull.length();
      if (len > GAME_CONFIG.sling.maxPull)
        pull.setLength(GAME_CONFIG.sling.maxPull);

      const newPos = new Phaser.Math.Vector2(
        this.slingAnchor.x - pull.x,
        this.slingAnchor.y - pull.y
      );

      this.projectile.setPosition(newPos.x, newPos.y);
    });

    this.input.on("pointerup", () => {
      if (!this.isDragging || !this.projectile || this.levelComplete) return;

      this.isDragging = false;

      const pull = new Phaser.Math.Vector2(
        this.slingAnchor.x - this.projectile.x,
        this.slingAnchor.y - this.projectile.y
      );

      this.projectile.setStatic(false);

      const forceVec: XY = {
        x: pull.x * this.launchPower,
        y: pull.y * this.launchPower,
      };
      this.projectile.applyForce(
        new Phaser.Math.Vector2(forceVec.x, forceVec.y)
      );
      this.projectile.setAngularVelocity(0.12);

      this.isProjectileInFlight = true;
      this.flightStartMs = this.time.now;
      this.lowSpeedStartMs = 0;
    });

    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.matter.world.setBounds(0, 0, gameSize.width, gameSize.height);
    });
  }

  update() {
    this.uiText.setText(`Level ${this.level}  •  Shots: ${this.shotsLeft}`);

    // Sync blocks
    for (let i = 0; i < this.blockBodies.length; i++) {
      const body = this.blockBodies[i] as any;
      const rect = this.blockSprites[i];
      rect.setPosition(body.position.x, body.position.y);
      rect.setRotation(body.angle);
    }

    // Process kills
    if (this.pendingKills.length > 0) {
      const toKill = this.pendingKills;
      this.pendingKills = [];
      for (const v of toKill) {
        if (v && v.active) this.softKillVirus(v);
      }
    }

    // Failsafe for stuck projectiles
    if (
      this.isProjectileInFlight &&
      this.projectile &&
      this.projectile.active
    ) {
      const body = this.projectile.body as any;
      const v = body?.velocity ?? { x: 0, y: 0 };
      const speed = Math.sqrt(v.x * v.x + v.y * v.y);

      if (speed < this.LOW_SPEED_THRESHOLD) {
        if (this.lowSpeedStartMs === 0) this.lowSpeedStartMs = this.time.now;
        const restingFor = this.time.now - this.lowSpeedStartMs;
        if (restingFor >= this.RESTING_MS_TO_END) {
          this.endProjectile(this.projectile);
        }
      } else {
        this.lowSpeedStartMs = 0;
      }

      const flightFor = this.time.now - this.flightStartMs;
      if (this.flightStartMs > 0 && flightFor >= this.MAX_FLIGHT_MS) {
        this.endProjectile(this.projectile);
      }
    }
  }

  private loadLevelFromUrl(): number {
    try {
      if (typeof window === "undefined") return 1;
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("level");
      const lvl = raw ? parseInt(raw, 10) : 1;
      if (Number.isFinite(lvl) && lvl >= 1 && lvl <= 2) return lvl;
      return 1;
    } catch {
      return 1;
    }
  }

  private spawnProjectile() {
    const h = this.scale.height;

    const proj = this.matter.add.image(this.slingAnchor.x, h - 140, "logo");
    proj.setCircle(GAME_CONFIG.projectile.radius);

    proj.setFrictionAir(0.005);
    proj.setFriction(0.01);
    proj.setBounce(0.65);
    proj.setMass(GAME_CONFIG.projectile.mass);
    proj.setDepth(5);

    const body = proj.body as MatterJS.BodyType;
    (body as any).label = "projectile";

    proj.setData("bounces", 0);

    const d = GAME_CONFIG.projectile.radius * 2;
    proj.setDisplaySize(d, d);

    this.projectile = proj;
    this.isProjectileInFlight = false;
  }

  private setupCollisionSystem() {
    this.matter.world.off("collisionstart");

    this.matter.world.on("collisionstart", (event: any) => {
      if (this.levelComplete) return;

      const pairs = event.pairs as Array<any>;
      for (const pair of pairs) {
        const bodyA = pair.bodyA as MatterJS.BodyType;
        const bodyB = pair.bodyB as MatterJS.BodyType;

        const aLabel = (bodyA as any).label as string | undefined;
        const bLabel = (bodyB as any).label as string | undefined;

        // ---- Projectile bounce counting ----
        if (
          this.projectile &&
          this.projectile.body &&
          this.isProjectileInFlight
        ) {
          const projBody = this.projectile.body as MatterJS.BodyType;
          const isProjInPair = bodyA === projBody || bodyB === projBody;

          if (isProjInPair) {
            const v = (projBody as any).velocity ?? { x: 0, y: 0 };
            const speed = Math.sqrt(v.x * v.x + v.y * v.y);

            if (speed > this.MIN_BOUNCE_SPEED) {
              const current =
                (this.projectile.getData("bounces") as number) ?? 0;
              const next = current + 1;
              this.projectile.setData("bounces", next);

              if (next >= this.MAX_BOUNCES) {
                this.endProjectile(this.projectile);
                continue;
              }
            }
          }
        }

        // ---- Virus damage (impact + cumulative HP) ----
        const virusBody =
          aLabel === "virus" ? bodyA : bLabel === "virus" ? bodyB : null;

        if (!virusBody) continue;
        if (this.deadVirusBodies.has(virusBody)) continue;

        const vA = (bodyA as any).velocity ?? { x: 0, y: 0 };
        const vB = (bodyB as any).velocity ?? { x: 0, y: 0 };
        const relVx = vA.x - vB.x;
        const relVy = vA.y - vB.y;
        const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy);

        const virusObj = this.findVirusByBody(virusBody);
        if (!virusObj) continue;

        // Big smash = immediate kill (existing behavior)
        if (relSpeed >= GAME_CONFIG.virusImpactThreshold) {
          this.deadVirusBodies.add(virusBody);
          this.pendingKills.push(virusObj);
          continue;
        }

        // Smaller hits accumulate damage (new behavior)
        if (relSpeed >= this.DAMAGE_MIN_SPEED) {
          const hp = this.virusHp.get(virusBody) ?? this.VIRUS_HP;
          const newHp = hp - 1;
          this.virusHp.set(virusBody, newHp);

          // tiny visual feedback (quick flash)
          this.tweens.add({
            targets: virusObj,
            alpha: 0.6,
            duration: 60,
            yoyo: true,
          });

          if (newHp <= 0) {
            this.deadVirusBodies.add(virusBody);
            this.pendingKills.push(virusObj);
          }
        }
      }
    });
  }

  private endProjectile(proj: Phaser.Physics.Matter.Image) {
    if (!proj.active) return;

    proj.setStatic(true);
    proj.setSensor(true);

    this.tweens.add({
      targets: proj,
      alpha: 0,
      duration: 200,
      onComplete: () => proj.destroy(),
    });

    this.isProjectileInFlight = false;
    this.flightStartMs = 0;
    this.lowSpeedStartMs = 0;

    this.time.delayedCall(260, () => {
      if (this.levelComplete) return;
      if (this.viruses.length === 0) return;

      if (this.shotsLeft <= 1) {
        this.shotsLeft = 0;
        this.showLoseOverlay("Out of shots");
        return;
      }

      this.shotsLeft -= 1;
      this.spawnProjectile();
    });
  }

  private findVirusByBody(body: MatterJS.BodyType) {
    for (const v of this.viruses) {
      if ((v.body as MatterJS.BodyType) === body) return v;
    }
    return undefined;
  }

  private virusTextureKey(): string {
    return this.textures.exists("virusPng") ? "virusPng" : "virus";
  }

  private createVirus(x: number, y: number, diameterPx: number) {
    const virus = this.matter.add.image(x, y, this.virusTextureKey());
    virus.setDisplaySize(diameterPx, diameterPx);

    const r = diameterPx / 2;
    virus.setCircle(r);

    virus.setBounce(0.12);
    virus.setFriction(0.7);
    virus.setDepth(4);
    virus.setFixedRotation();

    const vBody = virus.body as MatterJS.BodyType;
    (vBody as any).label = "virus";

    // init HP
    this.virusHp.set(vBody, this.VIRUS_HP);

    return virus;
  }

  private softKillVirus(virus: Phaser.Physics.Matter.Image) {
    const body = virus.body as MatterJS.BodyType;

    this.viruses = this.viruses.filter((v) => v !== virus);
    this.virusHp.delete(body);

    this.popBurst(virus.x, virus.y);

    virus.setStatic(true);
    virus.setSensor(true);
    virus.setVisible(false);

    if (this.viruses.length === 0 && !this.levelComplete) {
      this.levelComplete = true;
      this.isDragging = false;
      this.time.delayedCall(250, () => this.showWinOverlay());
    }
  }

  private popBurst(x: number, y: number) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const dot = this.add.image(x, y, "particle").setDepth(150);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(18, 55);

      const tx = x + Math.cos(angle) * dist;
      const ty = y + Math.sin(angle) * dist;

      dot.setAlpha(1);
      dot.setScale(Phaser.Math.FloatBetween(0.8, 1.3));

      this.tweens.add({
        targets: dot,
        x: tx,
        y: ty,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(220, 420),
        ease: "Quad.easeOut",
        onComplete: () => dot.destroy(),
      });
    }

    this.cameras.main.shake(60, 0.004);
  }

  private showWinOverlay() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setDepth(200);

    this.add
      .text(w / 2, h / 2 - 60, "Servers secured! ✅", {
        fontFamily: "system-ui",
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(201);

    const makeButton = (
      label: string,
      x: number,
      y: number,
      onClick: () => void
    ) => {
      const btnBg = this.add
        .rectangle(x, y, 200, 44, 0x1f2a44, 0.95)
        .setStrokeStyle(2, 0x4e5aa0, 1)
        .setDepth(201)
        .setInteractive({ useHandCursor: true });

      this.add
        .text(x, y, label, {
          fontFamily: "system-ui",
          fontSize: "16px",
          color: "#ffffff",
        })
        .setOrigin(0.5)
        .setDepth(202);

      btnBg.on("pointerdown", onClick);
    };

    const nextLevel = this.level + 1;
    if (nextLevel <= 2) {
      makeButton("Next Level", w / 2, h / 2 + 20, () => {
        window.location.href = `/play?level=${nextLevel}`;
      });
    } else {
      makeButton("Back to Menu", w / 2, h / 2 + 20, () => {
        window.location.href = "/";
      });
    }

    makeButton("Restart", w / 2, h / 2 + 75, () => window.location.reload());
  }

  private showLoseOverlay(msg: string) {
    const w = this.scale.width;
    const h = this.scale.height;

    // ✅ Full-screen interactive hit area so tap ALWAYS restarts
    const hit = this.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.6)
      .setDepth(200)
      .setInteractive();

    this.add
      .text(w / 2, h / 2 - 30, msg, {
        fontFamily: "system-ui",
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(201);

    this.add
      .text(w / 2, h / 2 + 10, "Tap to restart", {
        fontFamily: "system-ui",
        fontSize: "16px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(201);

    hit.once("pointerdown", () => this.scene.restart());
  }

  // ---------------------------
  // Levels
  // ---------------------------

  private worldToScreen(x: number, y: number) {
    const designW = 1200;
    const designH = 700;

    const sx = this.scale.width / designW;
    const sy = this.scale.height / designH;

    return { x: x * sx, y: y * sy, sx, sy };
  }

  private clearLevel() {
    for (const v of this.viruses) v.destroy();
    this.viruses = [];

    for (const b of this.blockBodies) this.matter.world.remove(b);
    this.blockBodies = [];

    for (const s of this.blockSprites) s.destroy();
    this.blockSprites = [];
  }

  private buildLevel() {
    this.clearLevel();
    const data = getLevel(this.level);

    // Blocks
    for (const blk of data.blocks) {
      const p = this.worldToScreen(blk.x, blk.y);
      const bw = blk.w * p.sx;
      const bh = blk.h * p.sy;

      const body = this.matter.add.rectangle(p.x, p.y, bw, bh, {
        restitution: 0.02,
        friction: 0.95,
        density: 0.01,
      });

      (body as any).label = "block";
      this.blockBodies.push(body);

      const color =
        blk.kind === "wood"
          ? 0x9a6b3f
          : blk.kind === "stone"
            ? 0x7a8591
            : 0x8a8a8a;

      const rect = this.add.rectangle(p.x, p.y, bw, bh, color).setDepth(2);
      rect.setStrokeStyle(1, 0x000000, 0.15);
      this.blockSprites.push(rect);
    }

    // Viruses
    for (const vz of data.viruses) {
      const p = this.worldToScreen(vz.x, vz.y);
      const diameter = Math.max(20, vz.r * 2 * p.sx);
      const virus = this.createVirus(p.x, p.y, diameter);
      this.viruses.push(virus);
    }
  }
}
