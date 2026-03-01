/**
 * NLHE postflop subgame solver.
 *
 * Builds a game tree for No-Limit Hold'em postflop play with configurable:
 * - Board cards (flop/turn/river)
 * - Player ranges
 * - Bet sizes (as fractions of pot)
 * - Pot and stack geometry
 */

import {
  NUM_CARDS,
  cardFromStr,
  cardToStr,
  cardsToStr,
  parseRange,
} from "../cards";
import { evaluateHand } from "../evaluator";
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

const DEFAULT_BET_SIZES = [0.33, 0.67, 1.0];
const DEFAULT_RAISE_SIZES = [0.5, 1.0];
const MAX_RAISES = 3;
const MAX_RUNOUT_CARDS = 6;

export class NLHESubgameBuilder implements TreeBuilder {
  boardStr: string;
  boardCards: number[];
  rangeP0: [number, number][];
  rangeP1: [number, number][];
  pot: number;
  stack: number;
  betSizes: number[];
  street: string;

  constructor(opts: {
    board?: string;
    range_p0?: string;
    range_p1?: string;
    pot?: number;
    stack?: number;
    bet_sizes?: number[];
  } = {}) {
    this.boardStr = opts.board ?? "Qs9d2c";
    this.boardCards = this._parseBoard(this.boardStr);
    this.pot = opts.pot ?? 100;
    this.stack = opts.stack ?? 200;
    this.betSizes = opts.bet_sizes ?? DEFAULT_BET_SIZES;

    const boardSet = new Set(this.boardCards);
    this.rangeP0 = parseRange(opts.range_p0 ?? "AA,KK,QQ,JJ,AKs,AKo").filter(
      ([c1, c2]) => !boardSet.has(c1) && !boardSet.has(c2),
    );
    this.rangeP1 = parseRange(opts.range_p1 ?? "AA,KK,QQ,JJ,AKs,AKo").filter(
      ([c1, c2]) => !boardSet.has(c1) && !boardSet.has(c2),
    );

    const streetMap: Record<number, string> = {
      3: "flop",
      4: "turn",
      5: "river",
    };
    this.street = streetMap[this.boardCards.length];
    if (!this.street)
      throw new Error(
        `Board must be 3-5 cards, got ${this.boardCards.length}`,
      );
  }

  private _parseBoard(board: string): number[] {
    if (board.length % 2 !== 0)
      throw new Error(`Invalid board string: ${board}`);
    const cards: number[] = [];
    for (let i = 0; i < board.length; i += 2) {
      cards.push(cardFromStr(board.slice(i, i + 2)));
    }
    if (cards.length < 3 || cards.length > 5)
      throw new Error(`Board must be 3-5 cards, got ${cards.length}`);
    return cards;
  }

  buildTree(): GameNode {
    const root: ChanceNode = {
      type: "chance",
      outcomes: new Map(),
      depth: 0,
    };

    // Enumerate all valid deals
    const validDeals: [[number, number], [number, number]][] = [];
    for (const h0 of this.rangeP0) {
      for (const h1 of this.rangeP1) {
        if (
          h0[0] === h1[0] ||
          h0[0] === h1[1] ||
          h0[1] === h1[0] ||
          h0[1] === h1[1]
        )
          continue;
        validDeals.push([h0, h1]);
      }
    }

    if (validDeals.length === 0)
      throw new Error("No valid deals — ranges may conflict with board");

    const prob = 1.0 / validDeals.length;

    for (const [[c0a, c0b], [c1a, c1b]] of validDeals) {
      const label = `${cardToStr(c0a)}${cardToStr(c0b)}v${cardToStr(c1a)}${cardToStr(c1b)}`;
      const child = this._buildBetting(
        [c0a, c0b],
        [c1a, c1b],
        [...this.boardCards],
        this.pot,
        [this.stack, this.stack],
        "",
        0,
        1,
      );
      root.outcomes.set(label, { prob, child });
    }

    return root;
  }

