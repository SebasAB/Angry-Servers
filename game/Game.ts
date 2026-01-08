import * as Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import LevelScene from "./scenes/LevelScene";

let game: Phaser.Game | null = null;

export function startGame(parent: HTMLElement): Phaser.Game {
  if (game) return game;

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0b1020",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: parent.clientWidth,
      height: parent.clientHeight,
    },
    physics: {
      default: "matter",
      matter: {
        gravity: { x: 0, y: 1.0 }, // ✅ keep this (fixes TS typing + explicit)
        // debug: true,
      },
    },
    scene: [new BootScene(), new LevelScene()],
  });

  return game;
}

export function stopGame() {
  if (!game) return;
  game.destroy(true);
  game = null;
}
