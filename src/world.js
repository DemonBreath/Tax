const WORLD_KEY = "interdimensional-cable-world-v1";

const defaultWorldState = {
  matchesPlayed: 0,
  instability: 0,
  chaos: 0,
  control: 0,
  destruction: 0,
  drift: 0
};

export function loadWorldState() {
  const raw = localStorage.getItem(WORLD_KEY);
  if (!raw) {
    return { ...defaultWorldState };
  }
  try {
    return { ...defaultWorldState, ...JSON.parse(raw) };
  } catch {
    return { ...defaultWorldState };
  }
}

export function saveWorldState(worldState) {
  localStorage.setItem(WORLD_KEY, JSON.stringify(worldState));
}

export function applyMatchToWorld(worldState, channel, matchSummary) {
  const next = { ...worldState };
  next.matchesPlayed += 1;

  const { playerScore, enemyScore, branchDepth } = matchSummary;
  const margin = playerScore - enemyScore;

  next.instability = clamp(next.instability + Math.round(branchDepth * 0.6));
  next.destruction = clamp(next.destruction + Math.round(matchSummary.typeTotals.damage * 0.4));
  next.control = clamp(next.control + Math.round(matchSummary.typeTotals.control * 0.6));
  next.chaos = clamp(next.chaos + Math.round(matchSummary.typeTotals.chaos * 0.8));
  next.drift = clamp(next.drift + Math.round(margin * 0.05 + (channel === "Chaos" ? 2 : 0)));

  return {
    next,
    delta: {
      instability: next.instability - worldState.instability,
      destruction: next.destruction - worldState.destruction,
      control: next.control - worldState.control,
      chaos: next.chaos - worldState.chaos,
      drift: next.drift - worldState.drift
    }
  };
}

function clamp(value) {
  return Math.max(-100, Math.min(100, value));
}