  private _buildBetting(
    p0Hand: [number, number],
    p1Hand: [number, number],
    board: number[],
    pot: number,
    stacks: [number, number],
    history: string,
    numRaises: number,
    depth: number,
  ): GameNode {
    const slashIdx = history.lastIndexOf("/");
    const currentStreetActions =
      slashIdx >= 0 ? history.slice(slashIdx + 1) : history;
    // Count action tokens (x, f, c, or bNNN)
    let actionCount = 0;
    for (let i = 0; i < currentStreetActions.length; i++) {
      const ch = currentStreetActions[i];
      if (ch === "x" || ch === "f" || ch === "c") {
        actionCount++;
      } else if (ch === "b") {
        actionCount++;
        // Skip digits
        i++;
        while (
          i < currentStreetActions.length &&
          currentStreetActions[i] >= "0" &&
          currentStreetActions[i] <= "9"
        )
          i++;
        i--; // loop increment
      }
    }
    const player = actionCount % 2;

    const playerHand = player === 0 ? p0Hand : p1Hand;
    const infoKey = this.getInfoSetKey(
      player,
      [...playerHand],
      history,
      board,
    );

    // Check if round is complete
    if (this._isRoundComplete(history)) {
      if (history.endsWith("f")) {
        const winner = player;
        const payoff = pot / 2;
        const payoffs: [number, number] =
          winner === 0 ? [payoff, -payoff] : [-payoff, payoff];
        return { type: "terminal", depth, payoffs, pot, isShowdown: false };
      }

      // Check-check or bet-call
      if (board.length < 5) {
        return this._dealStreet(
          p0Hand,
          p1Hand,
          board,
          pot,
          stacks,
          history,
          depth,
        );
      } else {
        return this._showdown(p0Hand, p1Hand, board, pot, depth);
      }
    }

    const actions = this._getActions(history, pot, stacks[player], numRaises);
    const node: ActionNode = {
      type: "action",
      depth,
      player,
      actions,
      children: new Map(),
      infoSetKey: infoKey,
      pot,
      stacks,
    };

    for (const action of actions) {
      const newStacks: [number, number] = [...stacks];
      let newHist: string;
      let newPot: number;
      let nr: number;

      if (action.action === Action.FOLD) {
        newHist = history + "f";
        newPot = pot;
        nr = numRaises;
      } else if (action.action === Action.CHECK) {
        newHist = history + "x";
        newPot = pot;
        nr = numRaises;
      } else if (
        action.action === Action.BET ||
        action.action === Action.RAISE ||
        action.action === Action.ALL_IN
      ) {
        const amt = Math.min(action.amount, stacks[player]);
        newHist = history + `b${Math.floor(amt)}`;
        newPot = pot + amt;
        newStacks[player] -= amt;
        nr = numRaises + 1;
      } else if (action.action === Action.CALL) {
        const amt = action.amount;
        newHist = history + "c";
        newPot = pot + amt;
        newStacks[player] -= amt;
        nr = numRaises;
      } else {
        newHist = history + "?";
        newPot = pot;
        nr = numRaises;
      }

      const child = this._buildBetting(
        p0Hand,
        p1Hand,
        board,
        newPot,
        newStacks,
        newHist,
        nr,
        depth + 1,
      );
      node.children.set(action.label, child);
    }

    return node;
  }

  private _isRoundComplete(history: string): boolean {
    const slashIdx = history.lastIndexOf("/");
    const current = slashIdx >= 0 ? history.slice(slashIdx + 1) : history;
    if (current.length < 2) return false;

    if (current.endsWith("f")) return true;
    if (current === "xx") return true;
    // bet followed by call
    if (current.endsWith("c") && current.length >= 2) return true;
    return false;
  }

