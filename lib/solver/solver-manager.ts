/**
 * Solver manager — orchestrates CFR solves with Prisma persistence.
 *
 * Key differences from Python SolverManager:
 * - No in-memory cache (serverless is stateless)
 * - Synchronous execution within the request
 * - Node locking rebuilds tree + reloads strategies from DB before re-solving
 * - EV comparison also rebuilds tree + loads strategies from DB
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { SolverVariant, SolveStatus as PrismaSolveStatus } from "@prisma/client";
import { CFRPlusSolver } from "./cfr";
import { InfoSetStore } from "./info-set";
import { NodeLocker } from "./node-lock";
import { computeEvComparison } from "./best-response";
import { clearEvalCache } from "./evaluator";
import type { GameNode, ActionNode, ChanceNode, GameVariant } from "./types";
import { KuhnTreeBuilder } from "./variants/kuhn";
import { LeducTreeBuilder } from "./variants/leduc";
import { NLHESubgameBuilder } from "./variants/nlhe-subgame";

/** Iteration limits to fit within Vercel's 60-second timeout. */
const ITERATION_LIMITS: Record<string, number> = {
  kuhn: 50_000,
  leduc: 1_000,
  nlhe_subgame: 10_000,
};

/**
 * Time budget for NLHE solves (ms).
 * Leaves ~10s margin for tree building + DB persistence within the 60s limit.
 */
const NLHE_TIME_BUDGET_MS = 45_000;

function generateSolveId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[(Math.random() * chars.length) | 0];
  }
  return id;
}

function variantToEnum(v: GameVariant): SolverVariant {
  const map: Record<GameVariant, SolverVariant> = {
    kuhn: "KUHN",
    leduc: "LEDUC",
    nlhe_subgame: "NLHE_SUBGAME",
  };
  return map[v];
}

function enumToVariant(v: SolverVariant): GameVariant {
  const map: Record<SolverVariant, GameVariant> = {
    KUHN: "kuhn",
    LEDUC: "leduc",
    NLHE_SUBGAME: "nlhe_subgame",
  };
  return map[v];
}

function statusToEnum(s: string): PrismaSolveStatus {
  return s.toUpperCase() as PrismaSolveStatus;
}

function enumToStatus(s: PrismaSolveStatus): string {
  return s.toLowerCase();
}

function buildTree(
  variant: GameVariant,
  config?: Record<string, unknown> | null,
): { root: GameNode; actionLabels: Map<string, string[]> } {
  let builder;
  if (variant === "kuhn") {
    builder = new KuhnTreeBuilder();
  } else if (variant === "leduc") {
    builder = new LeducTreeBuilder();
  } else if (variant === "nlhe_subgame") {
    builder = new NLHESubgameBuilder(config as never ?? {});
  } else {
    throw new Error(`Unknown variant: ${variant}`);
  }

  const root = builder.buildTree();
  const actionLabels = collectActionLabels(root);
  return { root, actionLabels };
}

function collectActionLabels(root: GameNode): Map<string, string[]> {
  const labels = new Map<string, string[]>();
  const stack: GameNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.type === "action") {
      if (node.infoSetKey && !labels.has(node.infoSetKey)) {
        labels.set(
          node.infoSetKey,
          node.actions.map((a) => a.label),
        );
      }
      for (const child of node.children.values()) stack.push(child);
    } else if (node.type === "chance") {
      for (const { child } of node.outcomes.values()) stack.push(child);
    }
  }
  return labels;
}

