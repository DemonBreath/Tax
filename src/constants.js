export const COMMANDS = ["SCAN", "PUSH", "SPAWN", "SHIELD", "EXPLODE"];

export const CHANNEL_CONFIG = {
  Destruction: {
    label: "Destruction",
    branchDepthWeight: 1.15,
    eventTypeWeights: {
      damage: 1.4,
      unit: 1.2,
      scan: 0.7,
      shield: 0.8,
      chaos: 1.1,
      control: 0.8
    }
  },
  Control: {
    label: "Control",
    branchDepthWeight: 1.1,
    eventTypeWeights: {
      damage: 0.8,
      unit: 1.0,
      scan: 1.3,
      shield: 1.5,
      chaos: 0.7,
      control: 1.4
    }
  },
  Chaos: {
    label: "Chaos",
    branchDepthWeight: 1.3,
    eventTypeWeights: {
      damage: 1.0,
      unit: 1.0,
      scan: 0.9,
      shield: 0.9,
      chaos: 1.6,
      control: 0.8
    }
  }
};

export const MATCH_RULES = {
  actionBudgetPerPlayerTurn: 2,
  maxTurns: 10,
  baseHp: 24,
  baseUnits: 3
};