  private _getActions(
    history: string,
    pot: number,
    playerStack: number,
    numRaises: number,
  ): ActionInfoType[] {
    const slashIdx = history.lastIndexOf("/");
    const current = slashIdx >= 0 ? history.slice(slashIdx + 1) : history;
    let facingBet = false;
    let betAmount = 0;

    // Parse last action to detect if facing a bet
    for (let i = current.length - 1; i >= 0; i--) {
      if (current[i] === "b") {
        facingBet = true;
        let j = i + 1;
        while (j < current.length && current[j] >= "0" && current[j] <= "9")
          j++;
        if (j > i + 1) betAmount = parseFloat(current.slice(i + 1, j));
        break;
      } else if (
        current[i] === "x" ||
        current[i] === "c" ||
        current[i] === "f"
      ) {
        break;
      }
    }

    if (facingBet) {
      const actions: ActionInfoType[] = [
        makeActionInfo(Action.FOLD, 0, "fold"),
        makeActionInfo(Action.CALL, betAmount, "call"),
      ];
      // Raise options
      if (numRaises < MAX_RAISES && playerStack > betAmount) {
        let lastRaiseAmt = 0;
        for (const frac of DEFAULT_RAISE_SIZES) {
          let raiseAmt = betAmount + pot * frac;
          raiseAmt = Math.min(raiseAmt, playerStack);
          lastRaiseAmt = raiseAmt;
          actions.push(
            makeActionInfo(
              Action.RAISE,
              raiseAmt,
              `raise_${Math.floor(raiseAmt)}`,
            ),
          );
        }
        // All-in
        if (playerStack > lastRaiseAmt) {
          actions.push(
            makeActionInfo(
              Action.ALL_IN,
              playerStack,
              `allin_${Math.floor(playerStack)}`,
            ),
          );
        }
      }
      return actions;
    }

    const actions: ActionInfoType[] = [
      makeActionInfo(Action.CHECK, 0, "check"),
    ];
    for (const frac of this.betSizes) {
      let betAmt = pot * frac;
      betAmt = Math.min(betAmt, playerStack);
      if (betAmt > 0) {
        actions.push(
          makeActionInfo(
            Action.BET,
            betAmt,
            `bet_${Math.floor(betAmt)}`,
          ),
        );
      }
    }
    // All-in
    if (playerStack > 0) {
      const maxBet = Math.max(
        ...this.betSizes.map((f) => pot * f),
        0,
      );
      if (playerStack > maxBet) {
        actions.push(
          makeActionInfo(
            Action.ALL_IN,
            playerStack,
            `allin_${Math.floor(playerStack)}`,
          ),
        );
      }
    }
    return actions;
  }

  private _dealStreet(
    p0Hand: [number, number],
    p1Hand: [number, number],
    board: number[],
    pot: number,
    stacks: [number, number],
    history: string,
    depth: number,
  ): GameNode {
    const used = new Set([...board, ...p0Hand, ...p1Hand]);
    let remaining: number[] = [];
    for (let c = 0; c < NUM_CARDS; c++) {
      if (!used.has(c)) remaining.push(c);
    }

    if (remaining.length === 0) {
      return this._showdown(p0Hand, p1Hand, board, pot, depth);
    }

    // Subsample for tractability
    if (remaining.length > MAX_RUNOUT_CARDS) {
      const step = remaining.length / MAX_RUNOUT_CARDS;
      const sampled: number[] = [];
      for (let i = 0; i < MAX_RUNOUT_CARDS; i++) {
        sampled.push(remaining[Math.floor(i * step)]);
      }
      remaining = sampled;
    }

    const chance: ChanceNode = {
      type: "chance",
      outcomes: new Map(),
      depth,
    };
    const prob = 1.0 / remaining.length;

    for (const cardInt of remaining) {
      const newBoard = [...board, cardInt];
      const label = cardToStr(cardInt);
      const newHistory = history + "/" + label + "/";
      const child = this._buildBetting(
        p0Hand,
        p1Hand,
        newBoard,
        pot,
        stacks,
        newHistory,
        0,
        depth + 1,
      );
      chance.outcomes.set(label, { prob, child });
    }

    return chance;
  }

  private _showdown(
    p0Hand: [number, number],
    p1Hand: [number, number],
    board: number[],
    pot: number,
    depth: number,
  ): TerminalNode {
    const p0Cards = [...p0Hand, ...board];
    const p1Cards = [...p1Hand, ...board];

    const p0Rank = evaluateHand(p0Cards);
    const p1Rank = evaluateHand(p1Cards);

    let payoffs: [number, number];
    if (p0Rank > p1Rank) {
      payoffs = [pot / 2, -pot / 2];
    } else if (p1Rank > p0Rank) {
      payoffs = [-pot / 2, pot / 2];
    } else {
      payoffs = [0, 0];
    }

    return { type: "terminal", depth, payoffs, pot, isShowdown: true };
  }

  getInfoSetKey(
    player: number,
    cards: number[],
    history: string,
    board?: number[],
  ): string {
    const handStr = cardsToStr([...cards].sort((a, b) => b - a));
    const boardStr = board && board.length > 0 ? cardsToStr(board) : "";
    if (boardStr) return `${handStr}|${boardStr}|${history}`;
    return `${handStr}|${history}`;
  }
}