export class SolverManager {
  /**
   * Create a new solve, run it synchronously, persist results.
   * Returns the completed SolveResponse data.
   */
  async createAndSolve(body: {
    variant: GameVariant;
    num_iterations: number;
    board?: string;
    range_p0?: string;
    range_p1?: string;
    pot?: number;
    stack?: number;
    bet_sizes?: number[];
  }) {
    const solveId = generateSolveId();
    const variant = body.variant;
    const maxIter = ITERATION_LIMITS[variant] ?? 1_000;
    const numIterations = Math.min(body.num_iterations, maxIter);

    // Build config for NLHE
    let config: Record<string, unknown> | null = null;
    if (variant === "nlhe_subgame") {
      config = {};
      if (body.board) config.board = body.board;
      if (body.range_p0) config.range_p0 = body.range_p0;
      if (body.range_p1) config.range_p1 = body.range_p1;
      if (body.pot != null) config.pot = body.pot;
      if (body.stack != null) config.stack = body.stack;
      if (body.bet_sizes) config.bet_sizes = body.bet_sizes;
    }

    // Create DB record
    const job = await prisma.solverJob.create({
      data: {
        solveId,
        variant: variantToEnum(variant),
        status: "RUNNING",
        numIterations,
        configJson: config === null ? Prisma.JsonNull : (config as Prisma.InputJsonValue),
      },
    });

    try {
      // Clear eval cache from prior solves
      clearEvalCache();

      // Build tree and solve
      const { root, actionLabels } = buildTree(variant, config);
      const infoStore = new InfoSetStore();
      const solver = new CFRPlusSolver(root, infoStore);

      // Use time-budgeted solving for NLHE to avoid Vercel timeout
      let ev: number;
      if (variant === "nlhe_subgame") {
        ev = solver.solveWithTimeBudget(numIterations, NLHE_TIME_BUDGET_MS);
      } else {
        ev = solver.solve(numIterations);
      }
      const exploitability = solver.getExploitability();

      // Persist strategies in batch
      await this._saveStrategies(job.id, infoStore, actionLabels);

      // Update job
      await prisma.solverJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          completedIterations: solver.iteration,
          evP0: ev,
          exploitability,
          numInfoSets: infoStore.size,
        },
      });

      return {
        solve_id: solveId,
        status: "completed" as const,
        variant,
        num_iterations: numIterations,
        progress: 1.0,
        ev_p0: ev,
        exploitability,
        num_info_sets: infoStore.size,
        error: null,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await prisma.solverJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: errorMsg },
      });
      throw err;
    }
  }

  async getSolveStatus(solveId: string) {
    const job = await prisma.solverJob.findUnique({
      where: { solveId },
    });
    if (!job) return null;

    return {
      solve_id: job.solveId,
      status: enumToStatus(job.status),
      variant: enumToVariant(job.variant),
      num_iterations: job.numIterations,
      progress: job.status === "COMPLETED" ? 1.0 : job.completedIterations / job.numIterations,
      ev_p0: job.evP0,
      exploitability: job.exploitability,
      num_info_sets: job.numInfoSets,
      error: job.error,
    };
  }

  async getStrategies(
    solveId: string,
    keys?: string[],
    prefix?: string,
  ) {
    const job = await prisma.solverJob.findUnique({
      where: { solveId },
    });
    if (!job) throw new Error(`Solve ${solveId} not found`);

    let where: Record<string, unknown> = { solverJobId: job.id };
    if (keys && keys.length > 0) {
      where = { ...where, infoSetKey: { in: keys } };
    }
    if (prefix) {
      where = { ...where, infoSetKey: { startsWith: prefix } };
    }

    const rows = await prisma.solverStrategy.findMany({ where });

    return {
      solve_id: solveId,
      strategies: rows.map((r) => ({
        info_set_key: r.infoSetKey,
        actions: r.actionsJson as string[],
        probabilities: r.probabilitiesJson as number[],
        is_locked: r.isLocked,
      })),
      total_info_sets: rows.length,
    };
  }

  async getInfoSetKeys(solveId: string) {
    const job = await prisma.solverJob.findUnique({
      where: { solveId },
    });
    if (!job) throw new Error(`Solve ${solveId} not found`);

    const rows = await prisma.solverStrategy.findMany({
      where: { solverJobId: job.id },
      select: { infoSetKey: true },
    });

    const keys = rows.map((r) => r.infoSetKey);
    return {
      solve_id: solveId,
      info_set_keys: keys,
      total: keys.length,
    };
  }

  async getEVComparison(solveId: string) {
    const job = await prisma.solverJob.findUnique({
      where: { solveId },
    });
    if (!job) throw new Error(`Solve ${solveId} not found`);
    if (job.status !== "COMPLETED")
      throw new Error(`Solve ${solveId} not completed`);

    const variant = enumToVariant(job.variant);
    const config = job.configJson as Record<string, unknown> | null;
    const { root } = buildTree(variant, config);

    // Reload strategies into info store
    const infoStore = await this._loadStrategies(job.id, root);

    const comparison = computeEvComparison(root, infoStore);
    return {
      solve_id: solveId,
      ...comparison,
    };
  }

  async applyNodeLock(body: {
    solve_id: string;
    locks: Record<string, number[]>;
    resolve_iterations: number;
  }) {
    const job = await prisma.solverJob.findUnique({
      where: { solveId: body.solve_id },
    });
    if (!job) throw new Error(`Solve ${body.solve_id} not found`);
    if (job.status !== "COMPLETED")
      throw new Error(`Solve ${body.solve_id} not completed`);

    const variant = enumToVariant(job.variant);
    const config = job.configJson as Record<string, unknown> | null;
    const { root, actionLabels } = buildTree(variant, config);

    // Reload strategies
    const infoStore = await this._loadStrategies(job.id, root);

    // Apply locks
    const locker = new NodeLocker(infoStore);
    const results = locker.applyLocks({ locks: body.locks });

    // Save locks to DB
    for (const [key, strategy] of Object.entries(body.locks)) {
      if (results[key]) {
        await prisma.solverNodeLock.upsert({
          where: {
            solverJobId_infoSetKey: { solverJobId: job.id, infoSetKey: key },
          },
          create: {
            solverJobId: job.id,
            infoSetKey: key,
            strategyJson: strategy,
          },
          update: {
            strategyJson: strategy,
          },
        });
      }
    }

    // Re-solve with locks
    locker.prepareForResolve();
    const maxIter = ITERATION_LIMITS[variant] ?? 1_000;
    const resolveIter = Math.min(body.resolve_iterations, maxIter);

    const solver = new CFRPlusSolver(root, infoStore);
    const ev = solver.solve(resolveIter);
    const exploitability = solver.getExploitability();

    // Update strategies in DB
    await prisma.solverStrategy.deleteMany({ where: { solverJobId: job.id } });
    await this._saveStrategies(job.id, infoStore, actionLabels);

    await prisma.solverJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedIterations: job.completedIterations + solver.iteration,
        evP0: ev,
        exploitability,
        numInfoSets: infoStore.size,
      },
    });

    return {
      solve_id: body.solve_id,
      locks_applied: results,
      status: "completed",
      resolve_iterations: resolveIter,
    };
  }

  async deleteSolve(solveId: string) {
    const job = await prisma.solverJob.findUnique({
      where: { solveId },
    });
    if (!job) return false;

    await prisma.solverJob.delete({ where: { id: job.id } });
    return true;
  }

  private async _saveStrategies(
    jobId: string,
    infoStore: InfoSetStore,
    actionLabels: Map<string, string[]>,
  ) {
    const data: Prisma.SolverStrategyCreateManyInput[] = [];

    for (const [key, info] of infoStore.entries()) {
      const actions = actionLabels.get(key) ?? [];
      const probs = Array.from(info.getAverageStrategy());
      data.push({
        solverJobId: jobId,
        infoSetKey: key,
        actionsJson: actions as Prisma.InputJsonValue,
        probabilitiesJson: probs as Prisma.InputJsonValue,
        isLocked: info.locked,
      });
    }

    // Batch insert — Prisma's createMany
    if (data.length > 0) {
      await prisma.solverStrategy.createMany({ data });
    }
  }

  private async _loadStrategies(
    jobId: string,
    root: GameNode,
  ): Promise<InfoSetStore> {
    const infoStore = new InfoSetStore();
    const actionLabels = collectActionLabels(root);

    // Load all strategies from DB
    const rows = await prisma.solverStrategy.findMany({
      where: { solverJobId: jobId },
    });

    for (const row of rows) {
      const numActions = (row.actionsJson as string[]).length;
      const info = infoStore.getOrCreate(row.infoSetKey, numActions);
      const probs = row.probabilitiesJson as number[];
      // Set cumulative strategy so getAverageStrategy returns these probs
      for (let i = 0; i < probs.length; i++) {
        info.cumulativeStrategy[i] = probs[i];
      }
      if (row.isLocked) {
        info.lock(probs);
      }
    }

    // Load node locks
    const locks = await prisma.solverNodeLock.findMany({
      where: { solverJobId: jobId },
    });
    for (const lock of locks) {
      const strategy = lock.strategyJson as number[];
      infoStore.lockInfoSet(lock.infoSetKey, strategy);
    }

    return infoStore;
  }
}
