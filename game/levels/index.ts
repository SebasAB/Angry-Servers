import level1 from "./level1.json";
import level2 from "./level2.json";
import level3 from "./level3.json";

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
  if (level === 2) return level2 as LevelData;
  if (level === 3) return level3 as LevelData;
  return level1 as LevelData;
}
