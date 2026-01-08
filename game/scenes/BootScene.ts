import * as Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.image("logo", "/assets/projectile/logo.png");

    // If you add a real virus PNG here, we'll use it:
    // public/assets/virus/virus.png
    this.load.image("virusPng", "/assets/virus/virus.png");
  }

  create() {
    // If virusPng loaded successfully, use it as "virus".
    // If it didn't load (missing file), generate a fallback "virus".
    if (
      this.textures.exists("virusPng") &&
      this.textures.get("virusPng").key === "virusPng"
    ) {
      // Alias virusPng -> virus by creating a new texture key
      // (Phaser doesn't have a direct alias, so we just use "virusPng" in LevelScene if needed.)
      // We'll keep both and prefer "virusPng" in LevelScene.
    } else {
      // Fallback generated virus texture (spiky blob)
      const g = this.add.graphics();
      const cx = 64;
      const cy = 64;
      const baseR = 42;

      g.fillStyle(0x2eea5a, 1);
      for (let i = 0; i < 14; i++) {
        const ang = (Math.PI * 2 * i) / 14;
        const r2 = baseR + 18;
        const x2 = cx + Math.cos(ang) * r2;
        const y2 = cy + Math.sin(ang) * r2;
        g.fillCircle(x2, y2, 6);
      }

      g.fillStyle(0x31d158, 1);
      g.fillCircle(cx, cy, baseR);

      g.fillStyle(0x149a38, 1);
      g.fillCircle(cx + 14, cy - 10, 18);

      g.fillStyle(0xcaffd7, 0.75);
      g.fillCircle(cx - 16, cy - 18, 10);
      g.fillCircle(cx - 8, cy - 30, 6);

      g.generateTexture("virus", 128, 128);
      g.destroy();
    }

    // Particle texture (tiny dot)
    const pg = this.add.graphics();
    pg.fillStyle(0xffffff, 1);
    pg.fillCircle(4, 4, 4);
    pg.generateTexture("particle", 8, 8);
    pg.destroy();

    this.scene.start("LevelScene");
  }
}
