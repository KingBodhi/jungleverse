/**
 * Information set data structures for CFR.
 *
 * An information set groups all game states that are indistinguishable
 * to a player. Each info set stores cumulative regrets and cumulative
 * strategy weights using Float64Array for V8-optimized numeric operations.
 */

export class InfoSetData {
  readonly numActions: number;
  cumulativeRegret: Float64Array;
  cumulativeStrategy: Float64Array;
  locked = false;
  lockedStrategy: Float64Array | null = null;

  constructor(numActions: number) {
    this.numActions = numActions;
    this.cumulativeRegret = new Float64Array(numActions);
    this.cumulativeStrategy = new Float64Array(numActions);
  }

  /**
   * Compute current strategy via regret matching.
   * If locked, returns the locked strategy.
   * Otherwise, positive regrets are normalized to a probability distribution.
   */
  getStrategy(): Float64Array {
    if (this.locked && this.lockedStrategy) {
      return new Float64Array(this.lockedStrategy);
    }

    const strategy = new Float64Array(this.numActions);
    let total = 0;
    for (let i = 0; i < this.numActions; i++) {
      const p = Math.max(this.cumulativeRegret[i], 0);
      strategy[i] = p;
      total += p;
    }
    if (total > 0) {
      for (let i = 0; i < this.numActions; i++) strategy[i] /= total;
    } else {
      const uniform = 1 / this.numActions;
      for (let i = 0; i < this.numActions; i++) strategy[i] = uniform;
    }
    return strategy;
  }

  /**
   * Get the average strategy (converges to Nash in zero-sum games).
   * If locked, returns the locked strategy.
   */
  getAverageStrategy(): Float64Array {
    if (this.locked && this.lockedStrategy) {
      return new Float64Array(this.lockedStrategy);
    }

    const strategy = new Float64Array(this.numActions);
    let total = 0;
    for (let i = 0; i < this.numActions; i++) {
      total += this.cumulativeStrategy[i];
    }
    if (total > 0) {
      for (let i = 0; i < this.numActions; i++)
        strategy[i] = this.cumulativeStrategy[i] / total;
    } else {
      const uniform = 1 / this.numActions;
      for (let i = 0; i < this.numActions; i++) strategy[i] = uniform;
    }
    return strategy;
  }

  lock(strategy: Float64Array | number[]): void {
    const arr =
      strategy instanceof Float64Array
        ? strategy
        : new Float64Array(strategy);
    if (arr.length !== this.numActions)
      throw new Error(
        `Strategy length ${arr.length} !== numActions ${this.numActions}`,
      );
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i];
    if (Math.abs(sum - 1.0) > 1e-6)
      throw new Error(`Strategy must sum to 1.0, got ${sum}`);
    this.locked = true;
    this.lockedStrategy = new Float64Array(arr);
  }

  unlock(): void {
    this.locked = false;
    this.lockedStrategy = null;
    this.cumulativeRegret.fill(0);
  }
}

export class InfoSetStore {
  private _store = new Map<string, InfoSetData>();

  getOrCreate(key: string, numActions: number): InfoSetData {
    let data = this._store.get(key);
    if (!data) {
      data = new InfoSetData(numActions);
      this._store.set(key, data);
    }
    return data;
  }

  get(key: string): InfoSetData | undefined {
    return this._store.get(key);
  }

  has(key: string): boolean {
    return this._store.has(key);
  }

  get size(): number {
    return this._store.size;
  }

  keys(): string[] {
    return Array.from(this._store.keys());
  }

  entries(): IterableIterator<[string, InfoSetData]> {
    return this._store.entries();
  }

  getAllStrategies(): Map<string, number[]> {
    const result = new Map<string, number[]>();
    for (const [key, data] of this._store) {
      result.set(key, Array.from(data.getAverageStrategy()));
    }
    return result;
  }

  lockInfoSet(key: string, strategy: number[]): boolean {
    const data = this._store.get(key);
    if (!data) return false;
    data.lock(new Float64Array(strategy));
    return true;
  }

  unlockInfoSet(key: string): boolean {
    const data = this._store.get(key);
    if (!data) return false;
    data.unlock();
    return true;
  }

  unlockAll(): number {
    let count = 0;
    for (const data of this._store.values()) {
      if (data.locked) {
        data.unlock();
        count++;
      }
    }
    return count;
  }

  resetUnlockedRegrets(): void {
    for (const data of this._store.values()) {
      if (!data.locked) {
        data.cumulativeRegret.fill(0);
      }
    }
  }
}
