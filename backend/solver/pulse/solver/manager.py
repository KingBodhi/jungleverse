"""Solver manager — async job orchestration for CFR solves.

Runs CPU-bound solves in a thread pool executor to keep FastAPI responsive.
Maintains an in-memory cache of solved game trees for instant node locking.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any

from .best_response import compute_ev_comparison
from .cfr import CFRPlusSolver
from .game_tree import GameNode
from .info_set import InfoSetStore
from .models import GameVariant, SolveStatus
from .node_lock import NodeLocker, NodeLockSpec
from .storage import SolverDatabase

logger = logging.getLogger(__name__)


@dataclass
class SolverState:
    """In-memory state for an active solve."""
    solve_id: str
    variant: GameVariant
    root: GameNode
    info_store: InfoSetStore
    solver: CFRPlusSolver
    locker: NodeLocker
    status: SolveStatus = SolveStatus.PENDING
    target_iterations: int = 1000
    completed_iterations: int = 0
    task: asyncio.Task | None = field(default=None, repr=False)
    action_labels: dict[str, list[str]] = field(default_factory=dict)


class SolverManager:
    """Manages solver lifecycle: creation, execution, caching, persistence."""

    def __init__(self, db_path: str = "data/solver.db", max_workers: int = 2):
        self.db = SolverDatabase(db_path)
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._solvers: dict[str, SolverState] = {}
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        await self.db.connect()
        logger.info("SolverManager started")

    async def stop(self) -> None:
        # Cancel running tasks
        for state in self._solvers.values():
            if state.task and not state.task.done():
                state.task.cancel()
        self._executor.shutdown(wait=False)
        await self.db.close()
        logger.info("SolverManager stopped")

    def _build_tree(self, variant: GameVariant,
                    config: dict | None = None) -> tuple[GameNode, dict[str, list[str]]]:
        """Build game tree for the given variant. Returns (root, action_labels)."""
        if variant == GameVariant.KUHN:
            from .variants.kuhn import KuhnTreeBuilder
            builder = KuhnTreeBuilder()
        elif variant == GameVariant.LEDUC:
            from .variants.leduc import LeducTreeBuilder
            builder = LeducTreeBuilder()
        elif variant == GameVariant.NLHE_SUBGAME:
            from .variants.nlhe_subgame import NLHESubgameBuilder
            builder = NLHESubgameBuilder(**(config or {}))
        else:
            raise ValueError(f"Unknown variant: {variant}")

        root = builder.build_tree()

        # Collect action labels from the tree
        action_labels = _collect_action_labels(root)
        return root, action_labels

    async def create_solve(self, variant: GameVariant, num_iterations: int = 1000,
                           config: dict | None = None) -> str:
        """Create and start a new solve. Returns solve_id."""
        solve_id = str(uuid.uuid4())[:8]

        # Build tree (fast for small variants, may need executor for large)
        root, action_labels = self._build_tree(variant, config)

        info_store = InfoSetStore()
        solver = CFRPlusSolver(root, info_store)
        locker = NodeLocker(info_store)

        state = SolverState(
            solve_id=solve_id,
            variant=variant,
            root=root,
            info_store=info_store,
            solver=solver,
            locker=locker,
            target_iterations=num_iterations,
            action_labels=action_labels,
        )

        async with self._lock:
            self._solvers[solve_id] = state

        # Persist
        await self.db.create_solve(solve_id, variant.value, num_iterations, config)

        # Start solve in background
        state.task = asyncio.create_task(
            self._run_solve(state)
        )

        return solve_id

    async def _run_solve(self, state: SolverState) -> None:
        """Run CFR solve in thread pool."""
        state.status = SolveStatus.RUNNING
        await self.db.update_solve_status(state.solve_id, "running")

        try:
            loop = asyncio.get_event_loop()
            ev = await loop.run_in_executor(
                self._executor,
                state.solver.solve,
                state.target_iterations,
            )

            state.status = SolveStatus.COMPLETED
            state.completed_iterations = state.solver.iteration

            # Compute exploitability
            exploitability = await loop.run_in_executor(
                self._executor,
                state.solver.get_exploitability,
            )

            # Save results to DB
            await self.db.update_solve_status(
                state.solve_id, "completed",
                ev_p0=ev,
                exploitability=exploitability,
                num_info_sets=len(state.info_store),
                completed_iterations=state.solver.iteration,
            )

            # Save strategies
            await self._save_strategies(state)

            logger.info(
                "Solve %s completed: EV=%.4f, exploit=%.4f, %d info sets",
                state.solve_id, ev, exploitability, len(state.info_store)
            )

        except asyncio.CancelledError:
            state.status = SolveStatus.CANCELLED
            await self.db.update_solve_status(state.solve_id, "cancelled")
        except Exception as e:
            state.status = SolveStatus.FAILED
            await self.db.update_solve_status(
                state.solve_id, "failed", error=str(e)
            )
            logger.exception("Solve %s failed", state.solve_id)

    async def _save_strategies(self, state: SolverState) -> None:
        """Save all strategies to the database."""
        strategies = {}
        for key, data in state.info_store.items():
            actions = state.action_labels.get(key, [])
            probs = data.get_average_strategy().tolist()
            strategies[key] = {
                "actions": actions,
                "probs": probs,
                "locked": data.locked,
            }
        await self.db.save_strategies(state.solve_id, strategies)

    async def get_solve_status(self, solve_id: str) -> dict | None:
        """Get current solve status."""
        # Check in-memory first
        state = self._solvers.get(solve_id)
        if state:
            return {
                "solve_id": solve_id,
                "status": state.status.value,
                "variant": state.variant.value,
                "num_iterations": state.target_iterations,
                "progress": min(1.0, state.solver.iteration / state.target_iterations),
                "ev_p0": state.solver.get_average_ev() if state.status == SolveStatus.COMPLETED else None,
                "exploitability": None,
                "num_info_sets": len(state.info_store),
            }
        # Fall back to DB
        return await self.db.get_solve(solve_id)

    async def get_strategies(self, solve_id: str,
                             keys: list[str] | None = None,
                             prefix: str | None = None) -> list[dict]:
        """Get strategies for a solve."""
        return await self.db.get_strategies(solve_id, keys=keys, prefix=prefix)

    async def get_info_set_keys(self, solve_id: str) -> list[str]:
        return await self.db.get_info_set_keys(solve_id)

    async def apply_node_locks(self, solve_id: str,
                               locks: dict[str, list[float]],
                               resolve_iterations: int = 1000) -> dict[str, bool]:
        """Apply node locks and re-solve for exploitative strategy."""
        state = self._solvers.get(solve_id)
        if state is None:
            raise ValueError(f"Solve {solve_id} not in memory (must be a recent solve)")
        if state.status != SolveStatus.COMPLETED:
            raise ValueError(f"Solve {solve_id} is not completed (status: {state.status})")

        # Apply locks
        spec = NodeLockSpec(locks=locks)
        results = state.locker.apply_locks(spec)

        # Save locks to DB
        for key, strategy in locks.items():
            if results.get(key):
                await self.db.save_node_lock(solve_id, key, strategy)

        # Re-solve
        state.locker.prepare_for_resolve()
        state.status = SolveStatus.RUNNING
        state.target_iterations += resolve_iterations
        await self.db.update_solve_status(solve_id, "running")

        state.task = asyncio.create_task(
            self._run_solve(state)
        )

        return results

    async def get_ev_comparison(self, solve_id: str) -> dict:
        """Get EV comparison between GTO and best response strategies."""
        state = self._solvers.get(solve_id)
        if state is None:
            raise ValueError(f"Solve {solve_id} not in memory")

        loop = asyncio.get_event_loop()
        comparison = await loop.run_in_executor(
            self._executor,
            compute_ev_comparison,
            state.root,
            state.info_store,
        )
        return comparison

    async def cancel_solve(self, solve_id: str) -> bool:
        """Cancel a running solve."""
        state = self._solvers.get(solve_id)
        if state and state.task and not state.task.done():
            state.task.cancel()
            state.status = SolveStatus.CANCELLED
            await self.db.update_solve_status(solve_id, "cancelled")
            return True

        # Try deleting from DB
        return await self.db.delete_solve(solve_id)


def _collect_action_labels(root: GameNode) -> dict[str, list[str]]:
    """Walk the tree and collect action labels per info set key."""
    from .game_tree import ActionNode, ChanceNode

    labels: dict[str, list[str]] = {}
    stack = [root]
    while stack:
        node = stack.pop()
        if isinstance(node, ActionNode):
            if node.info_set_key and node.info_set_key not in labels:
                labels[node.info_set_key] = [a.label for a in node.actions]
            stack.extend(node.children.values())
        elif isinstance(node, ChanceNode):
            stack.extend(child for _, child in node.outcomes.values())
    return labels
