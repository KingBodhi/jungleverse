/**
 * Leduc Hold'em — 6-card, 2-street poker game for multi-round CFR validation.
 *
 * Rules:
 * - 6-card deck: J, Q, K with 2 suits each
 * - Each player antes 1 chip, gets 1 private card
 * - Street 1: betting round (check/bet(2))
 * - 1 community card dealt
 * - Street 2: betting round (check/bet(4))
 * - Showdown: pair (private matches board) beats high card; higher rank wins
 * - Max 2 bets per street (bet + raise)
 */

import { card, cardRank, cardSuit } from "../cards";
import {
  Action,
  makeActionInfo,
  type ActionInfo as ActionInfoType,
  type ActionNode,
  type ChanceNode,
  type GameNode,
  type TerminalNode,
  type TreeBuilder,
} from "../types";

// Leduc uses J=9, Q=10, K=11 with suits 0 and 1
const LEDUC_RANKS = [9, 10, 11];
const LEDUC_SUITS = [0, 1];
const LEDUC_CARDS: number[] = [];
for (const r of LEDUC_RANKS) {
  for (const s of LEDUC_SUITS) {
    LEDUC_CARDS.push(card(r, s));
  }
}
const LEDUC_RANK_NAMES: Record<number, string> = { 9: "J", 10: "Q", 11: "K" };

const ANTE = 1;
const BET_STREET1 = 2;
const BET_STREET2 = 4;
const MAX_BETS_PER_STREET = 2;

function cname(c: number): string {
  const r = LEDUC_RANK_NAMES[cardRank(c)];
  const s = "cdhs"[cardSuit(c)];
  return `${r}${s}`;
}

export class LeducTreeBuilder implements TreeBuilder {
  buildTree(): GameNode {
    const root: ChanceNode = {
      type: "chance",
      outcomes: new Map(),
      depth: 0,
    };

    // Deal 2 private cards (all ordered pairs from 6 cards)
    const deals: [number, number][] = [];
    for (const c1 of LEDUC_CARDS) {
      for (const c2 of LEDUC_CARDS) {
        if (c1 !== c2) deals.push([c1, c2]);
      }
    }
    const prob = 1.0 / deals.length; // 1/30

    for (const [p0Card, p1Card] of deals) {
      const label = `${cname(p0Card)}${cname(p1Card)}`;
      const child = this._buildStreet1(p0Card, p1Card, 1);
      root.outcomes.set(label, { prob, child });
    }

    return root;
  }

  private _buildStreet1(
    p0Card: number,
    p1Card: number,
    depth: number,
  ): GameNode {
    const pot = 2 * ANTE;
    return this._buildBettingRound(
      p0Card,
      p1Card,
      null,
      pot,
      1,
      BET_STREET1,
      "",
      0,
      depth,
    );
  }

  private _buildBettingRound(
    p0Card: number,
    p1Card: number,
    boardCard: number | null,
    pot: number,
    street: number,
    betSize: number,
    history: string,
    numBets: number,
    depth: number,
  ): GameNode {
    // Determine acting player
    const slashIdx = history.lastIndexOf("/");
    const currentRound = slashIdx >= 0 ? history.slice(slashIdx + 1) : history;
    // Filter out card labels within current round
    const actionsInRound = currentRound.replace(/[^cfbk]/g, "").length;
    const player = actionsInRound % 2;

    const playerCard = player === 0 ? p0Card : p1Card;
    const board =
      boardCard !== null ? [boardCard] : [];
    const infoKey = this.getInfoSetKey(player, [playerCard], history, board);

    // Terminal conditions
    if (this._isRoundTerminal(history)) {
      if (history.endsWith("f")) {
        // Previous player folded, current player wins
        const winner = player;
        const payoff = pot / 2;
        const payoffs: [number, number] =
          winner === 0 ? [payoff, -payoff] : [-payoff, payoff];
        return {
          type: "terminal",
          depth,
          payoffs,
          pot,
          isShowdown: false,
        };
      }

      // Round ended with check-check or bet-call
      if (street === 1) {
        return this._dealBoardCard(p0Card, p1Card, pot, history, depth);
      } else {
        return this._showdown(p0Card, p1Card, boardCard, pot, depth);
      }
    }

    // Build action node
    const actions = this._getActions(history, numBets, betSize);
    const node: ActionNode = {
      type: "action",
      depth,
      player,
      actions,
      children: new Map(),
      infoSetKey: infoKey,
      pot,
      stacks: [0, 0],
    };

    for (const action of actions) {
      let newHist: string;
      let newPot: number;
      let newBets: number;

      if (action.label === "fold") {
        newHist = history + "f";
        newPot = pot;
        newBets = numBets;
      } else if (action.label === "check") {
        newHist = history + "c";
        newPot = pot;
        newBets = numBets;
      } else if (
        action.label.startsWith("bet") ||
        action.label.startsWith("raise")
      ) {
        newHist = history + "b";
        newPot = pot + betSize;
        newBets = numBets + 1;
      } else if (action.label === "call") {
        newHist = history + "k"; // 'k' for call to avoid ambiguity
        newPot = pot + betSize;
        newBets = numBets;
      } else {
        throw new Error(`Unknown action: ${action.label}`);
      }

      const child = this._buildBettingRound(
        p0Card,
        p1Card,
        boardCard,
        newPot,
        street,
        betSize,
        newHist,
        newBets,
        depth + 1,
      );
      node.children.set(action.label, child);
    }

    return node;
  }

