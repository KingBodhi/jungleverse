/**
 * Node locking for exploitative strategy computation.
 *
 * Node locking allows fixing a player's strategy at specific info sets,
 * then re-running CFR to find the best counter-strategy.
 */

import { InfoSetStore } from "./info-set";

export interface NodeLockSpec {
  locks: Record<string, number[]>;
}

export class NodeLocker {
  infoStore: InfoSetStore;
  private _lockHistory: NodeLockSpec[] = [];

  constructor(infoStore: InfoSetStore) {
    this.infoStore = infoStore;
  }

  applyLocks(spec: NodeLockSpec): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    for (const [key, strategy] of Object.entries(spec.locks)) {
      results[key] = this.infoStore.lockInfoSet(key, strategy);
    }
    this._lockHistory.push(spec);
    return results;
  }

  prepareForResolve(): void {
    this.infoStore.resetUnlockedRegrets();
  }

  rollbackLast(): number {
    if (this._lockHistory.length === 0) return 0;
    const last = this._lockHistory.pop()!;
    let count = 0;
    for (const key of Object.keys(last.locks)) {
      if (this.infoStore.unlockInfoSet(key)) count++;
    }
    return count;
  }

  rollbackAll(): number {
    const count = this.infoStore.unlockAll();
    this._lockHistory = [];
    return count;
  }

  getLockedKeys(): string[] {
    const locked: string[] = [];
    for (const [key, data] of this.infoStore.entries()) {
      if (data.locked) locked.push(key);
    }
    return locked;
  }

  static makeAlwaysAction(numActions: number, actionIndex: number): number[] {
    const strategy = new Array<number>(numActions).fill(0);
    strategy[actionIndex] = 1.0;
    return strategy;
  }

  static makeUniform(numActions: number): number[] {
    return new Array<number>(numActions).fill(1 / numActions);
  }
}
