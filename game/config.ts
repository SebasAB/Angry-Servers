export const GAME_CONFIG = {
  shotsPerLevel: 5, // ✅ easy to tweak
  virusImpactThreshold: 6.5, // used later when we add damage
  projectile: {
    radius: 24, // physics radius (px in "design space")
    mass: 1.2,
  },
  sling: {
    maxPull: 140,
    strength: 0.015,
  },
};
