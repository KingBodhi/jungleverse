/**
 * Kuhn poker — minimal poker game for CFR validation.
 *
 * Rules:
 * - 3-card deck: J(9), Q(10), K(11) using standard rank encoding
 * - Each player antes 1 chip, gets 1 card
 * - Player 0 acts first: check or bet(1)
 * - Player 1 responds: check/call or bet(1)/fold
 * - If both check or bet is called: showdown (higher card wins pot)
 * - Known Nash equilibrium: Player 0 EV = -1/18 ≈ -0.0556
 */

import { card, cardRank } from "../cards";
import {
  Action,
  makeActionInfo,
  type ActionNode,
  type ChanceNode,
  type GameNode,
  type TerminalNode,
  type TreeBuilder,
} from "../types";

// Kuhn uses J=9, Q=10, K=11 (rank indices)
const KUHN_RANKS = [9, 10, 11]; // J, Q, K
const KUHN_RANK_NAMES: Record<number, string> = { 9: "J", 10: "Q", 11: "K" };

// We use suit 0 (clubs) for all Kuhn cards
const KUHN_CARDS = KUHN_RANKS.map((r) => card(r, 0));

function cardName(c: number): string {
  return KUHN_RANK_NAMES[cardRank(c)];
}

export class KuhnTreeBuilder implements TreeBuilder {
  buildTree(): GameNode {
    const root: ChanceNode = {
      type: "chance",
      outcomes: new Map(),
      depth: 0,
    };

    // All possible deals: (p0_card, p1_card) — permutations of 2 from 3
    const deals: [number, number][] = [];
    for (const c1 of KUHN_CARDS) {
      for (const c2 of KUHN_CARDS) {
        if (c1 !== c2) deals.push([c1, c2]);
      }
    }
    const prob = 1.0 / deals.length; // 1/6

    for (const [p0Card, p1Card] of deals) {
      const label = `${cardName(p0Card)}${cardName(p1Card)}`;
      const child = this._buildActionTree(p0Card, p1Card, "", 1);
      root.outcomes.set(label, { prob, child });
    }

    return root;
  }

  private _buildActionTree(
    p0Card: number,
    p1Card: number,
    history: string,
    depth: number,
  ): GameNode {
    const ante = 1.0;

    // Check if terminal
    if (history === "cc") {
      const winner = cardRank(p0Card) > cardRank(p1Card) ? 0 : 1;
      const payoff = ante;
      const payoffs: [number, number] =
        winner === 0 ? [payoff, -payoff] : [-payoff, payoff];
      return {
        type: "terminal",
        depth,
        payoffs,
        pot: 2 * ante,
        isShowdown: true,
      };
    }

    if (history === "bc") {
      // P0 bet, P1 fold
      return {
        type: "terminal",
        depth,
        payoffs: [ante, -ante],
        pot: 2 * ante,
        isShowdown: false,
      };
    }

    if (history === "bb") {
      const winner = cardRank(p0Card) > cardRank(p1Card) ? 0 : 1;
      const payoff = 2 * ante;
      const payoffs: [number, number] =
        winner === 0 ? [payoff, -payoff] : [-payoff, payoff];
      return {
        type: "terminal",
        depth,
        payoffs,
        pot: 4 * ante,
        isShowdown: true,
      };
    }

    if (history === "cbc") {
      return {
        type: "terminal",
        depth,
        payoffs: [-ante, ante],
        pot: 2 * ante,
        isShowdown: false,
      };
    }

    if (history === "cbb") {
      const winner = cardRank(p0Card) > cardRank(p1Card) ? 0 : 1;
      const payoff = 2 * ante;
      const payoffs: [number, number] =
        winner === 0 ? [payoff, -payoff] : [-payoff, payoff];
      return {
        type: "terminal",
        depth,
        payoffs,
        pot: 4 * ante,
        isShowdown: true,
      };
    }

    // Determine acting player
    let player = history.length % 2;
    if (history === "cb") player = 0; // P0 faces P1's bet

    const playerCard = player === 0 ? p0Card : p1Card;
    const infoKey = this.getInfoSetKey(player, [playerCard], history);

    // Available actions depend on history
    let actions;
    if (history === "" || history === "c") {
      actions = [
        makeActionInfo(Action.CHECK, 0, "check"),
        makeActionInfo(Action.BET, 1.0, "bet"),
      ];
    } else if (history === "b" || history === "cb") {
      actions = [
        makeActionInfo(Action.FOLD, 0, "fold"),
        makeActionInfo(Action.CALL, 1.0, "call"),
      ];
    } else {
      throw new Error(`Unexpected history: ${history}`);
    }

    const actionToChar: Record<string, string> = {
      check: "c",
      bet: "b",
      fold: "c",
      call: "b",
    };

    const node: ActionNode = {
      type: "action",
      depth,
      player,
      actions,
      children: new Map(),
      infoSetKey: infoKey,
      pot: 2 * ante + (history.split("b").length - 1) * ante,
      stacks: [0, 0],
    };

    for (const action of actions) {
      const char = actionToChar[action.label];
      const newHistory = history + char;
      const child = this._buildActionTree(
        p0Card,
        p1Card,
        newHistory,
        depth + 1,
      );
      node.children.set(action.label, child);
    }

    return node;
  }

  getInfoSetKey(
    player: number,
    cards: number[],
    history: string,
    board?: number[],
  ): string {
    const name = cardName(cards[0]);
    return `${name}:${history}`;
  }
}
