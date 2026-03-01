/**
 * Best response computation for evaluating exploitability.
 *
 * A best response strategy always picks the highest-EV action at each
 * info set for a given player, assuming the opponent plays their current
 * average strategy.
 *
 * Uses a two-pass approach:
 * 1. Accumulate counterfactual action values per info set.
 * 2. Pick best action per info set, then compute overall EV.
 */

import type { GameNode, ActionNode } from "./types";
import { InfoSetStore } from "./info-set";

export function computeBestResponseEv(
  root: GameNode,
  infoStore: InfoSetStore,
  brPlayer: number,
): number {
  // Pass 1: Accumulate CF values per (info_set, action)
  const cfValues = new Map<string, Float64Array>();
  const numActionsMap = new Map<string, number>();
  accumulateCfValues(root, infoStore, brPlayer, 1.0, 1.0, cfValues, numActionsMap);

  // Pick best action per info set
  const brActions = new Map<string, number>();
  for (const [key, values] of cfValues) {
    let bestIdx = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[bestIdx]) bestIdx = i;
    }
    brActions.set(key, bestIdx);
  }

  // Pass 2: Compute EV with BR strategy
  return evalWithBr(root, infoStore, brPlayer, brActions, 1.0, 1.0);
}

function accumulateCfValues(
  node: GameNode,
  infoStore: InfoSetStore,
  brPlayer: number,
  oppReach: number,
  chanceReach: number,
  cfValues: Map<string, Float64Array>,
  numActionsMap: Map<string, number>,
): number {
  if (node.type === "terminal") {
    return node.payoffs[brPlayer];
  }

  if (node.type === "chance") {
    let ev = 0;
    for (const { prob, child } of node.outcomes.values()) {
      ev += prob * accumulateCfValues(
        child, infoStore, brPlayer, oppReach,
        chanceReach * prob, cfValues, numActionsMap,
      );
    }
    return ev;
  }

  // ActionNode
  const actionNode = node as ActionNode;
  const player = actionNode.player;
  const numActions = actionNode.actions.length;

  const infoSet = infoStore.get(actionNode.infoSetKey);
  let strategy: Float64Array;
  if (!infoSet) {
    strategy = new Float64Array(numActions);
    strategy.fill(1 / numActions);
  } else {
    strategy = infoSet.getAverageStrategy();
  }

  if (player === brPlayer) {
    const actionVals = new Float64Array(numActions);
    for (let i = 0; i < numActions; i++) {
      const child = actionNode.children.get(actionNode.actions[i].label)!;
      actionVals[i] = accumulateCfValues(
        child, infoStore, brPlayer, oppReach,
        chanceReach, cfValues, numActionsMap,
      );
    }

    // Accumulate weighted action values for this info set
    const key = actionNode.infoSetKey;
    const weight = oppReach * chanceReach;
    if (!cfValues.has(key)) {
      cfValues.set(key, new Float64Array(numActions));
      numActionsMap.set(key, numActions);
    }
    const existing = cfValues.get(key)!;
    for (let i = 0; i < numActions; i++) {
      existing[i] += weight * actionVals[i];
    }

    // Return best action value (unweighted)
    let maxVal = actionVals[0];
    for (let i = 1; i < numActions; i++) {
      if (actionVals[i] > maxVal) maxVal = actionVals[i];
    }
    return maxVal;
  } else {
    // Opponent plays their average strategy
    let ev = 0;
    for (let i = 0; i < numActions; i++) {
      const child = actionNode.children.get(actionNode.actions[i].label)!;
      ev += strategy[i] * accumulateCfValues(
        child, infoStore, brPlayer, oppReach * strategy[i],
        chanceReach, cfValues, numActionsMap,
      );
    }
    return ev;
  }
}

function evalWithBr(
  node: GameNode,
  infoStore: InfoSetStore,
  brPlayer: number,
  brActions: Map<string, number>,
  oppReach: number,
  chanceReach: number,
): number {
  if (node.type === "terminal") {
    return node.payoffs[brPlayer] * oppReach * chanceReach;
  }

  if (node.type === "chance") {
    let ev = 0;
    for (const { prob, child } of node.outcomes.values()) {
      ev += evalWithBr(
        child, infoStore, brPlayer, brActions,
        oppReach, chanceReach * prob,
      );
    }
    return ev;
  }

  // ActionNode
  const actionNode = node as ActionNode;
  const player = actionNode.player;
  const numActions = actionNode.actions.length;

  const infoSet = infoStore.get(actionNode.infoSetKey);
  let strategy: Float64Array;
  if (!infoSet) {
    strategy = new Float64Array(numActions);
    strategy.fill(1 / numActions);
  } else {
    strategy = infoSet.getAverageStrategy();
  }

  if (player === brPlayer) {
    const bestI = brActions.get(actionNode.infoSetKey) ?? 0;
    const child = actionNode.children.get(actionNode.actions[bestI].label)!;
    return evalWithBr(child, infoStore, brPlayer, brActions, oppReach, chanceReach);
  } else {
    let ev = 0;
    for (let i = 0; i < numActions; i++) {
      const child = actionNode.children.get(actionNode.actions[i].label)!;
      ev += evalWithBr(
        child, infoStore, brPlayer, brActions,
        oppReach * strategy[i], chanceReach,
      );
    }
    return ev;
  }
}

export function computeEvComparison(
  root: GameNode,
  infoStore: InfoSetStore,
): {
  gto_ev_p0: number;
  gto_ev_p1: number;
  br_ev_p0: number;
  br_ev_p1: number;
  exploitability: number;
} {
  const gtoEv = computeStrategyEv(root, infoStore);
  const brEvP0 = computeBestResponseEv(root, infoStore, 0);
  const brEvP1 = computeBestResponseEv(root, infoStore, 1);

  return {
    gto_ev_p0: gtoEv,
    gto_ev_p1: -gtoEv,
    br_ev_p0: brEvP0,
    br_ev_p1: brEvP1,
    exploitability: brEvP0 + brEvP1,
  };
}

function computeStrategyEv(root: GameNode, infoStore: InfoSetStore): number {
  return traverseStrategyEv(root, infoStore, 1.0, 1.0, 1.0);
}

function traverseStrategyEv(
  node: GameNode,
  infoStore: InfoSetStore,
  p0Reach: number,
  p1Reach: number,
  chanceReach: number,
): number {
  if (node.type === "terminal") {
    return node.payoffs[0] * p0Reach * p1Reach * chanceReach;
  }

  if (node.type === "chance") {
    let ev = 0;
    for (const { prob, child } of node.outcomes.values()) {
      ev += traverseStrategyEv(child, infoStore, p0Reach, p1Reach, chanceReach * prob);
    }
    return ev;
  }

  const actionNode = node as ActionNode;
  const infoSet = infoStore.get(actionNode.infoSetKey);
  let strategy: Float64Array;
  if (!infoSet) {
    strategy = new Float64Array(actionNode.actions.length);
    strategy.fill(1 / actionNode.actions.length);
  } else {
    strategy = infoSet.getAverageStrategy();
  }

  let ev = 0;
  for (let i = 0; i < actionNode.actions.length; i++) {
    const child = actionNode.children.get(actionNode.actions[i].label)!;
    if (actionNode.player === 0) {
      ev += traverseStrategyEv(child, infoStore, p0Reach * strategy[i], p1Reach, chanceReach);
    } else {
      ev += traverseStrategyEv(child, infoStore, p0Reach, p1Reach * strategy[i], chanceReach);
    }
  }
  return ev;
}
