import { COMMANDS, MATCH_RULES } from "./constants.js";
import { scoreEventChain } from "./scoring.js";
import { applyMatchToWorld, saveWorldState } from "./world.js";
import { clearQueue, createInitialMatchState, queueCommand, resolveTurn } from "./simulation.js";

export function createGameController({ worldState, onWorldChange }) {
  let matchState = null;
  let selectedCommand = COMMANDS[0];
  let selectedTarget = "enemy";
  let playerScore = 0;
  let enemyScore = 0;

  function startMatch(channel) {
    matchState = createInitialMatchState(channel, worldState);
    playerScore = 0;
    enemyScore = 0;
    return getSnapshot("New match tuned.");
  }

  function queueSelectedCommand() {
    if (!matchState || matchState.activeSide !== "player") return getSnapshot("Wait for your turn.");
    matchState = queueCommand(matchState, selectedCommand, selectedTarget);
    return getSnapshot(`Queued ${selectedCommand} on ${selectedTarget}.`);
  }

  function clearCommandQueue() {
    if (!matchState) return getSnapshot("No active channel.");
    matchState = clearQueue(matchState);
    return getSnapshot("Queue cleared.");
  }

  function endTurn() {
    if (!matchState) return getSnapshot("No active channel.");

    const allLogs = [];

    const playerResult = resolveTurn(matchState, worldState);
    matchState = playerResult.state;
    const playerScored = scoreEventChain(playerResult.eventChain, matchState.channel);
    playerScore += playerScored.totalScore;
    allLogs.push(formatTurn("PLAYER", playerResult.eventChain, playerScored));

    if (!matchState.isOver) {
      const enemyResult = resolveTurn(matchState, worldState);
      matchState = enemyResult.state;
      const enemyScored = scoreEventChain(enemyResult.eventChain, matchState.channel);
      enemyScore += enemyScored.totalScore;
      allLogs.push(formatTurn("ENEMY", enemyResult.eventChain, enemyScored));
    }

    if (matchState.isOver) {
      const summary = {
        playerScore,
        enemyScore,
        branchDepth: Math.max(...matchState.resolvedTurns.map((t) => estimateDepth(t.events)), 1),
        typeTotals: collectTypeTotals(matchState.resolvedTurns.flatMap((t) => t.events))
      };

      const { next, delta } = applyMatchToWorld(worldState, matchState.channel, summary);
      Object.assign(worldState, next);
      saveWorldState(worldState);
      onWorldChange(delta, worldState, summary, matchState);
      allLogs.push(renderMatchSummary(summary, matchState));
    }

    return getSnapshot(allLogs.join("\n\n"));
  }

  function updateSelection(command, target) {
    if (command) selectedCommand = command;
    if (target) selectedTarget = target;
    return getSnapshot(`Selected ${selectedCommand} on ${selectedTarget}.`);
  }

  function getSnapshot(message = "") {
    return {
      matchState,
      selectedCommand,
      selectedTarget,
      playerScore,
      enemyScore,
      message,
      budgetCap: MATCH_RULES.actionBudgetPerPlayerTurn
    };
  }

  return {
    startMatch,
    queueSelectedCommand,
    clearCommandQueue,
    endTurn,
    updateSelection,
    getSnapshot
  };
}

function formatTurn(actor, events, scored) {
  const chainLines = events.map((e) => `- [${e.type}] ${e.description} (sig ${e.significance})`);
  return `${actor} TURN\nBranch Score: ${scored.branchScore} | Ambient: ${scored.ambientScore} | Total: ${scored.totalScore}\nDepth: ${scored.branchDepth}\n${chainLines.join("\n")}`;
}

function estimateDepth(events) {
  const depthMap = new Map();
  let maxDepth = 1;
  for (const e of events) {
    const depth = e.parentId ? (depthMap.get(e.parentId) ?? 1) + 1 : 1;
    depthMap.set(e.id, depth);
    if (depth > maxDepth) maxDepth = depth;
  }
  return maxDepth;
}

function collectTypeTotals(events) {
  const totals = { damage: 0, unit: 0, scan: 0, shield: 0, chaos: 0, control: 0 };
  for (const e of events) {
    if (totals[e.type] !== undefined) totals[e.type] += e.significance;
  }
  return totals;
}

function renderMatchSummary(summary, matchState) {
  return [
    "MATCH ENDED",
    `Winner: ${matchState.winner.toUpperCase()}`,
    `Score ${summary.playerScore} (you) vs ${summary.enemyScore} (enemy)`,
    `Deepest meaningful branch depth: ${summary.branchDepth}`,
    `Type totals => damage:${summary.typeTotals.damage} control:${summary.typeTotals.control} chaos:${summary.typeTotals.chaos}`
  ].join("\n");
}
