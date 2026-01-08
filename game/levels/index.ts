import level1 from "./level1.json";
import level2 from "./level2.json";

export type LevelData = {
  viruses: { x: number; y: number; r: number }[];
  blocks: {
    x: number;
    y: number;
    w: number;
    h: number;
    kind: "wood" | "stone" | "metal";
  }[];
};

export function getLevel(level: number): LevelData {
  return level === 2 ? (level2 as LevelData) : (level1 as LevelData);
}
