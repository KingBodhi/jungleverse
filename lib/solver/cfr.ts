/**
 * CFR+ solver — Counterfactual Regret Minimization with regret floor.
 *
 * CFR+ improves on vanilla CFR by flooring cumulative regrets at zero
 * after each update, preventing large negative regrets from slowing
 * convergence.
 *
 * Uses alternating traversal: on each iteration, only one player's
 * regrets are updated, which reduces variance.
 */

import type { GameNode, ActionNode, ChanceNode, TerminalNode } from "./types";
import { InfoSetStore } from "./info-set";
import { computeBestResponseEv } from "./best-response";

export class CFRPlusSolver {
  root: GameNode;
  infoStore: InfoSetStore;
  iteration = 0;
  private _evHistory: number[] = [];

  constructor(root: GameNode, infoStore?: InfoSetStore) {
    this.root = root;
    this.infoStore = infoStore ?? new InfoSetStore();
  }

  /**
   * Run CFR+ for the given number of iterations.
   * Uses alternating updates: even iterations update player 0,
   * odd iterations update player 1.
   * Returns the estimated game value (player 0 EV).
   */
  solve(numIterations: number): number {
    for (let i = 0; i < numIterations; i++) {
      this.iteration++;
      const updatingPlayer = i % 2;

      const ev = this._cfr(this.root, updatingPlayer, 1.0, 1.0, 1.0);

      if (updatingPlayer === 0) {
        this._evHistory.push(ev);
      }
    }
    return this.getAverageEv();
  }

  getAverageEv(): number {
    if (this._evHistory.length === 0) return 0;
    // Use the latter half for better estimate
    const half = Math.max(1, this._evHistory.length >>> 1);
    let sum = 0;
    for (let i = half; i < this._evHistory.length; i++) {
      sum += this._evHistory[i];
    }
    return sum / (this._evHistory.length - half);
  }

  getExploitability(): number {
    const brEvP0 = computeBestResponseEv(this.root, this.infoStore, 0);
    const brEvP1 = computeBestResponseEv(this.root, this.infoStore, 1);
    return brEvP0 + brEvP1;
  }

  private _cfr(
    node: GameNode,
    updatingPlayer: number,
    p0Reach: number,
    p1Reach: number,
    chanceReach: number,
  ): number {
    if (node.type === "terminal") {
      return node.payoffs[0];
    }

    if (node.type === "chance") {
      let ev = 0;
      for (const { prob, child } of node.outcomes.values()) {
        ev +=
          prob *
          this._cfr(
            child,
            updatingPlayer,
            p0Reach,
            p1Reach,
            chanceReach * prob,
          );
      }
      return ev;
    }

    // ActionNode
    const actionNode = node as ActionNode;
    const player = actionNode.player;
    const numActions = actionNode.actions.length;

    const infoSet = this.infoStore.getOrCreate(
      actionNode.infoSetKey,
      numActions,
    );
    const strategy = infoSet.getStrategy();

    const actionEvs = new Float64Array(numActions);
    let nodeEv = 0;

    for (let i = 0; i < numActions; i++) {
      const child = actionNode.children.get(actionNode.actions[i].label)!;
      let childEv: number;
      if (player === 0) {
        childEv = this._cfr(
          child,
          updatingPlayer,
          p0Reach * strategy[i],
          p1Reach,
          chanceReach,
        );
      } else {
        childEv = this._cfr(
          child,
          updatingPlayer,
          p0Reach,
          p1Reach * strategy[i],
          chanceReach,
        );
      }
      actionEvs[i] = childEv;
      nodeEv += strategy[i] * childEv;
    }

    if (player === updatingPlayer && !infoSet.locked) {
      // Compute counterfactual regrets
      const oppReach = player === 0 ? p1Reach : p0Reach;
      const cfReach = oppReach * chanceReach;

      for (let i = 0; i < numActions; i++) {
        let regret = actionEvs[i] - nodeEv;
        if (player === 1) regret = -regret;
        infoSet.cumulativeRegret[i] += cfReach * regret;
      }

      // CFR+: floor regrets at zero
      for (let i = 0; i < numActions; i++) {
        if (infoSet.cumulativeRegret[i] < 0)
          infoSet.cumulativeRegret[i] = 0;
      }

      // Accumulate strategy for averaging (weighted by reach)
      const myReach = player === 0 ? p0Reach : p1Reach;
      for (let i = 0; i < numActions; i++) {
        infoSet.cumulativeStrategy[i] += myReach * strategy[i];
      }
    }

    return nodeEv;
  }
}
