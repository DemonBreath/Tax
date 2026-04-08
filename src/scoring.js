import { CHANNEL_CONFIG } from "./constants.js";

export function scoreEventChain(eventChain, channelName) {
  const channel = CHANNEL_CONFIG[channelName];
  const byParent = new Map();
  const roots = [];
  const typeTotals = { damage: 0, unit: 0, scan: 0, shield: 0, chaos: 0, control: 0 };

  for (const event of eventChain) {
    if (typeTotals[event.type] !== undefined) {
      typeTotals[event.type] += event.significance;
    }
    if (event.parentId === null) {
      roots.push(event);
    } else {
      if (!byParent.has(event.parentId)) byParent.set(event.parentId, []);
      byParent.get(event.parentId).push(event);
    }
  }

  let bestBranch = { weighted: 0, depth: 0, nodes: [] };

  for (const root of roots) {
    const branch = walk(root, byParent, channel, 1, []);
    if (branch.weighted > bestBranch.weighted) bestBranch = branch;
  }

  const branchScore = Math.round(bestBranch.weighted);
  const ambientScore = Math.round(eventChain.reduce((sum, event) => sum + event.significance * 0.35, 0));

  return {
    branchScore,
    ambientScore,
    totalScore: branchScore + ambientScore,
    branchDepth: bestBranch.depth,
    bestBranchNodes: bestBranch.nodes,
    typeTotals
  };
}

function walk(node, byParent, channel, depth, nodes) {
  const typeWeight = channel.eventTypeWeights[node.type] ?? 1;
  const currentValue = node.significance * typeWeight * Math.pow(channel.branchDepthWeight, depth - 1);
  const nextNodes = [...nodes, node];
  const children = byParent.get(node.id) ?? [];

  if (!children.length) {
    return { weighted: currentValue, depth, nodes: nextNodes };
  }

  let bestChild = { weighted: 0, depth, nodes: nextNodes };
  for (const child of children) {
    const candidate = walk(child, byParent, channel, depth + 1, nextNodes);
    if (candidate.weighted > bestChild.weighted) {
      bestChild = candidate;
    }
  }

  return {
    weighted: currentValue + bestChild.weighted,
    depth: bestChild.depth,
    nodes: bestChild.nodes
  };
}
