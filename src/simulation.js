import { MATCH_RULES } from "./constants.js";

let eventId = 1;

export function createInitialMatchState(channel, worldState) {
  const driftBonus = Math.floor(Math.abs(worldState.drift) / 20);
  return {
    channel,
    turn: 1,
    activeSide: "player",
    player: { hp: MATCH_RULES.baseHp, units: MATCH_RULES.baseUnits, shield: 0 },
    enemy: { hp: MATCH_RULES.baseHp + driftBonus, units: MATCH_RULES.baseUnits, shield: 0 },
    queue: [],
    budgetLeft: MATCH_RULES.actionBudgetPerPlayerTurn,
    resolvedTurns: [],
    isOver: false,
    winner: null
  };
}

export function queueCommand(state, command, target) {
  if (state.budgetLeft <= 0 || state.isOver) return state;
  const next = { ...state, queue: [...state.queue, { command, target }], budgetLeft: state.budgetLeft - 1 };
  return next;
}

export function clearQueue(state) {
  return { ...state, queue: [], budgetLeft: MATCH_RULES.actionBudgetPerPlayerTurn };
}

export function resolveTurn(state, worldState) {
  const eventChain = [];
  let working = structuredClone(state);

  if (working.activeSide === "player") {
    if (!working.queue.length) {
      working.queue.push({ command: "SCAN", target: "enemy" });
    }
    for (const queued of working.queue) {
      applyCommand(working, queued.command, queued.target, "player", eventChain, worldState);
    }
    working.queue = [];
    working.budgetLeft = MATCH_RULES.actionBudgetPerPlayerTurn;
    working.activeSide = "enemy";
  } else {
    const enemyAction = chooseEnemyAction(working);
    applyCommand(working, enemyAction.command, enemyAction.target, "enemy", eventChain, worldState);
    working.activeSide = "player";
    working.turn += 1;
  }

  decayShields(working);
  assessEnd(working);

  working.resolvedTurns.push({
    turn: working.turn,
    actor: state.activeSide,
    events: eventChain
  });

  return { state: working, eventChain };
}

function chooseEnemyAction(state) {
  if (state.enemy.units <= 2) return { command: "SPAWN", target: "enemy" };
  if (state.enemy.shield < 1) return { command: "SHIELD", target: "enemy" };
  const options = ["PUSH", "EXPLODE", "SCAN"];
  const pick = options[(state.turn + state.enemy.hp + state.player.units) % options.length];
  return { command: pick, target: "player" };
}

function applyCommand(state, command, target, source, eventChain, worldState) {
  const sourceState = state[source];
  const targetKey = target === "player" ? "player" : "enemy";
  const targetState = state[targetKey];

  const root = addEvent(eventChain, null, 1, command, source, `${source.toUpperCase()} ${command} -> ${target.toUpperCase()}`);

  switch (command) {
    case "SCAN": {
      addEvent(eventChain, root.id, 2, "scan", source, "Mapped weak points and shield pressure.");
      addEvent(eventChain, root.id, 1 + state[targetKey].shield, "control", source, "Future actions gain clearer causal routing.");
      break;
    }
    case "PUSH": {
      const damage = Math.max(1, sourceState.units - targetState.shield);
      dealDamage(targetState, damage);
      addEvent(eventChain, root.id, damage, "damage", source, `Kinetic wave dealt ${damage} integrity damage.`);
      maybeCascade(eventChain, root.id, "control", source, state, worldState);
      break;
    }
    case "SPAWN": {
      sourceState.units += 1;
      addEvent(eventChain, root.id, 2, "unit", source, "Spawned a new anomaly unit.");
      if (sourceState.units >= 5) {
        addEvent(eventChain, root.id, 3, "chaos", source, "Overcrowding introduced unstable interactions.");
      }
      break;
    }
    case "SHIELD": {
      sourceState.shield += 2;
      addEvent(eventChain, root.id, 2, "shield", source, "Defensive veil thickened by 2.");
      addEvent(eventChain, root.id, 2, "control", source, "Stabilized local branch behavior.");
      break;
    }
    case "EXPLODE": {
      const blastDamage = 2 + Math.floor(sourceState.units / 2);
      sourceState.units = Math.max(1, sourceState.units - 1);
      dealDamage(targetState, blastDamage);
      addEvent(eventChain, root.id, blastDamage, "damage", source, `Entropy burst dealt ${blastDamage} damage.`);
      addEvent(eventChain, root.id, 2, "chaos", source, "Shockwaves fractured nearby futures.");
      maybeCascade(eventChain, root.id, "chaos", source, state, worldState, true);
      break;
    }
    default:
      break;
  }
}

function maybeCascade(chain, parentId, type, source, state, worldState, explosive = false) {
  const pressure = state.player.units + state.enemy.units + Math.abs(worldState.drift);
  const threshold = explosive ? 7 : 9;
  if (pressure >= threshold) {
    addEvent(chain, parentId, 3, type, source, "Secondary branch formed from compound interactions.");
    addEvent(chain, parentId, 4, "chaos", source, "Tertiary ripple diverged into distant outcomes.");
  }
}

function addEvent(chain, parentId, significance, type, source, description) {
  const event = {
    id: eventId++,
    parentId,
    significance,
    type,
    source,
    description
  };
  chain.push(event);
  return event;
}

function dealDamage(target, amount) {
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  target.hp -= amount - absorbed;
}

function decayShields(state) {
  state.player.shield = Math.max(0, state.player.shield - 1);
  state.enemy.shield = Math.max(0, state.enemy.shield - 1);
}

function assessEnd(state) {
  if (state.player.hp <= 0 || state.enemy.hp <= 0 || state.turn > MATCH_RULES.maxTurns) {
    state.isOver = true;
    if (state.player.hp === state.enemy.hp) state.winner = "draw";
    else state.winner = state.player.hp > state.enemy.hp ? "player" : "enemy";
  }
}