  private _isRoundTerminal(history: string): boolean {
    const slashIdx = history.lastIndexOf("/");
    const current = slashIdx >= 0 ? history.slice(slashIdx + 1) : history;
    // Filter to just action chars
    const acts = current.replace(/[^cfbk]/g, "");
    if (acts.length < 2) return false;
    const lastTwo = acts.slice(-2);
    return lastTwo === "cc" || lastTwo === "bk" || lastTwo === "bf";
  }

  private _getActions(
    history: string,
    numBets: number,
    betSize: number,
  ): ActionInfoType[] {
    const slashIdx = history.lastIndexOf("/");
    const current = slashIdx >= 0 ? history.slice(slashIdx + 1) : history;
    const acts = current.replace(/[^cfbk]/g, "");
    const lastAction = acts.length > 0 ? acts[acts.length - 1] : "";

    if (lastAction === "b") {
      const actions: ActionInfoType[] = [
        makeActionInfo(Action.FOLD, 0, "fold"),
        makeActionInfo(Action.CALL, betSize, "call"),
      ];
      if (numBets < MAX_BETS_PER_STREET) {
        actions.push(makeActionInfo(Action.RAISE, betSize, "raise"));
      }
      return actions;
    } else {
      return [
        makeActionInfo(Action.CHECK, 0, "check"),
        makeActionInfo(Action.BET, betSize, `bet_${betSize}`),
      ];
    }
  }

  private _dealBoardCard(
    p0Card: number,
    p1Card: number,
    pot: number,
    history: string,
    depth: number,
  ): GameNode {
    const chance: ChanceNode = {
      type: "chance",
      outcomes: new Map(),
      depth,
    };
    const remaining = LEDUC_CARDS.filter(
      (c) => c !== p0Card && c !== p1Card,
    );
    const prob = 1.0 / remaining.length;

    for (const boardCard of remaining) {
      const label = cname(boardCard);
      const newHistory = history + "/" + label + "/";
      const child = this._buildBettingRound(
        p0Card,
        p1Card,
        boardCard,
        pot,
        2,
        BET_STREET2,
        newHistory,
        0,
        depth + 1,
      );
      chance.outcomes.set(label, { prob, child });
    }

    return chance;
  }

  private _showdown(
    p0Card: number,
    p1Card: number,
    boardCard: number | null,
    pot: number,
    depth: number,
  ): TerminalNode {
    const p0Rank = cardRank(p0Card);
    const p1Rank = cardRank(p1Card);
    const boardRank = boardCard !== null ? cardRank(boardCard) : -1;

    const p0Pair = p0Rank === boardRank;
    const p1Pair = p1Rank === boardRank;

    let winner: number;
    if (p0Pair && !p1Pair) {
      winner = 0;
    } else if (p1Pair && !p0Pair) {
      winner = 1;
    } else if (p0Rank > p1Rank) {
      winner = 0;
    } else if (p1Rank > p0Rank) {
      winner = 1;
    } else {
      // True tie
      return {
        type: "terminal",
        depth,
        payoffs: [0.0, 0.0],
        pot,
        isShowdown: true,
      };
    }

    const payoff = pot / 2;
    const payoffs: [number, number] =
      winner === 0 ? [payoff, -payoff] : [-payoff, payoff];
    return {
      type: "terminal",
      depth,
      payoffs,
      pot,
      isShowdown: true,
    };
  }

  getInfoSetKey(
    player: number,
    cards: number[],
    history: string,
    board?: number[],
  ): string {
    const cardStr = cname(cards[0]);
    const boardStr = board && board.length > 0 ? board.map(cname).join("") : "";
    if (boardStr) return `${cardStr}|${boardStr}|${history}`;
    return `${cardStr}|${history}`;
  }
}
