import { COMMANDS, CHANNEL_CONFIG } from "./constants.js";
import { createGameController } from "./game.js";
import { loadWorldState, saveWorldState } from "./world.js";

const battlefieldEl = document.querySelector("#battlefield");
const turnPanelEl = document.querySelector("#turn-panel");
const turnSummaryEl = document.querySelector("#turn-summary");
const matchSummaryEl = document.querySelector("#match-summary");
const worldSummaryEl = document.querySelector("#world-summary");
const channelEl = document.querySelector("#channel");

const worldState = loadWorldState();
const controller = createGameController({
  worldState,
  onWorldChange: (delta, current, summary, matchState) => {
    matchSummaryEl.textContent = [
      `Channel: ${matchState.channel}`,
      `Winner: ${matchState.winner}`,
      `Score: You ${summary.playerScore} / Enemy ${summary.enemyScore}`,
      `World Delta => instability ${fmt(delta.instability)}, destruction ${fmt(delta.destruction)}, control ${fmt(delta.control)}, chaos ${fmt(delta.chaos)}, drift ${fmt(delta.drift)}`
    ].join("\n");
    renderWorld(current);
  }
});

bindControls();
renderWorld(worldState);
render(controller.getSnapshot("Choose a channel and start."));

function bindControls() {
  document.querySelector("#start-match").addEventListener("click", () => {
    const snapshot = controller.startMatch(channelEl.value);
    render(snapshot);
  });

  document.querySelector("#reset-world").addEventListener("click", () => {
    Object.assign(worldState, { matchesPlayed: 0, instability: 0, chaos: 0, control: 0, destruction: 0, drift: 0 });
    saveWorldState(worldState);
    renderWorld(worldState);
    matchSummaryEl.textContent = "World reset.";
  });
}

function render(snapshot) {
  renderBattlefield(snapshot);
  renderTurnPanel(snapshot);
  if (snapshot.message) turnSummaryEl.textContent = snapshot.message;
}

function renderBattlefield(snapshot) {
  if (!snapshot.matchState) {
    battlefieldEl.innerHTML = "<p>No active channel. Start a match.</p>";
    return;
  }

  const m = snapshot.matchState;
  battlefieldEl.innerHTML = `
    <div class="battlefield-grid">
      <article class="side-card">
        <h3>You</h3>
        <div>HP: ${m.player.hp}</div>
        <div>Units: ${m.player.units}</div>
        <div>Shield: ${m.player.shield}</div>
        <div>Score: ${snapshot.playerScore}</div>
      </article>
      <article class="side-card">
        <h3>Enemy</h3>
        <div>HP: ${m.enemy.hp}</div>
        <div>Units: ${m.enemy.units}</div>
        <div>Shield: ${m.enemy.shield}</div>
        <div>Score: ${snapshot.enemyScore}</div>
      </article>
    </div>
    <p><strong>Turn:</strong> ${m.turn} | <strong>Active:</strong> ${m.activeSide} | <strong>Channel:</strong> ${m.channel}</p>
  `;
}

function renderTurnPanel(snapshot) {
  const matchState = snapshot.matchState;
  if (!matchState) {
    turnPanelEl.innerHTML = "<p>Queue commands after starting a match.</p>";
    return;
  }

  const commandButtons = COMMANDS.map(
    (cmd) => `<button data-cmd="${cmd}" class="${snapshot.selectedCommand === cmd ? "selected" : ""}">${cmd}</button>`
  ).join("");

  turnPanelEl.innerHTML = `
    <h2>Guided Command Console</h2>
    <div class="command-grid">${commandButtons}</div>
    <div class="target-grid">
      <button data-target="enemy">Target ENEMY</button>
      <button data-target="player">Target PLAYER</button>
    </div>
    <div>Selected: ${snapshot.selectedCommand} -> ${snapshot.selectedTarget}</div>
    <div>Action Budget: ${matchState.budgetLeft} / ${snapshot.budgetCap}</div>
    <div class="queue-grid">
      ${(matchState.queue.length ? matchState.queue : [{ command: "(empty)", target: "" }])
        .map((q) => `<div class="queue-item">${q.command} ${q.target ? `→ ${q.target}` : ""}</div>`)
        .join("")}
    </div>
    <button id="queue-command" ${matchState.activeSide !== "player" || matchState.isOver ? "disabled" : ""}>Add To Queue</button>
    <button id="clear-queue" ${matchState.activeSide !== "player" || matchState.isOver ? "disabled" : ""}>Clear Queue</button>
    <button id="end-turn" ${matchState.isOver ? "disabled" : ""}>Resolve Turn Pair</button>
    <p>Channel scoring emphasis: ${describeChannel(matchState.channel)}</p>
  `;

  turnPanelEl.querySelectorAll("[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      render(controller.updateSelection(btn.dataset.cmd, null));
    });
  });

  turnPanelEl.querySelectorAll("[data-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      render(controller.updateSelection(null, btn.dataset.target));
    });
  });

  turnPanelEl.querySelector("#queue-command").addEventListener("click", () => {
    render(controller.queueSelectedCommand());
  });

  turnPanelEl.querySelector("#clear-queue").addEventListener("click", () => {
    render(controller.clearCommandQueue());
  });

  turnPanelEl.querySelector("#end-turn").addEventListener("click", () => {
    render(controller.endTurn());
  });
}

function describeChannel(channel) {
  const config = CHANNEL_CONFIG[channel];
  const emphasized = Object.entries(config.eventTypeWeights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k)
    .join(", ");
  return `${channel} rewards ${emphasized} and deep branches.`;
}

function renderWorld(world) {
  worldSummaryEl.textContent = [
    `Matches Played: ${world.matchesPlayed}`,
    `Instability: ${world.instability}`,
    `Destruction: ${world.destruction}`,
    `Control: ${world.control}`,
    `Chaos: ${world.chaos}`,
    `World Drift: ${world.drift}`
  ].join("\n");
}

function fmt(value) {
  return value > 0 ? `+${value}` : `${value}`;
}
